import mysql.connector
from fastapi import HTTPException, Request
from app.config.db_config import get_db_connection #Connection to BD
from app.models.roles.roles_model import Roles #Model
from fastapi.encoders import jsonable_encoder #Serializable JSON structures
from fastapi.responses import JSONResponse
from werkzeug.security import *
from datetime import datetime

class RolesController:

    def get_roles(self):
        """Obtiene todos los roles activos"""
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT id, name, created_at, updated_at, deleted_at, status
                FROM roles
                WHERE deleted_at IS NULL
                ORDER BY id ASC
            """)
            roles = cursor.fetchall()
            return {"roles": roles}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener roles: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()



    def get_role(self, role_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT id, name, created_at, updated_at, deleted_at
                FROM roles
                WHERE id = %s AND deleted_at IS NULL
            """, (role_id,))
            role = cursor.fetchone()

            if not role:
                raise HTTPException(status_code=404, detail="Rol no encontrado.")

            return role

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al obtener rol: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()



    def create_role(self, roles: Roles):
        """Crea un nuevo rol"""
        name = roles.name
        status = roles.status

        if not name or name.strip() == "":
            raise HTTPException(status_code=400, detail="El nombre del rol es obligatorio.")

        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                INSERT INTO roles (name,status, created_at, updated_at)
                VALUES (%s,%s, NOW(), NOW())
            """, (name,status))
            conn.commit()

            return {"message": f"Rol '{name}' creado correctamente."}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al crear rol: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()



    def update_role(self, role_id: int, roles: Roles):
        name = roles.name
        status = roles.status
        if not name or name.strip() == "":
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío.")

        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT id FROM roles WHERE id = %s AND deleted_at IS NULL", (role_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Rol no encontrado.")

            cursor.execute("""
                UPDATE roles
                SET name = %s, status = %s, updated_at = NOW()
                WHERE id = %s
            """, (name, status, role_id))
            conn.commit()

            return {"message": "Rol actualizado correctamente."}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al actualizar rol: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()



    def delete_role(self, role_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            cursor.execute("SELECT id FROM roles WHERE id = %s AND deleted_at IS NULL", (role_id,))
            role = cursor.fetchone()
            if not role:
                raise HTTPException(status_code=404, detail="Rol no encontrado.")

            cursor.execute("""
                UPDATE roles
                SET deleted_at = NOW()
                WHERE id = %s
            """, (role_id,))
            conn.commit()

            return {"message": "Rol eliminado correctamente."}

        except mysql.connector.Error as e:
            raise HTTPException(status_code=500, detail=f"Error al eliminar rol: {e}")

        finally:
            if conn:
                cursor.close()
                conn.close()

