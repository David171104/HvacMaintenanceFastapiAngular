from fastapi import APIRouter
from app.config.db_config import get_db_connection #Connection to BD

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/maintenance/{user_id}")
def get_maintenance_notifications(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                mn.id,
                mn.service_report_id,
                mn.client_id,
                mn.client_email,
                mn.technician_id,
                mn.technician_email,
                mn.sent_at,
                client.name  AS client_name,
                tech.name    AS tech_name
            FROM maintenance_notifications mn
            JOIN users client ON client.id = mn.client_id
            JOIN users tech   ON tech.id   = mn.technician_id
            WHERE mn.deleted_at IS NULL
              AND (mn.client_id = %s OR mn.technician_id = %s)
            ORDER BY mn.sent_at DESC
            LIMIT 20
        """, (user_id, user_id))
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

@router.get("/maintenance/admin/all")
def get_all_maintenance_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                mn.id,
                mn.service_report_id,
                mn.client_id,
                mn.client_email,
                mn.technician_id,
                mn.technician_email,
                mn.sent_at,
                client.name  AS client_name,
                tech.name    AS tech_name
            FROM maintenance_notifications mn
            JOIN users client ON client.id = mn.client_id
            JOIN users tech   ON tech.id   = mn.technician_id
            WHERE mn.deleted_at IS NULL
            ORDER BY mn.sent_at DESC
            LIMIT 50
        """)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()