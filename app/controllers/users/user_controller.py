import mysql.connector
from fastapi import HTTPException, Request
from datetime import datetime
from app.config.db_config import get_db_connection #Connection to BD
from app.models.users.user_model import User #Model
from app.models.services.service_model import Service
from fastapi.encoders import jsonable_encoder #Serializable JSON structures
from fastapi.responses import JSONResponse
from fastapi_mail import FastMail, MessageSchema
from app.config.email_config import mail_config
from werkzeug.security import *


class UserController:

    def update(self, user_id: int, user: User):
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

        
    async def create_service(self, service: Service):   
        try:
            conn = get_db_connection()
            cursor = conn.cursor()


            cursor.execute(
                "INSERT INTO services (client_id,request_date,request_time,service_type,address) VALUES (%s, %s, %s, %s,%s)", 
                (   service.client_id, 
                    service.request_date,
                    service.request_time,
                    service.service_type,
                    service.address,
                )
            )

            conn.commit()

            # ------------------------------------------
            # Obtener correo y nombre del cliente
            # ------------------------------------------
            cursor.execute(
                "SELECT name, email FROM users WHERE id = %s",
                (service.client_id,)
            )
            user = cursor.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            user_name, user_email = user

            # ------------------------------------------
            # Enviar correo de servicio solicitado
            # ------------------------------------------
            fm = FastMail(mail_config)

            html = f"""
            <!DOCTYPE html>
            <html lang="es">
            <body style="margin:0; padding:0; font-family:Arial, sans-serif; background:#f4f4f7;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="padding:40px 0;">
                            <table width="600" cellpadding="0" cellspacing="0"
                                   style="background:white; padding:40px; border-radius:12px;
                                   box-shadow:0 2px 8px rgba(0,0,0,0.1);">

                                <tr>
                                    <td align="center" style="padding-bottom:20px;">
                                        <h1 style="font-size:26px; margin:0; color:#111827;">
                                            ¡Tu solicitud de servicio fue recibida!
                                        </h1>
                                        <p style="color:#6b7280; font-size:15px; margin:10px 0;">
                                            Pronto un técnico revisará tu solicitud.
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        <div style="
                                            background:#f9fafb; padding:20px; border-radius:10px;
                                            border:1px solid #e5e7eb;
                                        ">
                                            <p style="font-size:16px; color:#374151;">
                                                Hola <strong>{user_name}</strong>,
                                            </p>

                                            <p style="color:#4b5563; font-size:15px; line-height:1.6;">
                                                Hemos recibido tu solicitud de servicio con los siguientes detalles:
                                            </p>

                                            <ul style="color:#4b5563; font-size:15px; line-height:1.8;">
                                                <li><strong>Tipo:</strong> {service.service_type}</li>
                                                <li><strong>Fecha:</strong> {service.request_date}</li>
                                                <li><strong>Hora:</strong> {service.request_time}</li>
                                                <li><strong>Dirección:</strong> {service.address}</li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding-top:25px; color:#9ca3af; font-size:13px;">
                                        © 2025 Climatización Total. Servicio solicitado exitosamente.
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """

            message = MessageSchema(
                subject="Confirmación de solicitud de servicio",
                recipients=[user_email],
                body=html,
                subtype="html"
            )

            await fm.send_message(message)

            return JSONResponse(
                status_code=200,
                content={"message": "Servicio solicitado y correo enviado"}
            )

        except mysql.connector.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))

        finally:
            conn.close()

    def get_services(self, client_id: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # Solo selecciona los servicios del cliente cuyo deleted_at sea NULL
            cursor.execute("""
                SELECT id, client_id, request_date, request_time, service_type, address, current_status, deleted_at
                FROM services
                WHERE client_id = %s AND deleted_at IS NULL
            """, (client_id,))

            result = cursor.fetchall()

            payload = []
            content = {}

            for data in result:
                content = {
                    'id': data[0],
                    'client_id': data[1],
                    'request_date': data[2],
                    'request_time': data[3],
                    'service_type': data[4],
                    'address': data[5],
                    'current_status': data[6],
                }
                payload.append(content)
                content = {}

            json_data = jsonable_encoder(payload)

            if result:
                return {"resultado": json_data}
            else:
                raise HTTPException(status_code=404, detail="No hay servicios registrados para este cliente")

        except mysql.connector.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            conn.close()


    def update_service(self, service_id: int, service: Service):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            query = """
                UPDATE services
                SET 
                    request_date = %s,
                    request_time = %s,
                    service_type = %s,
                    address = %s
                WHERE id = %s
            """
            values = (
                service.request_date,
                service.request_time,
                service.service_type,
                service.address,
                service_id
            )

            cursor.execute(query, values)
            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Servicio no encontrado")

            return {"message": "Servicio actualizado correctamente"}
        
        except mysql.connector.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")

        finally:
            if conn:
                conn.close()


    
    def delete_service(self, service_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()


            cursor.execute("SELECT id FROM services WHERE id = %s AND deleted_at IS NULL", (service_id,))
            service = cursor.fetchone()

            if not service:
                raise HTTPException(status_code=404, detail="Servicio no encontrado o ya eliminado")


            deleted_at = datetime.now()
            cursor.execute("UPDATE services SET deleted_at = %s WHERE id = %s", (deleted_at, service_id))
            conn.commit()

            return {"message": "Servicio eliminado correctamente", "deleted_at": deleted_at}

        except mysql.connector.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")

        finally:
            if conn:
                conn.close()


    def get_reports_by_client(self, client_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

      
            cursor.execute("""
                SELECT id 
                FROM services
                WHERE client_id = %s
            """, (client_id,))

            services = cursor.fetchall()

            if not services:
                return []  


            service_ids = [s["id"] for s in services]
            placeholders = ",".join(["%s"] * len(service_ids))


            query = f"""
                SELECT 
                sr.id,
                sr.service_id,
                s.current_status,
                sr.technician_id,
                u.name AS technician_name,
                u.last_name AS technician_last_name,
                sr.service_description,
                sr.service_duration,
                sr.recommendation,
                sr.client_rating,
                sr.client_comments,
                sr.created_at
                FROM service_report sr
                JOIN services s ON s.id = sr.service_id
                JOIN users u 
                ON u.id = s.technician_id
                WHERE sr.service_id IN ({placeholders}) 
                AND sr.deleted_at IS NULL
                ORDER BY sr.id DESC
            """

            cursor.execute(query, service_ids)
            return cursor.fetchall()

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener reportes: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()


    def get_report_by_id(self, report_id: int):
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT 
                client_rating,
                client_comments
            FROM service_report
            WHERE id = %s AND deleted_at IS NULL
        """, (report_id,))

        data = cursor.fetchone()
        print('data', data)
        cursor.close()
        conn.close()

        if not data:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")

        return data
    
    def update_report(self, report_id: int, body: dict):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE service_report
            SET client_rating = %s,
                client_comments = %s
            WHERE id = %s
        """, (
            body.get("client_rating"),
            body.get("client_comments"),
            report_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "Reporte actualizado correctamente"}




    def get_client_stats(self, client_id: int):
        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # 1) Servicios del mes actual
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM services
                WHERE client_id = %s
                AND MONTH(request_date) = MONTH(CURDATE())
                AND YEAR(request_date) = YEAR(CURDATE())
            """, (client_id,))
            servicios_mes = cursor.fetchone()["total"]

            # 2) Completados
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM services
                WHERE client_id = %s AND current_status = 'completed'
            """, (client_id,))
            completados = cursor.fetchone()["total"]

            # 3) Pendientes
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM services
                WHERE client_id = %s AND current_status = 'pending'
            """, (client_id,))
            pendientes = cursor.fetchone()["total"]

            # 4) Promedio por semana
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM services
                WHERE client_id = %s
            """, (client_id,))
            total_servicios = cursor.fetchone()["total"]

            promedio_semana = round(total_servicios / 4, 1)

            # 5) Gráfica de barras por tipo
            cursor.execute("""
                SELECT service_type, COUNT(*) AS cantidad
                FROM services
                WHERE client_id = %s
                GROUP BY service_type
            """, (client_id,))
            barras = cursor.fetchall()

            # 6) Torta por estado
            cursor.execute("""
                SELECT current_status, COUNT(*) AS cantidad
                FROM services
                WHERE client_id = %s
                GROUP BY current_status
            """, (client_id,))
            torta_raw = cursor.fetchall()

            torta = {"pending": 0, "assigned": 0, "completed": 0}
            for row in torta_raw:
                torta[row["current_status"]] = row["cantidad"]

            return {
                "success": True,
                "resumen": [
                    { "titulo": "Servicios este mes", "valor": servicios_mes, "color": "#00d4b3" },
                    { "titulo": "Completados", "valor": completados, "color": "#1ea9ff" },
                    { "titulo": "Pendientes", "valor": pendientes, "color": "#d4d4d4" },
                    { "titulo": "Promedio por semana", "valor": promedio_semana, "color": "#00d4b3" }
                ],
                "barras": barras,
                "torta": torta
            }

        except Exception as e:
            return { "success": False, "error": str(e) }

        finally:
            if cursor: cursor.close()
            if conn: conn.close()
