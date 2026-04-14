from __future__ import annotations

import re
import math
from datetime import date, datetime, time
from typing import Any

PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !\"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]).+$"
)
PHONE_REGEX = re.compile(r"^\+?[0-9\s()-]{7,20}$")
PERSON_NAME_REGEX = re.compile(r"^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$")

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 64
TEXT_SHORT_MIN_LENGTH = 2
TEXT_MEDIUM_MIN_LENGTH = 3
TEXT_MAX_LENGTH = 120
MESSAGE_MAX_LENGTH = 500
ADDRESS_MIN_LENGTH = 8
ADDRESS_MAX_LENGTH = 180
OBSERVATION_MAX_LENGTH = 280
AGE_MIN = 18
AGE_MAX = 100
TEMPERATURE_MIN = -10
TEMPERATURE_MAX = 80
HUMIDITY_MIN = 0
HUMIDITY_MAX = 100
CURRENT_MIN = 0
CURRENT_MAX = 100
SERVICE_START_HOUR = time(8, 0)
SERVICE_END_HOUR = time(17, 0)


def _as_trimmed_string(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return value.strip()


def require_trimmed_text(
    value: Any,
    *,
    field_name: str,
    min_length: int | None = None,
    max_length: int | None = None,
) -> str:
    normalized = _as_trimmed_string(value)

    if not normalized:
        raise ValueError(f"{field_name} no puede estar vacio.")

    if min_length is not None and len(normalized) < min_length:
        raise ValueError(f"{field_name} debe tener al menos {min_length} caracteres.")

    if max_length is not None and len(normalized) > max_length:
        raise ValueError(f"{field_name} no puede superar {max_length} caracteres.")

    return normalized


def optional_trimmed_text(
    value: Any,
    *,
    field_name: str,
    min_length: int | None = None,
    max_length: int | None = None,
) -> str | None:
    if value is None:
        return None

    normalized = _as_trimmed_string(value)

    if not normalized:
        return None

    if min_length is not None and len(normalized) < min_length:
        raise ValueError(f"{field_name} debe tener al menos {min_length} caracteres.")

    if max_length is not None and len(normalized) > max_length:
        raise ValueError(f"{field_name} no puede superar {max_length} caracteres.")

    return normalized


def validate_password_strength(value: Any) -> str:
    normalized = require_trimmed_text(
        value,
        field_name="La contrasena",
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
    )

    if not PASSWORD_REGEX.match(normalized):
        raise ValueError(
            "La contrasena debe incluir mayuscula, minuscula, numero y caracter especial."
        )

    return normalized


def validate_person_name(value: Any, *, field_name: str) -> str:
    normalized = require_trimmed_text(
        value,
        field_name=field_name,
        min_length=TEXT_SHORT_MIN_LENGTH,
        max_length=TEXT_MAX_LENGTH,
    )

    if not PERSON_NAME_REGEX.fullmatch(normalized):
        raise ValueError(f"{field_name} solo debe contener letras y espacios.")

    return normalized


def validate_numeric_string(value: Any, *, field_name: str, max_length: int | None = None) -> str | None:
    normalized = optional_trimmed_text(value, field_name=field_name, max_length=max_length)

    if normalized is None:
        return None

    if not normalized.isdigit():
        raise ValueError(f"{field_name} solo debe contener digitos.")

    return normalized


def validate_age(value: Any) -> int | None:
    if value is None or value == "":
        return None

    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return None
        value = trimmed

    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("La edad debe ser un numero valido.") from exc

    if parsed < AGE_MIN or parsed > AGE_MAX:
        raise ValueError(f"La edad debe estar entre {AGE_MIN} y {AGE_MAX}.")

    return parsed


def validate_phone(value: Any) -> str:
    normalized = require_trimmed_text(value, field_name="El telefono")
    digits = re.sub(r"\D", "", normalized)

    if not PHONE_REGEX.match(normalized) or len(digits) < 7 or len(digits) > 15:
        raise ValueError("El telefono no es valido.")

    return normalized


def validate_service_date_not_past(value: date) -> date:
    if value < date.today():
        raise ValueError("La fecha del servicio no puede ser pasada.")
    return value


def validate_service_time_range(value: time | None) -> time | None:
    if value is None:
        return value

    if value < SERVICE_START_HOUR or value > SERVICE_END_HOUR:
        raise ValueError("La hora del servicio debe estar entre 08:00 y 17:00.")

    return value


def validate_number_range(value: Any, *, field_name: str, min_value: float, max_value: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} debe ser un numero valido.") from exc

    if not math.isfinite(parsed):
        raise ValueError(f"{field_name} debe ser un numero valido.")

    if parsed < min_value or parsed > max_value:
        raise ValueError(f"{field_name} debe estar entre {min_value} y {max_value}.")

    return parsed


def validate_not_future_datetime(value: datetime) -> datetime:
    if value > datetime.now(value.tzinfo):
        raise ValueError("La fecha y hora de la lectura no puede ser futura.")
    return value


def format_validation_errors(exc: Exception) -> tuple[str, list[dict[str, Any]]]:
    errors = getattr(exc, "errors", lambda: [])()
    formatted: list[str] = []

    for error in errors:
        loc = error.get("loc", ())
        field_path = ".".join(str(part) for part in loc if part != "body")
        message = error.get("msg", "Valor invalido.")
        formatted.append(f"{field_path}: {message}" if field_path else message)

    detail = " | ".join(formatted) if formatted else "Solicitud invalida."
    return detail, errors
