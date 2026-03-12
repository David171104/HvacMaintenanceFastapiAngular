import mysql.connector
from fastapi import HTTPException, Request
from app.config.db_config import get_db_connection #Connection to BD
from app.models.permissions.permissions_model import Permissions #Model
from fastapi.encoders import jsonable_encoder #Serializable JSON structures
from fastapi.responses import JSONResponse
from werkzeug.security import *
from datetime import datetime

class PermissionsController:
    def get_permissions(self, role_id: int):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT
                    modules.id AS module_id,
                    modules.name AS module_name,
                    modules.routes AS routes,
                    COALESCE(permissions.can_view, 0) AS can_view,
                    COALESCE(permissions.can_create, 0) AS can_create,
                    COALESCE(permissions.can_edit, 0) AS can_edit,
                    COALESCE(permissions.can_delete, 0) AS can_delete
                FROM modules
                LEFT JOIN permissions
                    ON permissions.module_id = modules.id
                    AND permissions.role_id = %s
                WHERE modules.deleted_at IS NULL
                ORDER BY modules.id
            """, (role_id,))
            
            result = cursor.fetchall()

            payload = []
            for data in result:
                content = {
                    "module_id": data["module_id"],
                    "module_name": data["module_name"],
                    "routes": data["routes"],
                    "can_view": bool(data["can_view"]),
                    "can_create": bool(data["can_create"]),
                    "can_edit": bool(data["can_edit"]),
                    "can_delete": bool(data["can_delete"]),
                }
                payload.append(content)

            json_data = jsonable_encoder(payload)

            return {"resultado": json_data}

        except mysql.connector.Error as err:
            raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")

        finally:
            if conn:
                conn.close()

    def update_permissions(self, role_id: int, permissions: list):
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            for perm in permissions:
                cursor.execute("""
                    SELECT id FROM permissions
                    WHERE role_id = %s AND module_id = %s
                """, (role_id, perm["module_id"]))
                
                existing = cursor.fetchone()

                if existing:
                    cursor.execute("""
                        UPDATE permissions 
                        SET can_view = %s,
                            can_create = %s,
                            can_edit = %s,
                            can_delete = %s,
                            updated_at = %s
                        WHERE role_id = %s AND module_id = %s
                    """, (
                        perm["can_view"],
                        perm["can_create"],
                        perm["can_edit"],
                        perm["can_delete"],
                        datetime.now(),
                        role_id,
                        perm["module_id"]
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO permissions (role_id, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        role_id,
                        perm["module_id"],
                        perm["can_view"],
                        perm["can_create"],
                        perm["can_edit"],
                        perm["can_delete"],
                        datetime.now(),
                        datetime.now()
                    ))

            conn.commit()
            return {"message": "Permisos actualizados correctamente"}

        except mysql.connector.Error as err:
            if conn:
                conn.rollback()
            raise HTTPException(status_code=500, detail=f"Error en la base de datos: {err}")

        finally:
            if conn:
                conn.close()
