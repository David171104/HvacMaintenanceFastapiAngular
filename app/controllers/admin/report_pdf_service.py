from __future__ import annotations

import os
import unicodedata
from datetime import date, datetime
from io import BytesIO
from typing import Any

import mysql.connector
from dotenv import load_dotenv
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.config.db_config import get_db_connection


load_dotenv()

_pg_engine: Engine | None = None


def _normalize_pdf_text(value: Any) -> str:
    if value is None:
        return "-"

    text_value = str(value).strip()
    if not text_value:
        return "-"

    normalized = unicodedata.normalize("NFKD", text_value)
    return normalized.encode("latin-1", "ignore").decode("latin-1")


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Fecha invalida: {value}") from exc


def _coerce_int(value: int | str | None) -> int | None:
    if value in (None, "", "all"):
        return None

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Valor numerico invalido: {value}") from exc


def _current_timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def get_pg_engine() -> Engine:
    global _pg_engine

    if _pg_engine is None:
        database_url = os.getenv("PG_URL")
        if not database_url:
            raise HTTPException(
                status_code=500,
                detail="PG_URL no esta configurado para consultar reportes IoT.",
            )

        _pg_engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_size=1,
            max_overflow=0,
            pool_timeout=30,
            future=True,
        )

    return _pg_engine


class AdminPDF(FPDF):
    def __init__(self, title: str, subtitle: str):
        super().__init__(orientation="L", unit="mm", format="A4")
        self.report_title = _normalize_pdf_text(title)
        self.report_subtitle = _normalize_pdf_text(subtitle)
        self.set_auto_page_break(auto=True, margin=15)
        self.alias_nb_pages()

    def header(self) -> None:
        self.set_fill_color(4, 18, 38)
        self.rect(0, 0, 297, 24, "F")

        self.set_xy(10, 7)
        self.set_font("Arial", "B", 16)
        self.set_text_color(91, 255, 229)
        self.cell(0, 6, "ClimaTech", border=0, ln=1)

        self.set_x(10)
        self.set_font("Arial", "", 10)
        self.set_text_color(220, 234, 245)
        self.cell(0, 5, self.report_title, border=0, ln=1)

        self.set_xy(210, 7)
        self.set_font("Arial", "", 9)
        self.cell(77, 5, f"Generado: {_current_timestamp()}", border=0, align="R")

        self.set_y(28)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Arial", "I", 8)
        self.set_text_color(120, 130, 145)
        self.cell(0, 5, self.report_subtitle, border=0, align="L")
        self.cell(0, 5, f"Pagina {self.page_no()}/{{nb}}", border=0, align="R")

    def section_title(self, title: str) -> None:
        self.ln(2)
        self.set_font("Arial", "B", 11)
        self.set_text_color(10, 234, 255)
        self.cell(0, 7, _normalize_pdf_text(title), border=0, ln=1)
        self.set_draw_color(30, 52, 78)
        self.line(self.get_x(), self.get_y(), 287, self.get_y())
        self.ln(2)

    def metadata_line(self, label: str, value: str) -> None:
        self.set_font("Arial", "B", 9)
        self.set_text_color(46, 54, 69)
        self.cell(28, 6, _normalize_pdf_text(label), border=0)
        self.set_font("Arial", "", 9)
        self.set_text_color(73, 85, 104)
        self.cell(0, 6, _normalize_pdf_text(value), border=0, ln=1)

    def metric_card_row(self, metrics: list[tuple[str, str]]) -> None:
        width = 68
        height = 18
        gap = 4
        start_x = self.get_x()
        start_y = self.get_y()

        for index, (label, value) in enumerate(metrics):
            x = start_x + (width + gap) * index
            self.set_xy(x, start_y)
            self.set_fill_color(8, 22, 44)
            self.set_draw_color(21, 42, 69)
            self.rect(x, start_y, width, height, "DF")
            self.set_xy(x + 3, start_y + 3)
            self.set_font("Arial", "", 8)
            self.set_text_color(120, 214, 230)
            self.cell(width - 6, 4, _normalize_pdf_text(label), border=0, ln=1)
            self.set_x(x + 3)
            self.set_font("Arial", "B", 12)
            self.set_text_color(240, 248, 255)
            self.cell(width - 6, 6, _normalize_pdf_text(value), border=0, ln=1)

        self.set_xy(start_x, start_y + height + 3)

    def table(self, headers: list[str], rows: list[list[str]], widths: list[float]) -> None:
        self.set_font("Arial", "B", 8)
        self.set_fill_color(15, 23, 42)
        self.set_text_color(91, 255, 229)

        for header, width in zip(headers, widths):
            self.cell(width, 8, _normalize_pdf_text(header), border=1, align="C", fill=True)
        self.ln()

        self.set_font("Arial", "", 8)
        self.set_text_color(44, 55, 76)
        fill = False

        for row in rows:
            if self.get_y() > 185:
                self.add_page()
                self.set_font("Arial", "B", 8)
                self.set_fill_color(15, 23, 42)
                self.set_text_color(91, 255, 229)
                for header, width in zip(headers, widths):
                    self.cell(width, 8, _normalize_pdf_text(header), border=1, align="C", fill=True)
                self.ln()
                self.set_font("Arial", "", 8)
                self.set_text_color(44, 55, 76)

            self.set_fill_color(248, 250, 252 if fill else 255)
            for value, width in zip(row, widths):
                text_value = _normalize_pdf_text(value)
                clipped = text_value[: max(1, int(width * 1.8))]
                self.cell(width, 8, clipped, border=1, align="L", fill=fill)
            self.ln()
            fill = not fill

    def empty_state(self, message: str) -> None:
        self.set_font("Arial", "", 10)
        self.set_text_color(99, 115, 129)
        self.multi_cell(0, 6, _normalize_pdf_text(message))


class AdminReportService:
    def get_report_options(self) -> dict[str, Any]:
        return {
            "technicians": self._fetch_technicians(),
            "service_types": self._fetch_service_types(),
            "service_statuses": self._fetch_service_statuses(),
            "iot_equipment": self._fetch_iot_equipment(),
        }

    def download_iot_readings_pdf(
        self,
        date_from: str | None,
        date_to: str | None,
        equipment_id: str | None,
        limit: int = 200,
    ) -> StreamingResponse:
        parsed_limit = max(1, min(int(limit), 500))
        filters = {
            "date_from": _parse_iso_date(date_from),
            "date_to": _parse_iso_date(date_to),
            "equipment_id": equipment_id.strip() if equipment_id else None,
            "limit": parsed_limit,
        }
        rows = self._fetch_iot_readings(filters)

        pdf = AdminPDF(
            "Reporte de historial de lecturas IoT",
            "ClimaTech - Historial operativo de lecturas",
        )
        pdf.add_page()
        pdf.section_title("Filtros aplicados")
        pdf.metadata_line("Desde", date_from or "Sin filtro")
        pdf.metadata_line("Hasta", date_to or "Sin filtro")
        pdf.metadata_line("Equipo", filters["equipment_id"] or "Todos")
        pdf.metadata_line("Limite", str(parsed_limit))

        pdf.section_title("Resumen")
        total_rows = len(rows)
        manual_rows = sum(1 for row in rows if row["manual_entry"])
        automatic_rows = total_rows - manual_rows
        pdf.metric_card_row(
            [
                ("Lecturas incluidas", str(total_rows)),
                ("Entradas manuales", str(manual_rows)),
                ("Lecturas IoT", str(automatic_rows)),
                ("Equipo filtrado", filters["equipment_id"] or "Todos"),
            ]
        )

        pdf.section_title("Detalle de lecturas")
        if not rows:
            pdf.empty_state("No se encontraron lecturas para los filtros seleccionados.")
        else:
            table_rows = [
                [
                    str(row["id"]),
                    self._format_datetime(row["fecha_hora"]),
                    row.get("equipment_name") or row.get("equipo_id") or "-",
                    row.get("location") or "-",
                    f'{row["temperatura"]:.2f} C',
                    f'{row["humedad"]:.2f} %',
                    f'{row["corriente"]:.2f} A',
                    "Manual" if row["manual_entry"] else "IoT",
                    row.get("observacion") or "-",
                ]
                for row in rows
            ]
            pdf.table(
                headers=[
                    "ID",
                    "Fecha",
                    "Equipo",
                    "Ubicacion",
                    "Temp",
                    "Humedad",
                    "Corriente",
                    "Origen",
                    "Observacion",
                ],
                rows=table_rows,
                widths=[12, 28, 42, 48, 22, 22, 22, 20, 71],
            )

        return self._as_pdf_response(pdf, "reporte_lecturas_iot.pdf")

    def download_services_pdf(
        self,
        date_from: str | None,
        date_to: str | None,
        technician_id: int | str | None,
        status: str | None,
        service_type: str | None,
    ) -> StreamingResponse:
        filters = {
            "date_from": _parse_iso_date(date_from),
            "date_to": _parse_iso_date(date_to),
            "technician_id": _coerce_int(technician_id),
            "status": None if status in (None, "", "all") else status,
            "service_type": None if service_type in (None, "", "all") else service_type,
        }
        rows = self._fetch_services(filters)
        technicians = {item["id"]: item["name"] for item in self._fetch_technicians()}

        pdf = AdminPDF(
            "Reporte administrativo de servicios",
            "ClimaTech - Seguimiento de mantenimientos y visitas",
        )
        pdf.add_page()
        pdf.section_title("Filtros aplicados")
        pdf.metadata_line("Desde", date_from or "Sin filtro")
        pdf.metadata_line("Hasta", date_to or "Sin filtro")
        pdf.metadata_line(
            "Tecnico",
            technicians.get(filters["technician_id"], "Todos") if filters["technician_id"] else "Todos",
        )
        pdf.metadata_line("Estado", filters["status"] or "Todos")
        pdf.metadata_line("Tipo", filters["service_type"] or "Todos")

        pdf.section_title("Resumen")
        total_rows = len(rows)
        completed_rows = sum(1 for row in rows if row["current_status"] == "completed")
        assigned_rows = sum(1 for row in rows if row["current_status"] == "assigned")
        with_report_rows = sum(1 for row in rows if row.get("service_description"))
        pdf.metric_card_row(
            [
                ("Servicios listados", str(total_rows)),
                ("Asignados", str(assigned_rows)),
                ("Completados", str(completed_rows)),
                ("Con informe tecnico", str(with_report_rows)),
            ]
        )

        pdf.section_title("Detalle de servicios")
        if not rows:
            pdf.empty_state("No se encontraron servicios para los filtros seleccionados.")
        else:
            table_rows = [
                [
                    str(row["service_id"]),
                    self._format_date(row["request_date"]),
                    row.get("request_time") or "-",
                    row.get("client_name") or "-",
                    row.get("technician_name") or "Sin asignar",
                    row.get("service_type") or "-",
                    row.get("current_status") or "-",
                    row.get("service_duration") or "-",
                    row.get("service_description") or row.get("recommendation") or "-",
                ]
                for row in rows
            ]
            pdf.table(
                headers=[
                    "Servicio",
                    "Fecha",
                    "Hora",
                    "Cliente",
                    "Tecnico",
                    "Tipo",
                    "Estado",
                    "Duracion",
                    "Detalle",
                ],
                rows=table_rows,
                widths=[16, 22, 16, 38, 38, 26, 24, 18, 99],
            )

        return self._as_pdf_response(pdf, "reporte_servicios_admin.pdf")

    def download_admin_summary_pdf(
        self,
        date_from: str | None,
        date_to: str | None,
    ) -> StreamingResponse:
        filters = {
            "date_from": _parse_iso_date(date_from),
            "date_to": _parse_iso_date(date_to),
        }
        summary = self._fetch_admin_summary(filters)

        pdf = AdminPDF(
            "Resumen administrativo consolidado",
            "ClimaTech - Indicadores ejecutivos de operacion",
        )
        pdf.add_page()
        pdf.section_title("Periodo analizado")
        pdf.metadata_line("Desde", date_from or "Sin filtro")
        pdf.metadata_line("Hasta", date_to or "Sin filtro")

        pdf.section_title("KPIs generales")
        pdf.metric_card_row(
            [
                ("Usuarios activos", str(summary["users_total"])),
                ("Servicios activos", str(summary["services_total"])),
                ("Equipos IoT activos", str(summary["iot_equipment_total"])),
                ("Equipos cliente", str(summary["client_equipment_total"])),
            ]
        )
        pdf.metric_card_row(
            [
                ("Lecturas en periodo", str(summary["readings_total"])),
                ("Promedio temp", summary["avg_temperature"]),
                ("Promedio humedad", summary["avg_humidity"]),
                ("Promedio corriente", summary["avg_current"]),
            ]
        )

        pdf.section_title("Distribucion de usuarios por rol")
        if summary["roles_distribution"]:
            role_rows = [[item["role"], str(item["total"])] for item in summary["roles_distribution"]]
            pdf.table(headers=["Rol", "Total"], rows=role_rows, widths=[80, 30])
        else:
            pdf.empty_state("No se encontraron usuarios activos.")

        pdf.section_title("Distribucion de servicios por estado")
        if summary["service_status_distribution"]:
            service_rows = [
                [item["status"], str(item["total"])] for item in summary["service_status_distribution"]
            ]
            pdf.table(headers=["Estado", "Total"], rows=service_rows, widths=[80, 30])
        else:
            pdf.empty_state("No se encontraron servicios en el periodo seleccionado.")

        pdf.section_title("Lecturas por equipo IoT")
        if summary["readings_by_equipment"]:
            equipment_rows = [
                [item["equipment_name"], str(item["total"])] for item in summary["readings_by_equipment"]
            ]
            pdf.table(headers=["Equipo", "Lecturas"], rows=equipment_rows, widths=[120, 30])
        else:
            pdf.empty_state("No se encontraron lecturas para el periodo seleccionado.")

        return self._as_pdf_response(pdf, "reporte_resumen_admin.pdf")

    def _fetch_technicians(self) -> list[dict[str, Any]]:
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT id, CONCAT(name, ' ', last_name) AS name
                FROM users
                WHERE role_id = 2 AND deleted_at IS NULL
                ORDER BY name ASC
                """
            )
            return cursor.fetchall()
        except mysql.connector.Error as exc:
            raise HTTPException(status_code=500, detail=f"Error consultando tecnicos: {exc}") from exc
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def _fetch_service_types(self) -> list[str]:
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DISTINCT service_type
                FROM services
                WHERE deleted_at IS NULL AND service_type IS NOT NULL
                ORDER BY service_type ASC
                """
            )
            return [row[0] for row in cursor.fetchall()]
        except mysql.connector.Error as exc:
            raise HTTPException(status_code=500, detail=f"Error consultando tipos de servicio: {exc}") from exc
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def _fetch_service_statuses(self) -> list[str]:
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT DISTINCT current_status
                FROM services
                WHERE deleted_at IS NULL AND current_status IS NOT NULL
                ORDER BY current_status ASC
                """
            )
            return [row[0] for row in cursor.fetchall()]
        except mysql.connector.Error as exc:
            raise HTTPException(status_code=500, detail=f"Error consultando estados: {exc}") from exc
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def _fetch_iot_equipment(self) -> list[dict[str, Any]]:
        try:
            engine = get_pg_engine()
            with engine.connect() as connection:
                rows = connection.execute(
                    text(
                        """
                        SELECT id, name, location
                        FROM iot_equipment_catalog
                        WHERE is_active = TRUE
                        ORDER BY name ASC
                        """
                    )
                ).mappings()
                return [dict(row) for row in rows]
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=500, detail=f"Error consultando equipos IoT: {exc}") from exc

    def _fetch_iot_readings(self, filters: dict[str, Any]) -> list[dict[str, Any]]:
        clauses = []
        params: dict[str, Any] = {"limit": filters["limit"]}

        if filters["equipment_id"]:
            clauses.append("l.equipo_id = :equipment_id")
            params["equipment_id"] = filters["equipment_id"]

        if filters["date_from"]:
            clauses.append("DATE(l.fecha_hora) >= :date_from")
            params["date_from"] = filters["date_from"]

        if filters["date_to"]:
            clauses.append("DATE(l.fecha_hora) <= :date_to")
            params["date_to"] = filters["date_to"]

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

        try:
            engine = get_pg_engine()
            with engine.connect() as connection:
                rows = connection.execute(
                    text(
                        f"""
                        SELECT
                            l.id,
                            l.fecha_hora,
                            l.temperatura,
                            l.humedad,
                            l.corriente,
                            l.equipo_id,
                            l.observacion,
                            l.manual_entry,
                            e.name AS equipment_name,
                            e.location
                        FROM lecturas l
                        LEFT JOIN iot_equipment_catalog e ON e.id = l.equipo_id
                        {where_sql}
                        ORDER BY l.fecha_hora DESC
                        LIMIT :limit
                        """
                    ),
                    params,
                ).mappings()
                return [dict(row) for row in rows]
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=500, detail=f"Error consultando lecturas IoT: {exc}") from exc

    def _fetch_services(self, filters: dict[str, Any]) -> list[dict[str, Any]]:
        conn = None
        cursor = None
        params: list[Any] = []
        where_clauses = ["s.deleted_at IS NULL"]

        if filters["date_from"]:
            where_clauses.append("s.request_date >= %s")
            params.append(filters["date_from"])

        if filters["date_to"]:
            where_clauses.append("s.request_date <= %s")
            params.append(filters["date_to"])

        if filters["technician_id"]:
            where_clauses.append("s.technician_id = %s")
            params.append(filters["technician_id"])

        if filters["status"]:
            where_clauses.append("s.current_status = %s")
            params.append(filters["status"])

        if filters["service_type"]:
            where_clauses.append("s.service_type = %s")
            params.append(filters["service_type"])

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                f"""
                SELECT
                    s.id AS service_id,
                    s.request_date,
                    TIME_FORMAT(s.request_time, '%%H:%%i') AS request_time,
                    s.service_type,
                    s.current_status,
                    s.address,
                    CONCAT(c.name, ' ', c.last_name) AS client_name,
                    CONCAT(t.name, ' ', t.last_name) AS technician_name,
                    sr.service_description,
                    sr.service_duration,
                    sr.recommendation,
                    sr.client_rating,
                    sr.client_comments,
                    sr.created_at AS report_created_at
                FROM services s
                INNER JOIN users c ON c.id = s.client_id
                LEFT JOIN users t ON t.id = s.technician_id
                LEFT JOIN service_report sr ON sr.service_id = s.id AND sr.deleted_at IS NULL
                WHERE {' AND '.join(where_clauses)}
                ORDER BY s.request_date DESC, s.request_time DESC, sr.created_at DESC
                """,
                params,
            )
            return cursor.fetchall()
        except mysql.connector.Error as exc:
            raise HTTPException(status_code=500, detail=f"Error consultando servicios: {exc}") from exc
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def _fetch_admin_summary(self, filters: dict[str, Any]) -> dict[str, Any]:
        mysql_summary = self._fetch_mysql_summary(filters)
        pg_summary = self._fetch_pg_summary(filters)
        return {
            **mysql_summary,
            **pg_summary,
        }

    def _fetch_mysql_summary(self, filters: dict[str, Any]) -> dict[str, Any]:
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute(
                "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND status = 1"
            )
            users_total = cursor.fetchone()["total"]

            cursor.execute(
                "SELECT COUNT(*) AS total FROM services WHERE deleted_at IS NULL AND status = 1"
            )
            services_total = cursor.fetchone()["total"]

            cursor.execute(
                "SELECT COUNT(*) AS total FROM client_equipment WHERE deleted_at IS NULL AND status = 1"
            )
            client_equipment_total = cursor.fetchone()["total"]

            cursor.execute(
                """
                SELECT COALESCE(r.name, 'Sin rol') AS role, COUNT(*) AS total
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id
                WHERE u.deleted_at IS NULL AND u.status = 1
                GROUP BY r.name
                ORDER BY total DESC, role ASC
                """
            )
            roles_distribution = cursor.fetchall()

            service_params: list[Any] = []
            service_where = ["deleted_at IS NULL", "status = 1"]

            if filters["date_from"]:
                service_where.append("request_date >= %s")
                service_params.append(filters["date_from"])

            if filters["date_to"]:
                service_where.append("request_date <= %s")
                service_params.append(filters["date_to"])

            cursor.execute(
                f"""
                SELECT current_status AS status, COUNT(*) AS total
                FROM services
                WHERE {' AND '.join(service_where)}
                GROUP BY current_status
                ORDER BY total DESC, current_status ASC
                """,
                service_params,
            )
            service_status_distribution = cursor.fetchall()

            return {
                "users_total": users_total,
                "services_total": services_total,
                "client_equipment_total": client_equipment_total,
                "roles_distribution": roles_distribution,
                "service_status_distribution": service_status_distribution,
            }
        except mysql.connector.Error as exc:
            raise HTTPException(status_code=500, detail=f"Error calculando resumen MySQL: {exc}") from exc
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def _fetch_pg_summary(self, filters: dict[str, Any]) -> dict[str, Any]:
        clauses = []
        params: dict[str, Any] = {}

        if filters["date_from"]:
            clauses.append("DATE(l.fecha_hora) >= :date_from")
            params["date_from"] = filters["date_from"]

        if filters["date_to"]:
            clauses.append("DATE(l.fecha_hora) <= :date_to")
            params["date_to"] = filters["date_to"]

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

        try:
            engine = get_pg_engine()
            with engine.connect() as connection:
                readings_stats = connection.execute(
                    text(
                        f"""
                        SELECT
                            COUNT(*) AS total,
                            AVG(temperatura) AS avg_temperature,
                            AVG(humedad) AS avg_humidity,
                            AVG(corriente) AS avg_current,
                            SUM(CASE WHEN manual_entry THEN 1 ELSE 0 END) AS manual_total
                        FROM lecturas l
                        {where_sql}
                        """
                    ),
                    params,
                ).mappings().first()

                readings_by_equipment = connection.execute(
                    text(
                        f"""
                        SELECT
                            COALESCE(e.name, l.equipo_id, 'Sin equipo') AS equipment_name,
                            COUNT(*) AS total
                        FROM lecturas l
                        LEFT JOIN iot_equipment_catalog e ON e.id = l.equipo_id
                        {where_sql}
                        GROUP BY COALESCE(e.name, l.equipo_id, 'Sin equipo')
                        ORDER BY total DESC, equipment_name ASC
                        LIMIT 10
                        """
                    ),
                    params,
                ).mappings().all()

                iot_equipment_total = connection.execute(
                    text("SELECT COUNT(*) AS total FROM iot_equipment_catalog WHERE is_active = TRUE")
                ).mappings().first()["total"]

            total = int(readings_stats["total"] or 0)
            manual_total = int(readings_stats["manual_total"] or 0)

            return {
                "iot_equipment_total": iot_equipment_total,
                "readings_total": total,
                "manual_readings_total": manual_total,
                "automatic_readings_total": max(total - manual_total, 0),
                "avg_temperature": self._format_metric(readings_stats["avg_temperature"], "C"),
                "avg_humidity": self._format_metric(readings_stats["avg_humidity"], "%"),
                "avg_current": self._format_metric(readings_stats["avg_current"], "A"),
                "readings_by_equipment": [dict(item) for item in readings_by_equipment],
            }
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=500, detail=f"Error calculando resumen IoT: {exc}") from exc

    def _as_pdf_response(self, pdf: AdminPDF, filename: str) -> StreamingResponse:
        pdf_bytes = bytes(pdf.output(dest="S"))
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    def _format_date(self, value: Any) -> str:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d")
        if isinstance(value, date):
            return value.isoformat()
        return _normalize_pdf_text(value)

    def _format_datetime(self, value: Any) -> str:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M")
        return _normalize_pdf_text(value)

    def _format_metric(self, value: Any, unit: str) -> str:
        if value is None:
            return "Sin datos"
        return f"{float(value):.2f} {unit}"
