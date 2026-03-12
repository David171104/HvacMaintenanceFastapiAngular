from fastapi import APIRouter, Depends,Request
from typing import Optional
from app.controllers.admin.admin_controller import *
from app.models.users.user_model import User
from app.models.login.user_login_model import UserLogin
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.auth import verify_token 

router = APIRouter()

adminController = AdminController()


#FUNCTIONAL ROUTES
@router.get("/users/get_user/{user_id}",response_model=User)
async def get_user(user_id: int,  token_data: dict = Depends(verify_token)):
    response = adminController.get_user(user_id)
    return response

@router.get("/users/get_users/")
async def get_users(token_data: dict = Depends(verify_token)):
    response = adminController.get_all_users()
    return response

@router.post("/users/admin-create_user")
async def create_user(user: User, token_data: dict = Depends(verify_token)):
    return adminController.create_user(user)

@router.put("/users/update_user/{user_id}") 
async def update_user(user_id: int, user: User, token_data: dict = Depends(verify_token)):
    response = adminController.update_user(user_id, user)
    return response

@router.delete("/users/delete/{user_id}")
async def delete_user(user_id: int, token_data: dict = Depends(verify_token)):
    return adminController.delete_user(user_id)
 

@router.get("/users/services/all")
async def get_users(token_data: dict = Depends(verify_token)):
    response = adminController.get_all_services()
    return response


@router.get("/users/technicians/all")
def get_all_technicians(token_data: dict = Depends(verify_token)):
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
 
@router.post("/users/verify_password/{user_id}")
async def verify_password(user_id: int, request: dict, token_data: dict = Depends(verify_token)):
    return adminController.verify_password(user_id, request)

@router.put("/users/change_password/{user_id}")
async def change_password(user_id: int, request: dict, token_data: dict = Depends(verify_token)):
    return adminController.change_password(user_id, request)

@router.put("/users/update-profile/{user_id}")
async def update_profile(user_id: int, request: dict, token_data: dict = Depends(verify_token)):
    return adminController.update_profile(user_id, request)
