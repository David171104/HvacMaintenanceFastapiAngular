import mysql.connector
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from werkzeug.security import check_password_hash

from app.auth import create_access_token
from app.config.db_config import get_db_connection
from app.models.login.user_login_model import UserLogin


class LoginController:
    def login_user(self, user: UserLogin):
        conn = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT * FROM users WHERE email = %s", (user.email,))
            user_data = cursor.fetchone()

            if not user_data:
                raise HTTPException(status_code=401, detail="Correo o contrasena incorrectos")

            if user_data.get("deleted_at") is not None:
                raise HTTPException(
                    status_code=403,
                    detail="Tu cuenta ha sido eliminada. Contacta con el administrador.",
                )

            if user_data.get("status") != 1:
                raise HTTPException(
                    status_code=403,
                    detail="Tu cuenta esta inactiva. Contacta con el administrador.",
                )

            if not check_password_hash(user_data["password"], user.password):
                raise HTTPException(status_code=401, detail="Correo o contrasena incorrectos")

            access_token = create_access_token(
                data={
                    "sub": user_data["email"],
                    "role_id": user_data["role_id"],
                }
            )

            return JSONResponse(
                status_code=200,
                content={
                    "message": "Login exitoso",
                    "access_token": access_token,
                    "user": {
                        "id": user_data["id"],
                        "role_id": user_data["role_id"],
                        "name": user_data["name"],
                        "last_name": user_data["last_name"],
                        "document_number": user_data["document_number"],
                        "email": user_data["email"],
                    },
                },
            )

        except mysql.connector.Error as err:
            raise HTTPException(status_code=500, detail=str(err))

        finally:
            if conn:
                conn.close()
