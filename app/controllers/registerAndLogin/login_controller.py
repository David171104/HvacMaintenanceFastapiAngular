import mysql.connector
from fastapi import HTTPException, Request
from app.config.db_config import get_db_connection #Connection to BD
from app.models.users.user_model import User #Model
from app.models.login.user_login_model import UserLogin
from fastapi.encoders import jsonable_encoder #Serializable JSON structures
from fastapi.responses import JSONResponse
from werkzeug.security import *
from app.auth import create_access_token
# from fastapi.security import OAuth2PasswordRequestForm


class LoginController:
        
    def login_user(self, user: UserLogin):
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT * FROM users WHERE email = %s", (user.email,))
            userData = cursor.fetchone()

            
            if userData.get("deleted_at") is not None:
                raise HTTPException(status_code=403, detail="Tu cuenta ha sido eliminada. Contacta con el administrador.")

       
            if userData.get("status") != 1:
                raise HTTPException(status_code=403, detail="Tu cuenta está inactiva. Contacta con el administrador.")
        
            if not userData:
                raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

            if not check_password_hash(userData['password'], user.password):
                raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

            access_token = create_access_token(
                data={
                    "sub": userData['email'], 
                    "role_id": userData['role_id']
                }
            )
           
            return JSONResponse(status_code=200, content={
                "message": "Login exitoso",
                "access_token": access_token,
                "user": 
                {
                    "id": userData["id"], 
                    "role_id": userData["role_id"], 
                    "name": userData["name"],
                    "last_name": userData["last_name"],
                    "document_number": userData["document_number"], 
                    "email": userData["email"]
                }
            })
        
        except mysql.connector.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        
        finally:
            conn.close()






