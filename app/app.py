# ============================================================
# API IoT ESP32 (WiFi) + Neon PostgreSQL (Pooled)
# ============================================================

from __future__ import annotations

import datetime
import os
from typing import List

import pytz
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.iot_analysis import build_delta, interpret_comparison, summarize_period
from app.models.iot_reading_model import (
    IoTEquipmentOut,
    LecturaComparisonDeltaOut,
    LecturaComparisonOut,
    LecturaComparisonPeriodOut,
    LecturaIn,
    LecturaOut,
)
from app.models.validation_utils import format_validation_errors

# ============================================================
# CONFIG DB (Neon pooled)
# ============================================================
load_dotenv()

DATABASE_URL = os.getenv("PG_URL")
if not DATABASE_URL:
    raise RuntimeError("No se encontro PG_URL en el archivo .env")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=1,
    max_overflow=0,
    pool_timeout=30,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
COLOMBIA_TZ = pytz.timezone("America/Bogota")

DEFAULT_IOT_EQUIPMENT = (
    {"id": "mini-01", "name": "Minisplit Lobby", "location": "Recepcion principal"},
    {"id": "mini-02", "name": "Minisplit Sala Tecnica", "location": "Area de control IoT"},
    {"id": "mini-03", "name": "Minisplit Oficina 3", "location": "Zona administrativa"},
)


# ============================================================
# MODELOS SQLALCHEMY
# ============================================================
class Lectura(Base):
    __tablename__ = "lecturas"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime, nullable=False)
    temperatura = Column(Float, nullable=False)
    humedad = Column(Float, nullable=False)
    corriente = Column(Float, nullable=False)
    equipo_id = Column(String(50), nullable=True)
    observacion = Column(Text, nullable=True)
    manual_entry = Column(Boolean, nullable=False, default=False, server_default=text("FALSE"))


class IoTEquipment(Base):
    __tablename__ = "iot_equipment_catalog"

    id = Column(String(50), primary_key=True)
    name = Column(String(120), nullable=False)
    location = Column(String(120), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("TRUE"))
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.datetime.utcnow,
    )


def ensure_iot_schema() -> None:
    ddl_statements = (
        """
        CREATE TABLE IF NOT EXISTS iot_equipment_catalog (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            location VARCHAR(120) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "ALTER TABLE lecturas ADD COLUMN IF NOT EXISTS equipo_id VARCHAR(50)",
        "ALTER TABLE lecturas ADD COLUMN IF NOT EXISTS observacion TEXT",
        "ALTER TABLE lecturas ADD COLUMN IF NOT EXISTS manual_entry BOOLEAN NOT NULL DEFAULT FALSE",
        """
        CREATE INDEX IF NOT EXISTS idx_lecturas_equipo_fecha
        ON lecturas (equipo_id, fecha_hora DESC)
        """,
    )

    with engine.begin() as connection:
        for statement in ddl_statements:
            connection.execute(text(statement))

        for equipment in DEFAULT_IOT_EQUIPMENT:
            connection.execute(
                text(
                    """
                    INSERT INTO iot_equipment_catalog (id, name, location, is_active)
                    VALUES (:id, :name, :location, TRUE)
                    ON CONFLICT (id)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        location = EXCLUDED.location,
                        is_active = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    """
                ),
                equipment,
            )


def to_bogota_naive(value: datetime.datetime | None) -> datetime.datetime:
    if value is None:
        return datetime.datetime.now(COLOMBIA_TZ).replace(tzinfo=None)

    if value.tzinfo is None:
        localized = COLOMBIA_TZ.localize(value)
    else:
        localized = value.astimezone(COLOMBIA_TZ)

    return localized.replace(tzinfo=None)


# ============================================================
# FASTAPI CONFIG
# ============================================================
app = FastAPI(
    title="API IoT ESP32 (WiFi) - Neon",
    description="Recepcion de lecturas IoT en PostgreSQL (Neon)",
    version="3.2",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def bootstrap_iot_schema() -> None:
    ensure_iot_schema()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    detail, errors = format_validation_errors(exc)
    return JSONResponse(status_code=422, content={"detail": detail, "errors": errors})


# ============================================================
# DATABASE DEPENDENCY
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================
# HEALTH CHECK
# ============================================================
@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DB error: {str(exc)}")


@app.get("/debug/db")
def debug_db():
    url = os.getenv("PG_URL", "")
    safe_url = url
    if "://" in safe_url and "@" in safe_url:
        left, right = safe_url.split("://", 1)
        creds_host = right.split("@", 1)
        if len(creds_host) == 2:
            creds, host = creds_host
            if ":" in creds:
                user = creds.split(":", 1)[0]
                safe_url = f"{left}://{user}:****@{host}"
    return {"pg_url": safe_url}


# ============================================================
# EQUIPOS IoT
# ============================================================
@app.get("/lecturas/equipos", response_model=List[IoTEquipmentOut])
def listar_equipos_iot(db: Session = Depends(get_db)):
    try:
        return (
            db.query(IoTEquipment)
            .filter(IoTEquipment.is_active.is_(True))
            .order_by(IoTEquipment.name.asc())
            .all()
        )
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=f"Error consultando equipos IoT: {str(exc)}")


# ============================================================
# ENDPOINT PRINCIPAL (guardar lectura)
# ============================================================
@app.post("/lecturas", response_model=LecturaOut)
async def crear_lectura(
    lectura: LecturaIn,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        equipo = db.query(IoTEquipment).filter(IoTEquipment.id == lectura.equipo_id).first()

        if not equipo or not equipo.is_active:
            raise HTTPException(
                status_code=422,
                detail="equipo_id: El equipo o minisplit seleccionado no existe o esta inactivo.",
            )

        fecha_hora = to_bogota_naive(lectura.fecha_hora_manual)

        nueva = Lectura(
            fecha_hora=fecha_hora,
            temperatura=lectura.temperatura,
            humedad=lectura.humedad,
            corriente=lectura.corriente,
            equipo_id=lectura.equipo_id,
            observacion=lectura.observacion,
            manual_entry=lectura.fecha_hora_manual is not None,
        )

        db.add(nueva)
        db.commit()
        db.refresh(nueva)

        print(
            f"[{fecha_hora.strftime('%Y-%m-%d %H:%M:%S')}] "
            f"IP {request.client.host if request.client else 'unknown'} -> "
            f"Equipo={lectura.equipo_id}, "
            f"T={lectura.temperatura}, H={lectura.humedad}, I={lectura.corriente}"
        )

        return nueva

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error guardando lectura: {str(exc)}")


# ============================================================
# ENDPOINTS DE CONSULTA
# ============================================================
@app.get("/lecturas", response_model=List[LecturaOut])
def listar_lecturas(
    limit: int = Query(default=100, ge=1, le=1000),
    equipo_id: str | None = None,
    date_from: datetime.datetime | None = None,
    date_to: datetime.datetime | None = None,
    db: Session = Depends(get_db),
):
    try:
        query = db.query(Lectura)

        if equipo_id:
            query = query.filter(Lectura.equipo_id == equipo_id.strip())

        if date_from:
            query = query.filter(Lectura.fecha_hora >= to_bogota_naive(date_from))

        if date_to:
            query = query.filter(Lectura.fecha_hora <= to_bogota_naive(date_to))

        return query.order_by(Lectura.fecha_hora.desc()).limit(limit).all()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=f"Error consultando lecturas: {str(exc)}")


@app.get("/lecturas/comparar", response_model=LecturaComparisonOut)
def comparar_lecturas(
    equipo_id: str,
    before_from: datetime.datetime,
    before_to: datetime.datetime,
    after_from: datetime.datetime,
    after_to: datetime.datetime,
    db: Session = Depends(get_db),
):
    before_from_value = to_bogota_naive(before_from)
    before_to_value = to_bogota_naive(before_to)
    after_from_value = to_bogota_naive(after_from)
    after_to_value = to_bogota_naive(after_to)

    if not equipo_id.strip():
        raise HTTPException(status_code=422, detail="equipo_id: Debes seleccionar un equipo valido.")

    if before_from_value > before_to_value:
        raise HTTPException(status_code=422, detail="before_from: El rango antes es invalido.")

    if after_from_value > after_to_value:
        raise HTTPException(status_code=422, detail="after_from: El rango despues es invalido.")

    try:
        equipment = db.query(IoTEquipment).filter(IoTEquipment.id == equipo_id.strip()).first()

        if not equipment or not equipment.is_active:
            raise HTTPException(
                status_code=422,
                detail="equipo_id: El equipo o minisplit seleccionado no existe o esta inactivo.",
            )

        before_readings = (
            db.query(Lectura)
            .filter(Lectura.equipo_id == equipment.id)
            .filter(Lectura.fecha_hora >= before_from_value, Lectura.fecha_hora <= before_to_value)
            .order_by(Lectura.fecha_hora.asc())
            .all()
        )

        after_readings = (
            db.query(Lectura)
            .filter(Lectura.equipo_id == equipment.id)
            .filter(Lectura.fecha_hora >= after_from_value, Lectura.fecha_hora <= after_to_value)
            .order_by(Lectura.fecha_hora.asc())
            .all()
        )

        before_metrics = summarize_period(before_readings)
        after_metrics = summarize_period(after_readings)
        delta = build_delta(before_metrics, after_metrics)
        insight = interpret_comparison(before_metrics, after_metrics, delta)

        return LecturaComparisonOut(
            equipo_id=equipment.id,
            equipment_name=equipment.name,
            before=LecturaComparisonPeriodOut(**before_metrics.__dict__),
            after=LecturaComparisonPeriodOut(**after_metrics.__dict__),
            delta=LecturaComparisonDeltaOut(**delta.__dict__),
            status=insight.status,
            interpretation=insight.interpretation,
            has_enough_data=insight.has_enough_data,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=f"Error comparando lecturas: {str(exc)}")


@app.get("/lecturas/ultima", response_model=LecturaOut)
def ultima_lectura(
    equipo_id: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        query = db.query(Lectura)

        if equipo_id:
            query = query.filter(Lectura.equipo_id == equipo_id.strip())

        ultima = query.order_by(Lectura.fecha_hora.desc()).first()

        if not ultima:
            raise HTTPException(status_code=404, detail="No hay lecturas")

        return ultima
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=f"Error consultando ultima lectura: {str(exc)}")
