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




class AdminController:
    
    def get_user(self, user_id: int):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            result = cursor.fetchone()
            payload = []
            content = {} 
            
            content={
                    'id':int(result[0]),
                    'name':result[1],
                    'last_name':result[2],
                    'document_number':result[3],
                    'email':result[4],
                    'age':result[5],
                    'role_id':result[6]
            }
            payload.append(content)
            
            json_data = jsonable_encoder(content)            
            if result:
               return  json_data
            else:
                raise HTTPException(status_code=404, detail="User not found")  
                
        except mysql.connector.Error as err:
            conn.rollback()
            raise HTTPException(status_code=404, detail=str(err))
        finally:
            conn.close()
       
    def get_all_users(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE deleted_at IS NULL ORDER BY id ASC")
            result = cursor.fetchall()
            payload = []
            content = {} 
            for data in result:
                content={
                    'id':data[0],
                    'name':data[1],
                    'last_name':data[2],
                    'email':data[3],
                    'document_number':data[4],
                    'age':data[5],
                    'role_id':data[7]
                }
                payload.append(content)
                content = {}
            json_data = jsonable_encoder(payload)        
            if result:
               return {"resultado": json_data}
            else:
                raise HTTPException(status_code=404, detail="Users not found")  
                
        except mysql.connector.Error as err:
            conn.rollback()
        finally:
            conn.close()


    def create_user(self, user: User):

        if not user.name or user.name.strip() == "":
            raise HTTPException(status_code=400, detail="El nombre del usuario es obligatorio.")
        if not user.last_name or user.last_name.strip() == "":
            raise HTTPException(status_code=400, detail="El apellido del usuario es obligatorio.")
        if not user.email or user.email.strip() == "":
            raise HTTPException(status_code=400, detail="El email del usuario es obligatorio.")
        if not user.document_number:
            raise HTTPException(status_code=400, detail="El número de documento es obligatorio.")
        if not user.age:
            raise HTTPException(status_code=400, detail="La edad es obligatoria.")
        if not user.role_id:
            raise HTTPException(status_code=400, detail="Debe asignar un rol al usuario.")
        if not user.password or user.password.strip() == "":
            raise HTTPException(status_code=400, detail="Debe ingresar una contraseña.")

        conn = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

          
            cursor.execute(
                "SELECT id FROM users WHERE email = %s AND deleted_at IS NULL",
                (user.email,)
            )
            existing_user = cursor.fetchone()

            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Ya existe un usuario con ese correo electrónico."
                )

           
            hashed_password = generate_password_hash(user.password, method='scrypt')

            # Insertar usuario
            cursor.execute("""
                INSERT INTO users 
                (name, last_name, email, document_number, age, role_id, password, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, (
                user.name,
                user.last_name,
                user.email,
                user.document_number,
                user.age,
                user.role_id,
                hashed_password
            ))

            conn.commit()

            return {"message": f"Usuario '{user.name} {user.last_name}' creado correctamente."}

        except mysql.connector.Error as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al crear usuario: {e}"
            )

        finally:
            if conn:
                cursor.close()
                conn.close()

    def update_user(self, user_id: int, user: User):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            query = """
                UPDATE users
                SET 
                    name = %s,
                    last_name = %s,
                    email = %s,
                    age = %s,
                    role_id = %s
                WHERE id = %s
            """
            values = (
                user.name,
                user.last_name,
                user.email,
                user.age,
                user.role_id,
                user_id
            )

            cursor.execute(query, values)
            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            return {"message": " Usuario actualizado correctamente"}

        except mysql.connector.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")

        finally:
            if conn:
                conn.close()


    def delete_user(self, user_id: int):
   
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()


            cursor.execute("SELECT id FROM users WHERE id = %s AND deleted_at IS NULL", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Usuario no encontrado o ya eliminado.")

            cursor.execute("""
                UPDATE users
                SET deleted_at = NOW(),
                    status = 0
                WHERE id = %s
            """, (user_id,))
            conn.commit()

            return {"message": "Usuario eliminado correctamente."}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar usuario: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()

    def get_all_services(self):
    
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

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
                ORDER BY services.request_date DESC, services.request_time DESC;

            """
            cursor.execute(query)
            services = cursor.fetchall()
            return {"resultado": services}

        except Exception as e:
            print("Error al obtener los servicios:", e)
            raise HTTPException(status_code=500, detail="Error al obtener los servicios")
        finally:
            if conn:
                conn.close()


    def get_all_technicians(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, last_name, email, document_number, age, role_id
                FROM users
                WHERE role_id = 2 AND deleted_at IS NULL
                ORDER BY id ASC
            """)
            result = cursor.fetchall()

            payload = []
            for data in result:
                payload.append({
                    'id': data[0],
                    'name': data[1],
                    'last_name': data[2],
                    'email': data[3],
                    'document_number': data[4],
                    'age': data[5],
                    'role_id': data[6],
                })

            if not payload:
                raise HTTPException(status_code=404, detail="No technicians found")

            return {"resultado": jsonable_encoder(payload)}

        except mysql.connector.Error as err:
            raise HTTPException(status_code=500, detail=str(err))
        finally:
            conn.close()


    async def assign_technician(self, service_id: int, technician_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # Revisar que el técnico exista
            cursor.execute("SELECT name, email FROM users WHERE id = %s AND deleted_at IS NULL", (technician_id,))
            tech = cursor.fetchone()
            if not tech:
                raise HTTPException(status_code=404, detail="Técnico no encontrado.")

            tech_name, tech_email = tech
            print("Técnico encontrado:", tech_name, tech_email)

            # Revisar que el servicio exista
            cursor.execute("SELECT id, client_id, request_date, request_time, service_type, address FROM services WHERE id = %s", (service_id,))
            service = cursor.fetchone()
            if not service:
                raise HTTPException(status_code=404, detail="Servicio no encontrado.")

            print("Servicio encontrado:", service)

            # Actualizar servicio
            cursor.execute("""
                UPDATE services
                SET technician_id = %s, current_status = 'assigned', updated_at = NOW()
                WHERE id = %s
            """, (technician_id, service_id))
            conn.commit()

            # Enviar correo al técnico
            from fastapi_mail import FastMail, MessageSchema
            from app.config.email_config import mail_config

            fm = FastMail(mail_config)

            html = f"""
            <html>
            <body>
                <p>Hola {tech_name},</p>
                <p>Se te ha asignado un nuevo servicio:</p>
                <ul>
                    <li>ID Servicio: {service[0]}</li>
                    <li>Cliente ID: {service[1]}</li>
                    <li>Tipo: {service[4]}</li>
                    <li>Fecha: {service[2]}</li>
                    <li>Hora: {service[3]}</li>
                    <li>Dirección: {service[5]}</li>
                </ul>
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
            print("ERROR en assign_technician:", e)
            raise HTTPException(status_code=500, detail=str(e))

        finally:
            if conn:
                conn.close()
                

    def get_all_reports(self, technician_id=None, status="all", date_from=None, date_to=None):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            query = """
                SELECT 
                    sr.id,
                    sr.technician_id,
                    u.name AS client_name,
                    u.last_name AS client_last_name,
                    ut.name AS technician_name,
                    ut.last_name AS technician_last_name,
                    sr.service_description,
                    sr.created_at,
                    s.current_status
                FROM service_report sr
                INNER JOIN services s ON s.id = sr.service_id
                INNER JOIN users u ON u.id = s.client_id
                INNER JOIN users ut 
                ON ut.id = s.technician_id
                WHERE sr.deleted_at IS NULL
            """

            params = []

            # FILTRO por técnico (opcional)
            if technician_id is not None:
                query += " AND sr.technician_id = %s"
                params.append(technician_id)

            # FILTRO por estado (opcional)
            if status != "all":
                query += " AND s.current_status = %s"
                params.append(status)

            # FILTRO por rango de fechas
            if date_from:
                query += " AND sr.created_at >= %s"
                params.append(date_from + " 00:00:00")

            if date_to:
                query += " AND sr.created_at <= %s"
                params.append(date_to + " 23:59:59")

            query += " ORDER BY sr.id DESC"

            cursor.execute(query, params)
            return cursor.fetchall()

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener reportes: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()

    def verify_password(self, user_id, data):
        print("old_password", data["old_password"])
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            if not check_password_hash(user["password"], data["old_password"]):
                raise HTTPException(status_code=401, detail="Contraseña incorrecta")

            return {"message": "Contraseña verificada"}

        finally:
            conn.close()

    def change_password(self, user_id, data):
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            new_password_hashed = generate_password_hash(data["new_password"])

            cursor.execute("""
                UPDATE users
                SET password = %s
                WHERE id = %s
            """, (new_password_hashed, user_id))

            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            return {"message": "Contraseña cambiada correctamente"}

        finally:
            conn.close()

    def update_profile(self, user_id, data):
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                UPDATE users 
                SET name = %s,
                    last_name = %s,
                    email = %s,
                    document_number = %s
                WHERE id = %s
            """, (
                data["name"],
                data["last_name"],
                data["email"],
                data["document_number"],
                user_id
            ))

            conn.commit()

            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")

            return {"message": "Información actualizada correctamente"}

        finally:
            conn.close()
