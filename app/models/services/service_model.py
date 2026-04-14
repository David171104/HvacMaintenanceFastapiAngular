from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, time

from app.models.validation_utils import (
    ADDRESS_MAX_LENGTH,
    ADDRESS_MIN_LENGTH,
    require_trimmed_text,
    validate_service_date_not_past,
    validate_service_time_range,
)


class Service(BaseModel):
    client_id: Optional[int] = None
    request_date: date
    request_time: time | None = None
    service_type: str
    address: str

    @field_validator("client_id")
    @classmethod
    def validate_client_id(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value <= 0:
            raise ValueError("El cliente es obligatorio.")
        return value

    @field_validator("request_date")
    @classmethod
    def validate_request_date(cls, value: date) -> date:
        return validate_service_date_not_past(value)

    @field_validator("request_time")
    @classmethod
    def validate_request_time(cls, value: time | None) -> time | None:
        return validate_service_time_range(value)

    @field_validator("service_type", mode="before")
    @classmethod
    def validate_service_type(cls, value: str) -> str:
        return require_trimmed_text(value, field_name="El tipo de servicio")

    @field_validator("address", mode="before")
    @classmethod
    def validate_address(cls, value: str) -> str:
        return require_trimmed_text(
            value,
            field_name="La direccion",
            min_length=ADDRESS_MIN_LENGTH,
            max_length=ADDRESS_MAX_LENGTH,
        )
