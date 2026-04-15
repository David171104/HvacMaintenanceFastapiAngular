from typing import List

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator

from app.auth import verify_token
from app.config.db_config import get_db_connection


router = APIRouter(prefix="/roles", tags=["Roles"])


class RoleBase(BaseModel):
    name: str
    status: int

    @validator("name")
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre del rol es obligatorio.")
        return normalized

    @validator("status", pre=True)
    def validate_status(cls, value) -> int:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, str):
            value = value.strip()
            if value in {"0", "1"}:
                return int(value)
        if value not in (0, 1):
            raise ValueError("El estado debe ser 0 o 1.")
        return int(value)


class RoleCreate(RoleBase):
    pass


class RoleUpdate(RoleBase):
    pass


class PermissionUpdateItem(BaseModel):
    module_id: int
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False


class PermissionUpdatePayload(BaseModel):
    permissions: List[PermissionUpdateItem]


def _get_active_role(cursor, role_id: int):
    cursor.execute(
        """
        SELECT id, name, created_at, updated_at, deleted_at, status
        FROM roles
        WHERE id = %s AND deleted_at IS NULL
        """,
        (role_id,),
    )
    role = cursor.fetchone()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado.")
    return role


def _handle_db_error(conn, cursor, message: str, error: mysql.connector.Error):
    if conn:
        conn.rollback()
    if cursor:
        cursor.close()
    if conn:
        conn.close()
    raise HTTPException(status_code=500, detail=f"{message}: {error}")


@router.get("")
async def get_roles(token_data: dict = Depends(verify_token)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, name, created_at, updated_at, deleted_at, status
            FROM roles
            WHERE deleted_at IS NULL
            ORDER BY id ASC
            """
        )
        return {"roles": cursor.fetchall()}
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al obtener roles", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/{role_id}")
async def get_role(role_id: int, token_data: dict = Depends(verify_token)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        return _get_active_role(cursor, role_id)
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al obtener rol", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.post("")
async def create_role(payload: RoleCreate, token_data: dict = Depends(verify_token)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            INSERT INTO roles (name, status, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            """,
            (payload.name, payload.status),
        )
        conn.commit()

        role_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT id, name, created_at, updated_at, deleted_at, status
            FROM roles
            WHERE id = %s
            """,
            (role_id,),
        )
        return {
            "message": f"Rol '{payload.name}' creado correctamente.",
            "role": cursor.fetchone(),
        }
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al crear rol", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.put("/{role_id}")
async def update_role(role_id: int, payload: RoleUpdate, token_data: dict = Depends(verify_token)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        _get_active_role(cursor, role_id)

        cursor.execute(
            """
            UPDATE roles
            SET name = %s, status = %s, updated_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            """,
            (payload.name, payload.status, role_id),
        )
        conn.commit()

        return {
            "message": "Rol actualizado correctamente.",
            "role": _get_active_role(cursor, role_id),
        }
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al actualizar rol", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.delete("/{role_id}")
async def delete_role(role_id: int, token_data: dict = Depends(verify_token)):
    if role_id in (1, 2):
        raise HTTPException(status_code=403, detail="Este rol del sistema no puede ser eliminado.")
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        _get_active_role(cursor, role_id)

        cursor.execute(
            """
            UPDATE roles
            SET deleted_at = NOW(), updated_at = NOW()
            WHERE id = %s AND deleted_at IS NULL
            """,
            (role_id,),
        )
        conn.commit()
        return {"message": "Rol eliminado correctamente."}
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al eliminar rol", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/{role_id}/permissions")
async def get_role_permissions(role_id: int, token_data: dict = Depends(verify_token)):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        _get_active_role(cursor, role_id)

        cursor.execute(
            """
            SELECT
                m.id AS module_id,
                m.name AS module_name,
                m.routes AS routes,
                COALESCE(p.can_view, 0) AS can_view,
                COALESCE(p.can_create, 0) AS can_create,
                COALESCE(p.can_edit, 0) AS can_edit,
                COALESCE(p.can_delete, 0) AS can_delete
            FROM modules AS m
            LEFT JOIN permissions AS p
                ON p.module_id = m.id
                AND p.role_id = %s
                AND p.deleted_at IS NULL
                AND p.status = 1
            WHERE m.deleted_at IS NULL
              AND m.status = 1
            ORDER BY m.id ASC
            """,
            (role_id,),
        )

        permissions = []
        for row in cursor.fetchall():
            permissions.append(
                {
                    "module_id": row["module_id"],
                    "module_name": row["module_name"],
                    "routes": row["routes"],
                    "can_view": bool(row["can_view"]),
                    "can_create": bool(row["can_create"]),
                    "can_edit": bool(row["can_edit"]),
                    "can_delete": bool(row["can_delete"]),
                }
            )

        return {"role_id": role_id, "permissions": permissions}
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al obtener permisos del rol", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.put("/{role_id}/permissions")
async def update_role_permissions(
    role_id: int,
    payload: PermissionUpdatePayload,
    token_data: dict = Depends(verify_token),
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        _get_active_role(cursor, role_id)

        for permission in payload.permissions:
            cursor.execute(
                """
                SELECT id
                FROM modules
                WHERE id = %s AND deleted_at IS NULL AND status = 1
                LIMIT 1
                """,
                (permission.module_id,),
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail=f"Modulo no encontrado o inactivo: {permission.module_id}.",
                )

            cursor.execute(
                """
                SELECT id, deleted_at
                FROM permissions
                WHERE role_id = %s AND module_id = %s
                LIMIT 1
                """,
                (role_id, permission.module_id),
            )
            existing_permission = cursor.fetchone()

            if existing_permission:
                cursor.execute(
                    """
                    UPDATE permissions
                    SET can_view = %s,
                        can_create = %s,
                        can_edit = %s,
                        can_delete = %s,
                        deleted_at = NULL,
                        status = 1,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (
                        permission.can_view,
                        permission.can_create,
                        permission.can_edit,
                        permission.can_delete,
                        existing_permission["id"],
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO permissions (
                        role_id,
                        module_id,
                        can_view,
                        can_create,
                        can_edit,
                        can_delete,
                        created_at,
                        updated_at,
                        status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW(), 1)
                    """,
                    (
                        role_id,
                        permission.module_id,
                        permission.can_view,
                        permission.can_create,
                        permission.can_edit,
                        permission.can_delete,
                    ),
                )

        conn.commit()
        return {"message": "Permisos actualizados correctamente."}
    except mysql.connector.Error as error:
        _handle_db_error(conn, cursor, "Error al guardar permisos del rol", error)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.get("/list")
async def get_roles_legacy(token_data: dict = Depends(verify_token)):
    return await get_roles(token_data)


@router.get("/get/{role_id}")
async def get_role_legacy(role_id: int, token_data: dict = Depends(verify_token)):
    return await get_role(role_id, token_data)


@router.post("/create")
async def create_role_legacy(payload: RoleCreate, token_data: dict = Depends(verify_token)):
    return await create_role(payload, token_data)


@router.put("/update/{role_id}")
async def update_role_legacy(
    role_id: int,
    payload: RoleUpdate,
    token_data: dict = Depends(verify_token),
):
    return await update_role(role_id, payload, token_data)


@router.delete("/delete/{role_id}")
async def delete_role_legacy(role_id: int, token_data: dict = Depends(verify_token)):
    return await delete_role(role_id, token_data)
