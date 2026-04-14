from datetime import datetime
from app.config.db_config import get_db_connection #Connection to BD
from fastapi_mail import FastMail, MessageSchema
from app.config.email_config import mail_config

DAYS_THRESHOLD = 0

class NotificationService:
    async def process_pending_maintenances(self):
        print(f"[NotificationService] Ejecutando revisión de mantenimiento: {datetime.now()}")

        conn = None
        cursor = None

        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT
                    sr.id            AS report_id,
                    sr.service_id,
                    sr.updated_at,

                    client.id        AS client_id,
                    client.email     AS client_email,
                    client.name      AS client_name,

                    tech.id          AS technician_id,
                    tech.email       AS tech_email,
                    tech.name        AS tech_name

                FROM service_report sr
                JOIN services s   ON s.id      = sr.service_id
                JOIN users client ON client.id = s.client_id
                JOIN users tech   ON tech.id   = s.technician_id

                WHERE sr.updated_at <= NOW() - INTERVAL %s DAY

                -- Excluye reportes que ya recibieron notificación
                AND sr.id NOT IN (
                    SELECT service_report_id
                    FROM maintenance_notifications
                    WHERE deleted_at IS NULL
                )
            """, (DAYS_THRESHOLD,))

            reports = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]

            if not reports:
                print("[Scheduler] Sin reportes nuevos que requieran notificación.")
                return

            fm = FastMail(mail_config)

            for row in reports:
                report = dict(zip(columns, row))

                # Enviar correos
                await self._send_client_email(fm, report)
                await self._send_technician_email(fm, report)

                # Registrar notificación enviada
                self._register_notification(cursor, conn, report)

            print(f"[Scheduler] Notificaciones enviadas para {len(reports)} reporte(s).")

        except Exception as e:
            print(f"[Scheduler] Error: {e}")

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()


    def _register_notification(self, cursor, conn, report: dict):
        """Registra en maintenance_notifications que ya se notificó este reporte."""
        try:
            cursor.execute("""
                INSERT INTO maintenance_notifications (
                    client_id,
                    client_email,
                    technician_id,
                    technician_email,
                    service_report_id,
                    sent_at
                ) VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                report["client_id"],
                report["client_email"],
                report["technician_id"],
                report["tech_email"],
                report["report_id"],
            ))
            conn.commit()
            print(f"  → Notificación registrada para reporte #{report['report_id']}")

        except Exception as e:
            conn.rollback()
            print(f"  → Error al registrar notificación del reporte #{report['report_id']}: {e}")


    # ── Correo al CLIENTE ─────────────────────────────────────────────────────────

    async def _send_client_email(self, fm: FastMail, report: dict):
        message = MessageSchema(
            subject="Aviso de mantenimiento de su equipo",
            recipients=[report["client_email"]],
            body=f"""
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                <body style="margin:0; padding:0; font-family: Arial, sans-serif; background:#f4f4f7;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="padding: 40px 0;">
                                <table width="600" cellpadding="0" cellspacing="0"
                                    style="background:white; border-radius:12px; padding:40px;
                                            box-shadow:0 2px 8px rgba(0,0,0,0.1);">

                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                            <h1 style="margin:0; font-size:28px; color:#111827;">
                                                Aviso de Mantenimiento
                                            </h1>
                                            <p style="margin:10px 0; color:#6b7280; font-size:16px;">
                                                Su equipo requiere atención
                                            </p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding: 20px 0;">
                                            <div style="background:#f9fafb; border-radius:10px;
                                                        padding:20px; border:1px solid #e5e7eb;">
                                                <p style="font-size:16px; color:#374151; margin:0 0 10px 0;">
                                                    Cordial saludo señor(a) <strong>{report["client_name"]}</strong>,
                                                </p>
                                                <p style="color:#4b5563; font-size:15px; line-height:1.6;">
                                                    Se le informa que su equipo ya necesita mantenimiento nuevamente.
                                                    Por favor, comuníquese con nosotros para agendar una visita técnica.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="padding: 25px 0;">
                                            <a href="http://localhost:4200/login"
                                            style="background:#6366f1; color:white; padding:12px 28px;
                                                    text-decoration:none; border-radius:8px;
                                                    font-size:16px; display:inline-block; font-weight:bold;">
                                            Ir a la plataforma
                                            </a>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="padding-top:20px; color:#9ca3af; font-size:13px;">
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
        print(f"  → Correo cliente enviado a: {report['client_email']}")


    # ── Correo al TÉCNICO ─────────────────────────────────────────────────────────

    async def _send_technician_email(self, fm: FastMail, report: dict):
        updated_at_fmt = report["updated_at"].strftime("%d/%m/%Y %H:%M")

        message = MessageSchema(
            subject="Recordatorio: servicio pendiente de mantenimiento",
            recipients=[report["tech_email"]],
            body=f"""
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                <body style="margin:0; padding:0; font-family: Arial, sans-serif; background:#f4f4f7;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="padding: 40px 0;">
                                <table width="600" cellpadding="0" cellspacing="0"
                                    style="background:white; border-radius:12px; padding:40px;
                                            box-shadow:0 2px 8px rgba(0,0,0,0.1);">

                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                            <h1 style="margin:0; font-size:28px; color:#111827;">
                                                Recordatorio de Mantenimiento
                                            </h1>
                                            <p style="margin:10px 0; color:#6b7280; font-size:16px;">
                                                Tienes un servicio pendiente de atención
                                            </p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="padding: 20px 0;">
                                            <div style="background:#f9fafb; border-radius:10px;
                                                        padding:20px; border:1px solid #e5e7eb;">
                                                <p style="font-size:16px; color:#374151; margin:0 0 10px 0;">
                                                    Hola, <strong>{report["tech_name"]}</strong>:
                                                </p>
                                                <p style="color:#4b5563; font-size:15px; line-height:1.6;">
                                                    El cliente <strong>{report["client_name"]}</strong> requiere de mantenimiento
                                                    en su equipo. El último reporte fue actualizado el
                                                    <strong>{updated_at_fmt}</strong>.
                                                </p>
                                                <p style="color:#4b5563; font-size:15px; line-height:1.6;">
                                                    Por favor, coordina la visita con el cliente a la brevedad.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="padding: 25px 0;">
                                            <a href="http://localhost:4200/login"
                                            style="background:#6366f1; color:white; padding:12px 28px;
                                                    text-decoration:none; border-radius:8px;
                                                    font-size:16px; display:inline-block; font-weight:bold;">
                                            Ver en la plataforma
                                            </a>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="padding-top:20px; color:#9ca3af; font-size:13px;">
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
        print(f"  → Correo técnico enviado a: {report['tech_email']}")