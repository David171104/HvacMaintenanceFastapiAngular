from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from decouple import config
from app.config.db_config import get_db_connection

# Configuración
SECRET_KEY = config("SECRET_KEY", default="secret_key_example")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Dependencia de FastAPI para extraer el token del encabezado Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# -----------------------------------------------------------
# ✅ Crear el token
# -----------------------------------------------------------
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# -----------------------------------------------------------
# ✅ Verificar token (middleware de autenticación)
# -----------------------------------------------------------
def verify_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload 
    except JWTError:
        raise credentials_exception


def ensure_module_permission(
    token_data: dict,
    module_name: str,
    action: str,
    deny_message: str = "No tienes permisos para realizar esta accion.",
):
    role_id = token_data.get("role_id")
    if not role_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido o sin rol.")

    if action not in {"can_view", "can_create", "can_edit", "can_delete"}:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Accion de permiso invalida.")

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT COALESCE(p.{action}, 0) AS allowed
            FROM modules m
            LEFT JOIN permissions p
              ON p.module_id = m.id
             AND p.role_id = %s
             AND p.deleted_at IS NULL
             AND p.status = 1
            WHERE LOWER(m.name) = LOWER(%s)
              AND m.deleted_at IS NULL
              AND m.status = 1
            LIMIT 1
            """,
            (role_id, module_name),
        )
        permission = cursor.fetchone()

        if not permission or not bool(permission.get("allowed")):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=deny_message)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


