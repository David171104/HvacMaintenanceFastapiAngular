from __future__ import annotations

from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from app.models.validation_utils import (
    CURRENT_MAX,
    CURRENT_MIN,
    HUMIDITY_MAX,
    HUMIDITY_MIN,
    OBSERVATION_MAX_LENGTH,
    TEMPERATURE_MAX,
    TEMPERATURE_MIN,
    optional_trimmed_text,
    require_trimmed_text,
    validate_not_future_datetime,
    validate_number_range,
)


class LecturaIn(BaseModel):
    temperatura: float
    humedad: float
    corriente: float
    fecha_hora_manual: datetime | None = Field(
        default=None,
        validation_alias=AliasChoices("fecha_hora_manual", "fecha_hora"),
    )
    equipo_id: str
    observacion: str | None = None

    @field_validator("temperatura", mode="before")
    @classmethod
    def validate_temperatura(cls, value: float) -> float:
        return validate_number_range(
            value,
            field_name="La temperatura",
            min_value=TEMPERATURE_MIN,
            max_value=TEMPERATURE_MAX,
        )

    @field_validator("humedad", mode="before")
    @classmethod
    def validate_humedad(cls, value: float) -> float:
        return validate_number_range(
            value,
            field_name="La humedad",
            min_value=HUMIDITY_MIN,
            max_value=HUMIDITY_MAX,
        )

    @field_validator("corriente", mode="before")
    @classmethod
    def validate_corriente(cls, value: float) -> float:
        return validate_number_range(
            value,
            field_name="La corriente",
            min_value=CURRENT_MIN,
            max_value=CURRENT_MAX,
        )

    @field_validator("fecha_hora_manual")
    @classmethod
    def validate_fecha_hora_manual(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return validate_not_future_datetime(value)

    @field_validator("equipo_id", mode="before")
    @classmethod
    def validate_equipo_id(cls, value: str) -> str:
        return require_trimmed_text(value, field_name="El equipo o minisplit")

    @field_validator("observacion", mode="before")
    @classmethod
    def validate_observacion(cls, value: str | None) -> str | None:
        return optional_trimmed_text(
            value,
            field_name="La observacion",
            max_length=OBSERVATION_MAX_LENGTH,
        )


class LecturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha_hora: datetime
    temperatura: float
    humedad: float
    corriente: float
    equipo_id: str | None = None
    observacion: str | None = None
    manual_entry: bool = False


class IoTEquipmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    location: str


class LecturaComparisonPeriodOut(BaseModel):
    average_temperature: float | None = None
    average_humidity: float | None = None
    average_current: float | None = None
    readings_count: int
    first_reading_at: datetime | None = None
    last_reading_at: datetime | None = None


class LecturaComparisonDeltaOut(BaseModel):
    temperature: float | None = None
    humidity: float | None = None
    current: float | None = None


class LecturaComparisonOut(BaseModel):
    equipo_id: str
    equipment_name: str
    before: LecturaComparisonPeriodOut
    after: LecturaComparisonPeriodOut
    delta: LecturaComparisonDeltaOut
    status: str
    interpretation: str
    has_enough_data: bool
