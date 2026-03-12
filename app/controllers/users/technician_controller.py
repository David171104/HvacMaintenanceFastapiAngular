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


class PDF(FPDF):
    def __init__(self, service_id):
        super().__init__()
        self.service_id = service_id

    def header(self):
        logo_path = "app/static/5.png"

        if os.path.exists(logo_path):
            self.image(logo_path, x=10, y=8, w=28)

        self.set_font("Arial", "B", 16)
        self.set_text_color(40, 40, 40)
        self.cell(0, 10, f"REPORTE DE SERVICIO #{self.service_id}", ln=True, align="C")

        self.ln(5)
        self.set_draw_color(200, 200, 200)
        self.line(10, 28, 200, 28)
        self.ln(10)



class TechniccianController:
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


    def create_report(self, data: dict):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO service_report(
                    service_id, technician_id, service_description, 
                    service_duration, recommendation, client_rating, 
                    client_comments, created_at, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 'created')
            """, (
                data["service_id"],
                data["technician_id"],
                data["service_description"],
                data["service_duration"],
                data["recommendation"],
                data["client_rating"],
                data["client_comments"]
            ))

            conn.commit()
            return {"message": "Reporte registrado correctamente"}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al registrar reporte: {e}")

        finally:
            if conn:
                cursor.close()
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

