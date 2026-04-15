import mysql.connector
from fastapi import HTTPException, Request
from app.config.db_config import get_db_connection #Connection to BD
from app.models.users.user_model import User #Model
from app.models.login.user_login_model import UserLogin
from fastapi.encoders import jsonable_encoder #Serializable JSON structures
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from io import BytesIO
from fpdf import FPDF
import os
from datetime import datetime
import unicodedata
from datetime import timedelta


def _pdf_text(value):
    if value is None:
        return "-"

    text_value = str(value).strip()
    if not text_value:
        return "-"

    normalized = unicodedata.normalize("NFKD", text_value)
    return normalized.encode("latin-1", "ignore").decode("latin-1")


def _format_time_value(value):
    if value is None:
        return "-"

    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")

    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"

    return _pdf_text(value)


class PDF(FPDF):
    def __init__(self, service_id):
        super().__init__()
        self.service_id = service_id
        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        logo_path = "app/static/logo.jpeg"

        self.set_fill_color(9, 18, 35)
        self.rect(0, 0, 210, 30, "F")

        if os.path.exists(logo_path):
            self.image(logo_path, x=12, y=7, w=20)

        self.set_xy(38, 8)
        self.set_font("Arial", "B", 17)
        self.set_text_color(103, 232, 249)
        self.cell(0, 7, "ClimaTech", ln=True)

        self.set_x(38)
        self.set_font("Arial", "", 10)
        self.set_text_color(226, 232, 240)
        self.cell(0, 6, _pdf_text(f"Reporte tecnico de servicio #{self.service_id}"), ln=True)
        self.ln(10)

    def footer(self):
        self.set_y(-12)
        self.set_font("Arial", "I", 8)
        self.set_text_color(120, 130, 145)
        self.cell(0, 5, _pdf_text(f"Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}"), 0, 0, "L")
        self.cell(0, 5, _pdf_text(f"Pagina {self.page_no()}"), 0, 0, "R")

    def section_title(self, title):
        self.ln(3)
        self.set_font("Arial", "B", 12)
        self.set_text_color(15, 23, 42)
        self.set_fill_color(224, 242, 254)
        self.cell(0, 9, _pdf_text(title), 0, 1, "L", True)
        self.ln(2)

    def detail_row(self, label, value, width=95):
        self.set_font("Arial", "B", 10)
        self.set_text_color(51, 65, 85)
        self.cell(35, 8, _pdf_text(label), 0, 0)
        self.set_font("Arial", "", 10)
        self.set_text_color(15, 23, 42)
        self.multi_cell(width, 8, _pdf_text(value), border=0, align="L")

    def metric_box(self, x, y, w, h, title, value):
        self.set_fill_color(15, 23, 42)
        self.set_draw_color(30, 41, 59)
        self.rounded_rect(x, y, w, h, 4, style="DF")
        self.set_xy(x + 4, y + 4)
        self.set_font("Arial", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(w - 8, 4, _pdf_text(title), 0, 1)
        self.set_x(x + 4)
        self.set_font("Arial", "B", 13)
        self.set_text_color(255, 255, 255)
        self.cell(w - 8, 7, _pdf_text(value), 0, 1)

    def rounded_rect(self, x, y, w, h, r, style=""):
        self.rounded_rect_path(x, y, w, h, r)
        op = {"F": "f", "FD": "B", "DF": "B"}.get(style, "S")
        self._out(op)

    def rounded_rect_path(self, x, y, w, h, r):
        k = self.k
        hp = self.h
        my_arc = 4 / 3 * (2**0.5 - 1) * r
        self._out(f"{(x + r) * k:.2f} {(hp - y) * k:.2f} m")
        self._out(f"{(x + w - r) * k:.2f} {(hp - y) * k:.2f} l")
        self._arc(x + w - r + my_arc, y, x + w, y + r - my_arc, x + w, y + r)
        self._out(f"{(x + w) * k:.2f} {(hp - (y + h - r)) * k:.2f} l")
        self._arc(x + w, y + h - r + my_arc, x + w - r + my_arc, y + h, x + w - r, y + h)
        self._out(f"{(x + r) * k:.2f} {(hp - (y + h)) * k:.2f} l")
        self._arc(x + r - my_arc, y + h, x, y + h - r + my_arc, x, y + h - r)
        self._out(f"{x * k:.2f} {(hp - (y + r)) * k:.2f} l")
        self._arc(x, y + r - my_arc, x + r - my_arc, y, x + r, y)

    def _arc(self, x1, y1, x2, y2, x3, y3):
        h = self.h
        self._out(
            f"{x1 * self.k:.2f} {(h - y1) * self.k:.2f} "
            f"{x2 * self.k:.2f} {(h - y2) * self.k:.2f} "
            f"{x3 * self.k:.2f} {(h - y3) * self.k:.2f} c"
        )



class TechniccianController:
    REPORT_TECHNICAL_FIELDS = (
        "service_description",
        "service_duration",
        "recommendation",
        "temperature_before",
        "temperature_after",
        "voltage_before",
        "voltage_after",
        "humidity_before",
        "humidity_after",
    )

    def update_user(self, user_id: int, user: User):
        try:
            
            name = user.name
            last_name = user.last_name
            email = user.email
            document_number = user.document_number
            age = user.age

            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE users
                SET name = %s,
                    last_name = %s,
                    email = %s,
                    document_number = %s,
                    age = %s
                WHERE id = %s
            """, (name, last_name, email, document_number, age, user_id))

            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            return {"message": "Usuario actualizado correctamente"}

        except mysql.connector.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))

        finally:
            conn.close()


    def get_services_by_technician(self, technician_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            query = """
                SELECT 
                    services.id,
                    services.client_id,
                    services.technician_id,
                    services.request_date,
                    services.request_time,
                    services.service_type,
                    services.address,
                    services.current_status,
                    CONCAT(users.name, ' ', users.last_name) AS client_name,
                    CONCAT(users_technician.name, ' ', users_technician.last_name) AS technician_name
                FROM services
                LEFT JOIN users ON services.client_id = users.id
                LEFT JOIN users AS users_technician ON services.technician_id = users_technician.id
                WHERE services.technician_id = %s
                ORDER BY services.request_date DESC, services.request_time DESC;
            """
            cursor.execute(query, (technician_id,))
            services = cursor.fetchall()
            
            return {"resultado": services}

        except Exception as e:
            print("Error al obtener los servicios del técnico:", e)
            raise HTTPException(status_code=500, detail="Error al obtener los servicios del técnico")
        finally:
            if conn:
                conn.close()


    def complete_service(self, service_id: int):
        conn = None
        print('entro', service_id)
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE services
                SET current_status = 'completed'
                WHERE id = %s AND deleted_at IS NULL
            """, (service_id,))
            
            conn.commit()

            return {"resultado": "Servicio completado correctamente"}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al completar servicio: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()


    def create_report(self, data: dict, current_user: dict):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            technician_id = current_user.get("id")
            if not technician_id:
                raise HTTPException(status_code=401, detail="No se pudo identificar al tecnico autenticado")

            if current_user.get("role_id") != 2:
                raise HTTPException(status_code=403, detail="Solo los tecnicos pueden crear reportes")

            service_id = data.get("service_id")
            if not service_id:
                raise HTTPException(status_code=400, detail="service_id es obligatorio")

            cursor.execute("""
                SELECT id, technician_id, deleted_at
                FROM services
                WHERE id = %s
            """, (service_id,))
            service = cursor.fetchone()

            if not service or service.get("deleted_at") is not None:
                raise HTTPException(status_code=404, detail="Servicio no encontrado")

            if int(service["technician_id"] or 0) != int(technician_id):
                raise HTTPException(status_code=403, detail="No autorizado para crear reportes de este servicio")

            cursor.execute("""
                SELECT id
                FROM service_report
                WHERE service_id = %s AND deleted_at IS NULL
                LIMIT 1
            """, (service_id,))
            existing_report = cursor.fetchone()

            if existing_report:
                raise HTTPException(status_code=409, detail="Ya existe un reporte para este servicio")

            cursor.execute("""
                INSERT INTO service_report(
                    service_id, technician_id, service_description, 
                    service_duration, recommendation, temperature_before,
                    temperature_after, voltage_before, voltage_after,
                    humidity_before, humidity_after, client_rating, 
                    client_comments, created_at, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'created')
            """, (
                service_id,
                technician_id,
                data.get("service_description"),
                data.get("service_duration"),
                data.get("recommendation"),
                data.get("temperature_before"),
                data.get("temperature_after"),
                data.get("voltage_before"),
                data.get("voltage_after"),
                data.get("humidity_before"),
                data.get("humidity_after"),
                data.get("client_rating"),
                data.get("client_comments")
            ))

            conn.commit()
            return {"message": "Reporte registrado correctamente"}

        except HTTPException:
            if conn:
                conn.rollback()
            raise
        except mysql.connector.Error as e:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error al registrar reporte: {e}")

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()


    def get_reports_by_technician(self, technician_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            query = """
                SELECT
                    sr.id,
                    sr.service_id,
                    s.current_status,
                    sr.technician_id,
                    
                    -- Cliente dueño del servicio
                    u.name AS client_name,
                    u.last_name AS client_last_name,

                    sr.service_description,
                    sr.service_duration,
                    sr.recommendation,
                    sr.temperature_before,
                    sr.temperature_after,
                    sr.voltage_before,
                    sr.voltage_after,
                    sr.humidity_before,
                    sr.humidity_after,
                    sr.client_rating,
                    sr.client_comments,
                    sr.created_at

                FROM service_report sr
                INNER JOIN services s ON s.id = sr.service_id
                INNER JOIN users u ON u.id = s.client_id
                WHERE sr.technician_id = %s
                AND sr.deleted_at IS NULL
                ORDER BY sr.id DESC
            """

            cursor.execute(query, (technician_id,))
            return cursor.fetchall()

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener reportes: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()



    def generate_pdf(self, report_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # ==============================
            # 1. Obtener datos del reporte
            # ==============================
            cursor.execute("""
                SELECT id, service_id, service_description, service_duration,
                    recommendation, client_rating, client_comments, created_at
                FROM service_report
                WHERE id = %s
            """, (report_id,))
            report = cursor.fetchone()

            if not report:
                raise HTTPException(status_code=404, detail="Reporte no encontrado")

            service_id = report["service_id"]

            # ==============================
            # 2. Buscar cliente en services
            # ==============================
            cursor.execute("""
                SELECT client_id
                FROM services
                WHERE id = %s
            """, (service_id,))
            service = cursor.fetchone()

            if not service:
                raise HTTPException(status_code=404, detail="Servicio no encontrado")

            client_id = service["client_id"]

            # ==============================
            # 3. Buscar nombre del cliente
            # ==============================
            cursor.execute("""
                SELECT CONCAT(name, ' ', last_name) AS client_name
                FROM users
                WHERE id = %s
            """, (client_id,))
            client = cursor.fetchone()

            client_name = client["client_name"] if client else "No registrado"

            # ==============================
            # 4. Crear PDF profesional
            # ==============================
            pdf = PDF(service_id=service_id)
            pdf.add_page()

            # Encabezados de tabla (columnas)
            pdf.set_font("Arial", "B", 11)
            pdf.set_fill_color(35, 55, 75)
            pdf.set_text_color(255, 255, 255)

            headers = [
                "ID", "Cliente", "Descripción", "Duración",
                "Recomendación", "Calificación", "Comentarios", "Fecha"
            ]

            col_widths = [8, 28, 30, 20, 31, 25, 30, 20]  


            for width, title in zip(col_widths, headers):
                pdf.cell(width, 10, title, 1, 0, "C", True)

            pdf.ln()

            # ==============================
            # Fila con valores
            # ==============================
            pdf.set_font("Arial", "", 10)
            pdf.set_text_color(30, 30, 30)
            fecha_formateada = report["created_at"].strftime("%d/%m/%Y")

            values = [
                str(service_id),
                client_name,
                report["service_description"],
                report["service_duration"],
                report["recommendation"],
                str(report["client_rating"]),
                report["client_comments"],
                fecha_formateada
            ]

            fill = False
            pdf.set_fill_color(245, 245, 245)

            for width, value in zip(col_widths, values):
                pdf.cell(width, 10, str(value), 1, 0, "L", fill)

            pdf.ln()

            # Footer
            pdf.ln(10)
            pdf.set_font("Arial", "I", 10)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 10, f"Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}", 0, 0, "R")

            pdf_bytes = bytes(pdf.output(dest="S"))

            return StreamingResponse(
                BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=reporte_{report_id}.pdf"}
            )

        finally:
            if conn:
                conn.close()


    def generate_pdf(self, report_id: int):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT 
                    sr.id,
                    sr.service_id,
                    sr.technician_id,
                    sr.service_description,
                    sr.service_duration,
                    sr.recommendation,
                    sr.temperature_before,
                    sr.temperature_after,
                    sr.voltage_before,
                    sr.voltage_after,
                    sr.humidity_before,
                    sr.humidity_after,
                    sr.client_rating,
                    sr.client_comments,
                    sr.created_at,
                    s.client_id,
                    s.request_date,
                    s.request_time,
                    s.service_type,
                    s.address,
                    s.current_status,
                    CONCAT(client.name, ' ', client.last_name) AS client_name,
                    CONCAT(tech.name, ' ', tech.last_name) AS technician_name
                FROM service_report sr
                INNER JOIN services s ON s.id = sr.service_id
                LEFT JOIN users client ON client.id = s.client_id
                LEFT JOIN users tech ON tech.id = sr.technician_id
                WHERE sr.id = %s
            """, (report_id,))
            report = cursor.fetchone()

            if not report:
                raise HTTPException(status_code=404, detail="Reporte no encontrado")

            pdf = PDF(service_id=report["service_id"])
            pdf.add_page()

            fecha_reporte = report["created_at"].strftime("%Y-%m-%d")
            fecha_visita = report["request_date"].strftime("%Y-%m-%d") if report.get("request_date") else "-"

            raw_request_time = report.get("request_time")
            if hasattr(raw_request_time, "strftime"):
                hora_visita = raw_request_time.strftime("%H:%M")
            elif hasattr(raw_request_time, "total_seconds"):
                total_seconds = int(raw_request_time.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                hora_visita = f"{hours:02d}:{minutes:02d}"
            elif raw_request_time:
                hora_visita = str(raw_request_time)[:5]
            else:
                hora_visita = "-"

            pdf.section_title("Resumen ejecutivo")
            start_x = pdf.get_x()
            start_y = pdf.get_y()
            metric_width = 42
            metric_gap = 4
            metrics = [
                ("Servicio", f"#{report['service_id']}"),
                ("Estado", report.get("current_status") or "-"),
                ("Duracion", f"{report.get('service_duration') or '-'} horas"),
                ("Fecha reporte", fecha_reporte),
            ]

            for index, (title, value) in enumerate(metrics):
                pdf.metric_box(
                    start_x + index * (metric_width + metric_gap),
                    start_y,
                    metric_width,
                    18,
                    title,
                    value,
                )

            pdf.set_y(start_y + 24)

            pdf.section_title("Datos del servicio")
            pdf.detail_row("Cliente", report.get("client_name") or "No registrado")
            pdf.detail_row("Tecnico", report.get("technician_name") or "No registrado")
            pdf.detail_row("Tipo", report.get("service_type") or "-")
            pdf.detail_row("Fecha visita", fecha_visita)
            pdf.detail_row("Hora visita", hora_visita)
            pdf.detail_row("Direccion", report.get("address") or "-")

            pdf.section_title("Descripcion tecnica")
            pdf.detail_row("Descripcion", report.get("service_description") or "Sin descripcion registrada")
            pdf.detail_row("Recomendacion", report.get("recommendation") or "Sin recomendacion registrada")

            pdf.section_title("Mediciones comparativas")
            pdf.set_font("Arial", "B", 10)
            pdf.set_fill_color(15, 23, 42)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(60, 10, "Variable", 1, 0, "C", True)
            pdf.cell(60, 10, "Antes", 1, 0, "C", True)
            pdf.cell(60, 10, "Despues", 1, 1, "C", True)

            pdf.set_font("Arial", "", 10)
            pdf.set_text_color(15, 23, 42)
            pdf.set_fill_color(248, 250, 252)

            measurement_rows = [
                ("Temperatura", f"{report.get('temperature_before') or '-'} C", f"{report.get('temperature_after') or '-'} C"),
                ("Voltaje", f"{report.get('voltage_before') or '-'} V", f"{report.get('voltage_after') or '-'} V"),
                ("Humedad", f"{report.get('humidity_before') or '-'} %", f"{report.get('humidity_after') or '-'} %"),
            ]

            fill = False
            for label, before, after in measurement_rows:
                pdf.cell(60, 10, _pdf_text(label), 1, 0, "L", fill)
                pdf.cell(60, 10, _pdf_text(before), 1, 0, "C", fill)
                pdf.cell(60, 10, _pdf_text(after), 1, 1, "C", fill)
                fill = not fill

            pdf.section_title("Cierre del reporte")
            rating_value = report.get("client_rating")
            pdf.detail_row("Calificacion cliente", rating_value if rating_value is not None else "Sin calificacion")
            pdf.detail_row("Comentarios cliente", report.get("client_comments") or "Sin comentarios")

            pdf_bytes = bytes(pdf.output(dest="S"))

            return StreamingResponse(
                BytesIO(pdf_bytes),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=reporte_{report_id}.pdf"}
            )

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()


    def get_stats(self, technician_id: int):
        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

       
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM services
                WHERE technician_id = %s
                AND current_status = 'completed'
            """, (technician_id,))
            completed = cursor.fetchone()["total"]

           
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM services
                WHERE technician_id = %s
                AND current_status = 'assigned'
            """, (technician_id,))
            pending = cursor.fetchone()["total"]

            cursor.execute("""
                SELECT COUNT(DISTINCT client_id) AS total
                FROM services
                WHERE technician_id = %s
                AND current_status = 'completed'
            """, (technician_id,))
            clients = cursor.fetchone()["total"]

            
            cursor.execute("""
                SELECT AVG(client_rating) AS avg_rating
                FROM service_report
                WHERE service_id IN (
                    SELECT id FROM services WHERE technician_id = %s
                )
            """, (technician_id,))
            avg_rating = cursor.fetchone()["avg_rating"]
            avg_rating = round(float(avg_rating), 1) if avg_rating else 0

            
            return {
                "success": True,
                "completed": completed,
                "pending": pending,
                "clients": clients,
                "avg_rating": avg_rating
            }

        except Exception as e:
            print(f" Error en get_stats: {e}")

            return {
                "success": False,
                "message": "Ocurrió un error al obtener las estadísticas.",
                "error": str(e)
            }

        finally:
            if cursor: cursor.close()
            if conn: conn.close()


    def get_daily_services(self, technician_id: int):
        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT 
                    s.id,
                    u.name AS client_name,
                    u.last_name AS client_last_name,
                    s.current_status AS current_status,
                    DATE_FORMAT(s.request_time, '%H:%i') AS request_time
                FROM services s
                INNER JOIN users u ON u.id = s.client_id
                WHERE s.technician_id = %s
                AND s.request_date = CURDATE()
                ORDER BY s.request_time ASC
            """, (technician_id,))

            services = cursor.fetchall()

            return {
                "success": True,
                "services": services
            }

        except Exception as e:
            print(f" Error en get_daily_services: {e}")
            return {
                "success": False,
                "message": "Error obteniendo los servicios del día.",
                "error": str(e)
            }

        finally:
            if cursor: cursor.close()
            if conn: conn.close()


    def get_monthly_stats(self, technician_id: int):
        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT 
                    MONTH(request_date) AS mes,
                    COUNT(*) AS total
                FROM services
                WHERE technician_id = %s
                GROUP BY MONTH(request_date)
                ORDER BY mes
            """, (technician_id,))

            rows = cursor.fetchall()

           
            monthly = [0] * 12

            for r in rows:
                index = int(r["mes"]) - 1
                monthly[index] = r["total"]

            return {
                "success": True,
                "data": monthly
            }

        except Exception as e:
            print(f" Error en get_monthly_stats: {e}")
            return {
                "success": False,
                "message": "Error obteniendo estadísticas mensuales.",
                "error": str(e)
            }

        finally:
            if cursor: cursor.close()
            if conn: conn.close()

