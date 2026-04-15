from fastapi import APIRouter, Depends, Request
from typing import Optional, List
from pydantic import BaseModel
from typing import Optional
from app.controllers.admin.admin_controller import *
from app.models.users.user_model import User
from app.models.login.user_login_model import UserLogin
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.auth import verify_token 

from app.services.maintenance_email_service import NotificationService

router = APIRouter()

adminController = AdminController()
notification_service = NotificationService()


#FUNCTIONAL ROUTES
@router.get("/users/get_user/{user_id}",response_model=User)
async def get_user(user_id: int,  token_data: dict = Depends(verify_token)):
    response = adminController.get_user(user_id)
    return response

@router.get("/users/get_users/")
async def get_users():
    response = adminController.get_all_users()
    return response

@router.post("/users/admin-create_user")
async def create_user(user: User):
    return adminController.create_user(user)

@router.put("/users/update_user/{user_id}") 
async def update_user(user_id: int, user: User):
    response = adminController.update_user(user_id, user)
    return response

@router.delete("/users/delete/{user_id}")
async def delete_user(user_id: int):
    return adminController.delete_user(user_id)
 
@router.post("/admin/notifications/trigger-maintenances")
async def trigger_maintenances(token_data: dict = Depends(verify_token)):
    role_id = token_data.get("role_id")
    role_name = str(token_data.get("role_name", "")).strip().lower()

    if role_id != 1 and role_name != "administrador":
        raise HTTPException(status_code=403, detail="No autorizado. Se requiere rol de administrador.")

    await notification_service.process_pending_maintenances()
    return {"message": "Correos de mantenimiento procesados y enviados exitosamente"}

@router.get("/users/services/all")
async def get_users():
    response = adminController.get_all_services()
    return response


@router.get("/users/technicians/all")
def get_all_technicians():
    response = adminController.get_all_technicians()
    return response


@router.put("/users/services/{service_id}/assign")
async def assign_technician(service_id: int, request: Request):
    try:
        data = await request.json()
        technician_id = data.get("technician_id")
        if not technician_id:
            raise HTTPException(status_code=400, detail="technician_id es obligatorio")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Verificar técnico
        cursor.execute("SELECT name, email FROM users WHERE id = %s", (technician_id,))
        tech = cursor.fetchone()
        if not tech:
            raise HTTPException(status_code=404, detail="Técnico no encontrado")
        tech_name, tech_email = tech

        # Verificar servicio
        cursor.execute("SELECT id, client_id, request_date, request_time, service_type, address FROM services WHERE id = %s", (service_id,))
        service = cursor.fetchone()
        if not service:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")

        # Actualizar servicio
        cursor.execute("""
            UPDATE services
            SET technician_id = %s, current_status = 'assigned', updated_at = NOW()
            WHERE id = %s
        """, (technician_id, service_id))
        conn.commit()

        # Enviar correo
        from fastapi_mail import FastMail, MessageSchema
        from app.config.email_config import mail_config

        fm = FastMail(mail_config)
        html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Nuevo servicio asignado</title>
        </head>
        <body style="margin:0; padding:0; font-family: Arial, sans-serif; background:#f4f4f7;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table width="600" cellpadding="0" cellspacing="0" 
                            style="background:white; border-radius:12px; padding:40px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                    <h1 style="margin:0; font-size:28px; color:#111827;">
                                        Nuevo servicio asignado
                                    </h1>
                                    <p style="margin:10px 0; color:#6b7280; font-size:16px;">
                                        Se te ha asignado un servicio para atender.
                                    </p>
                                </td>
                            </tr>

                            <!-- Card -->
                            <tr>
                                <td style="padding: 20px 0;">
                                    <div style="
                                        background:#f9fafb;
                                        border-radius:10px;
                                        padding:20px;
                                        border:1px solid #e5e7eb;
                                    ">
                                        <p style="font-size:16px; color:#374151; margin:0 0 10px 0;">
                                            Hola <strong>{tech_name}</strong>,
                                        </p>
                                        <p style="color:#4b5563; font-size:15px; line-height:1.6;">
                                            Se te ha asignado un nuevo servicio con los siguientes detalles:
                                        </p>
                                        <ul style="color:#4b5563; font-size:15px; line-height:1.8; padding-left:20px;">
                                            <li><strong>ID Servicio:</strong> {service[0]}</li>
                                            <li><strong>Cliente ID:</strong> {service[1]}</li>
                                            <li><strong>Tipo:</strong> {service[4]}</li>
                                            <li><strong>Fecha:</strong> {service[2]}</li>
                                            <li><strong>Hora:</strong> {service[3]}</li>
                                            <li><strong>Dirección:</strong> {service[5]}</li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td align="center" style="padding-top: 20px; color:#9ca3af; font-size:13px;">
                                    © 2025 Climatización Total. Todos los derechos reservados.
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
            subject="Nuevo servicio asignado",
            recipients=[tech_email],
            body=html,
            subtype="html"
        )

        await fm.send_message(message)

        return {"message": "Técnico asignado y correo enviado correctamente."}

    except Exception as e:
        print("ERROR en assign_technician:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if 'conn' in locals():
            conn.close()
    
@router.get("/api/kpis")
async def obtener_kpis(token_data: dict = Depends(verify_token)):
    response = adminController.obtener_kpis()
    return response

# @router.get("/admin/reports")
# async def get_all_reports_route(token_data: dict = Depends(verify_token)):

#     response = adminController.get_all_reports()
#     return {"resultado": response}

@router.get("/admin/reports")
async def get_reports(
    technician_id: Optional[int] = None,
    status: str = "all",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    response = adminController.get_all_reports(technician_id, status, date_from, date_to)
    return response


@router.get("/admin/reports/options")
async def get_report_options():
    return adminController.get_report_options()


@router.get("/admin/reports/lecturas/pdf")
async def download_iot_report_pdf(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    equipment_id: Optional[str] = None,
    limit: int = 200,
):
    return adminController.generate_iot_readings_report_pdf(date_from, date_to, equipment_id, limit)


@router.get("/admin/reports/services/pdf")
async def download_services_report_pdf(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    technician_id: Optional[int] = None,
    status: Optional[str] = None,
    service_type: Optional[str] = None,
):
    return adminController.generate_services_report_pdf(
        date_from,
        date_to,
        technician_id,
        status,
        service_type,
    )


@router.get("/admin/reports/resumen/pdf")
async def download_admin_summary_report_pdf(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    return adminController.generate_admin_summary_report_pdf(date_from, date_to)
 
@router.post("/users/verify_password/{user_id}")
async def verify_password(user_id: int, request: dict, token_data: dict = Depends(verify_token)):
    return adminController.verify_password(user_id, request)

@router.put("/users/change_password/{user_id}")
async def change_password(user_id: int, request: dict, token_data: dict = Depends(verify_token)):
    return adminController.change_password(user_id, request)

@router.put("/users/update-profile/{user_id}")
async def update_profile(user_id: int, request: dict, token_data: dict = Depends(verify_token)):
    return adminController.update_profile(user_id, request)


class UserSelectResponse(BaseModel):
    id: int
    name: str
    last_name: str
    email: str

class UserSelectResponseWrapper(BaseModel):
    resultado: List[UserSelectResponse]

@router.get('/users/select/role/{role_name}', response_model=UserSelectResponseWrapper)
async def get_users_by_role_for_select(role_name: str, token_data: dict = Depends(verify_token)):
    response = adminController.get_users_by_role_name(role_name)
    return response


class ManualServiceCreate(BaseModel):
    client_id: int
    technician_id: Optional[int] = None
    request_date: str
    request_time: str
    service_type: str
    address: str

@router.post('/users/services/manual_create')
async def create_service_manual(service: ManualServiceCreate, token_data: dict = Depends(verify_token)):
    response = adminController.create_service_manual(service)
    return response


# ── Centro de Control de Mantenimiento ───────────────────────────────────────

@router.get("/admin/maintenance/status-list")
async def get_maintenance_status_list(token_data: dict = Depends(verify_token)):
    """
    Retorna TODOS los service_report con dos campos calculados en Python:
      - can_notify (bool): True si no recibio notificacion en los ultimos 30 dias.
      - status_badge (str): 'Elegible' | 'Notificado' | 'Al dia'
    """
    from datetime import datetime, timezone

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Traer todos los reportes con informacion de cliente, tecnico y ultima notificacion
        cursor.execute("""
            SELECT
                sr.id               AS report_id,
                sr.service_id,
                sr.updated_at       AS last_service_date,

                u_client.id         AS client_id,
                u_client.name       AS client_name,
                u_client.last_name  AS client_last_name,
                u_client.email      AS client_email,

                u_tech.id           AS technician_id,
                u_tech.name         AS technician_name,

                s.service_type,
                s.address,

                -- Fecha de la notificacion mas reciente (NULL si nunca se notifico)
                (
                    SELECT MAX(sent_at)
                    FROM maintenance_notifications
                    WHERE service_report_id = sr.id
                      AND deleted_at IS NULL
                ) AS last_notification_date

            FROM service_report sr
            JOIN services s        ON s.id       = sr.service_id
            JOIN users u_client    ON u_client.id = s.client_id
            LEFT JOIN users u_tech ON u_tech.id   = s.technician_id

            WHERE sr.deleted_at IS NULL
            ORDER BY sr.updated_at DESC
        """)

        rows = cursor.fetchall()
        now = datetime.now(timezone.utc)
        SPAM_DAYS = 30  # ventana anti-spam

        result = []
        for row in rows:
            last_service_date = row.get("last_service_date")
            last_notif        = row.get("last_notification_date")

            # Serializar fechas para JSON
            row["last_service_date"]       = str(last_service_date) if last_service_date else None
            row["last_notification_date"]  = str(last_notif)         if last_notif         else None

            # │ Calcular can_notify y status_badge
            if last_notif:
                # Normalizar la zona horaria de last_notif
                if hasattr(last_notif, "tzinfo") and last_notif.tzinfo is None:
                    from datetime import timezone
                    last_notif = last_notif.replace(tzinfo=timezone.utc)

                days_since_notif = (now - last_notif).days
                if days_since_notif < SPAM_DAYS:
                    row["can_notify"]   = False
                    row["status_badge"] = "Notificado"
                else:
                    row["can_notify"]   = True
                    row["status_badge"] = "Elegible"
            else:
                # Nunca ha sido notificado → elegible
                row["can_notify"]   = True
                row["status_badge"] = "Elegible"

            result.append(row)

        return {"records": result, "total": len(result)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.post("/admin/maintenance/trigger/{report_id}")
async def trigger_maintenance_by_report(
    report_id: int,
    token_data: dict = Depends(verify_token)
):
    """
    Envía manualmente una notificación de mantenimiento para un report_id específico.
    Valida anti-spam (30 días) antes de enviar.
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # │ Verificar que el reporte existe
        cursor.execute("""
            SELECT
                sr.id AS report_id, sr.service_id, sr.updated_at,
                u_client.id AS client_id, u_client.email AS client_email, u_client.name AS client_name,
                u_tech.id AS technician_id, u_tech.email AS tech_email, u_tech.name AS tech_name
            FROM service_report sr
            JOIN services s       ON s.id      = sr.service_id
            JOIN users u_client   ON u_client.id = s.client_id
            LEFT JOIN users u_tech ON u_tech.id  = s.technician_id
            WHERE sr.id = %s AND sr.deleted_at IS NULL
        """, (report_id,))

        report = cursor.fetchone()
        if not report:
            raise HTTPException(status_code=404, detail="Reporte no encontrado")

        # │ GUARDA ANTI-SPAM: verificar 30 días (race-condition check)
        cursor.execute("""
            SELECT id FROM maintenance_notifications
            WHERE service_report_id = %s
              AND deleted_at IS NULL
              AND sent_at >= NOW() - INTERVAL 30 DAY
        """, (report_id,))

        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=409,
                detail="Este cliente ya fue notificado en los últimos 30 días."
            )

        # │ Llamar al NotificationService para enviar correos
        from app.services.maintenance_email_service import NotificationService
        ns = NotificationService()

        from fastapi_mail import FastMail
        from app.config.email_config import mail_config
        fm = FastMail(mail_config)

        await ns._send_client_email(fm, report)
        if report.get("tech_email"):
            await ns._send_technician_email(fm, report)

        # │ Registrar la notificación
        cursor.execute("""
            INSERT INTO maintenance_notifications
                (client_id, client_email, technician_id, technician_email, service_report_id, sent_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (
            report["client_id"],
            report["client_email"],
            report["technician_id"],
            report.get("tech_email", ""),
            report_id,
        ))
        conn.commit()

        return {"message": f"Notificación enviada exitosamente al cliente {report['client_name']}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()
