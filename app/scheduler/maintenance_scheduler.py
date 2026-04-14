from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.maintenance_email_service import send_maintenance_emails

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.add_job(
        send_maintenance_emails,
        trigger="interval",
        minutes=2,           # ← cada 2 minutos
        id="maintenance_check",
        replace_existing=True,
    )
    scheduler.start()
    print("[Scheduler] Iniciado — revisión cada 2 minutos.")


def stop_scheduler():
    scheduler.shutdown()
    print("[Scheduler] Detenido.")