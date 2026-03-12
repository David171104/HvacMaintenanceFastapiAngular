# ============================================================
# API IoT ESP32 (WiFi) + Neon PostgreSQL (Pooled)
# ============================================================

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sqlalchemy import create_engine, Column, Integer, Float, DateTime, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.exc import SQLAlchemyError
import datetime
import pytz
from dotenv import load_dotenv
import os

# ============================================================
# CONFIG DB (Neon pooled)
# ============================================================
load_dotenv()

DATABASE_URL = os.getenv("PG_URL")
if not DATABASE_URL:
    raise RuntimeError("No se encontró PG_URL en el archivo .env")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=1,      # pequeño porque Neon ya hace pooling
    max_overflow=0,
    pool_timeout=30,
    future=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# ============================================================
# MODELO SQLALCHEMY (tabla ya existente en Neon)
# ============================================================
class Lectura(Base):
    __tablename__ = "lecturas"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime, nullable=False)
    temperatura = Column(Float, nullable=False)
    humedad = Column(Float, nullable=False)
    corriente = Column(Float, nullable=False)

# ⚠️ IMPORTANTE:
# NO usar Base.metadata.create_all(bind=engine)
# La base ya fue importada a Neon.

# ============================================================
# SCHEMAS Pydantic
# ============================================================
class LecturaIn(BaseModel):
    temperatura: float
    humedad: float
    corriente: float

class LecturaOut(LecturaIn):
    id: int
    fecha_hora: datetime.datetime

    class Config:
        from_attributes = True  # Pydantic v2 (si usas v1, cambia a orm_mode = True)

# ============================================================
# FASTAPI CONFIG
# ============================================================
app = FastAPI(
    title="API IoT ESP32 (WiFi) - Neon",
    description="Recepción de lecturas IoT en PostgreSQL (Neon)",
    version="3.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

COLOMBIA_TZ = pytz.timezone("America/Bogota")

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
# HEALTH CHECK (útil para probar conexión)
# ============================================================
@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    
    
@app.get("/debug/db")
def debug_db():
    url = os.getenv("PG_URL", "")
    safe_url = url
    if "://" in safe_url and "@" in safe_url:
        # ocultar password
        left, right = safe_url.split("://", 1)
        creds_host = right.split("@", 1)
        if len(creds_host) == 2:
            creds, host = creds_host
            if ":" in creds:
                user = creds.split(":", 1)[0]
                safe_url = f"{left}://{user}:****@{host}"
    return {"pg_url": safe_url}


# ============================================================
# ENDPOINT PRINCIPAL (guardar lectura)
# ============================================================
@app.post("/lecturas", response_model=LecturaOut)
async def crear_lectura(
    lectura: LecturaIn,
    request: Request,
    db: Session = Depends(get_db)
):
    now = datetime.datetime.now(COLOMBIA_TZ)

    nueva = Lectura(
        fecha_hora=now,
        temperatura=lectura.temperatura,
        humedad=lectura.humedad,
        corriente=lectura.corriente
    )

    try:
        db.add(nueva)
        db.commit()
        db.refresh(nueva)

        print(
            f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] "
            f"IP {request.client.host} -> "
            f"T={lectura.temperatura}, H={lectura.humedad}, I={lectura.corriente}"
        )

        return nueva

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error guardando lectura: {str(e)}")

# ============================================================
# ENDPOINTS DE CONSULTA
# ============================================================
@app.get("/lecturas", response_model=List[LecturaOut])
def listar_lecturas(limit: int = 100, db: Session = Depends(get_db)):
    try:
        if limit < 1:
            limit = 1
        if limit > 1000:
            limit = 1000

        return (
            db.query(Lectura)
            .order_by(Lectura.fecha_hora.desc())
            .limit(limit)
            .all()
        )
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error consultando lecturas: {str(e)}")

@app.get("/lecturas/ultima", response_model=LecturaOut)
def ultima_lectura(db: Session = Depends(get_db)):
    try:
        ultima = (
            db.query(Lectura)
            .order_by(Lectura.fecha_hora.desc())
            .first()
        )
        if not ultima:
            raise HTTPException(status_code=404, detail="No hay lecturas")
        return ultima
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error consultando última lectura: {str(e)}")
