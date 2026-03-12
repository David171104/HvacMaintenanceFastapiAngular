import mysql.connector
from fastapi import HTTPException, Request
from app.config.db_config import get_db_connection #Connection to BD
from app.models.users.user_model import User #Model
from app.models.login.user_login_model import UserLogin
from fastapi.encoders import jsonable_encoder #Serializable JSON structures
from fastapi.responses import JSONResponse
from fastapi_mail import FastMail, MessageSchema
from app.config.email_config import mail_config
from werkzeug.security import *


class RegisterController:

    async def create_user(self, user):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            hashed_password = generate_password_hash(user.password, method='scrypt')

            cursor.execute(
                """INSERT INTO users 
                (name, last_name, document_number, email, age, password, role_id, created_at, updated_at) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    user.name,
                    user.last_name,
                    user.document_number,
                    user.email,
                    user.age,
                    hashed_password,
                    user.role_id,
                    user.created_at,
                    user.updated_at
                )
            )

            conn.commit()
            fm = FastMail(mail_config)

            message = MessageSchema(
                subject="¡Bienvenido a la plataforma!",
                recipients=[user.email],  # ← correo del usuario registrado
                body=f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bienvenido</title>
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
                                    ¡Bienvenido a nuestra plataforma!
                                </h1>
                                <p style="margin:10px 0; color:#6b7280; font-size:16px;">
                                    Estamos felices de tenerte con nosotros.
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
                                        Hola <strong>{user.name}</strong>,
                                    </p>
                                    <p style="color:#4b5563; font-size:15px; line-height:1.6;">
                                        Tu registro se ha completado correctamente.  
                                        Queremos darte la bienvenida a una experiencia diseñada para ayudarte a gestionar tus servicios de manera fácil y segura.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Button -->
                        <tr>
                            <td align="center" style="padding: 25px 0;">
                                <a href="http://localhost:5173/login"
                                   style="
                                       background:#6366f1;
                                       color:white;
                                       padding:12px 28px;
                                       text-decoration:none;
                                       border-radius:8px;
                                       font-size:16px;
                                       display:inline-block;
                                       font-weight:bold;
                                   ">
                                   Ir a la plataforma
                                </a>
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
                """,
                subtype="html"
            )

            await fm.send_message(message)

            return JSONResponse(
                status_code=200,
                content={"message": "Usuario creado y correo enviado"}
            )

        except mysql.connector.Error as err:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(err))

        finally:
            conn.close()