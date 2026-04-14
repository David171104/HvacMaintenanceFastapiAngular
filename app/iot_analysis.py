from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from statistics import fmean
from typing import Iterable, Sequence


@dataclass(frozen=True)
class PeriodMetrics:
    average_temperature: float | None
    average_humidity: float | None
    average_current: float | None
    readings_count: int
    first_reading_at: datetime | None
    last_reading_at: datetime | None


@dataclass(frozen=True)
class ComparisonDelta:
    temperature: float | None
    humidity: float | None
    current: float | None


@dataclass(frozen=True)
class ComparisonInsight:
    status: str
    interpretation: str
    has_enough_data: bool


def _round_or_none(value: float | None) -> float | None:
    return round(value, 2) if value is not None else None


def summarize_period(readings: Sequence[object]) -> PeriodMetrics:
    if not readings:
        return PeriodMetrics(
            average_temperature=None,
            average_humidity=None,
            average_current=None,
            readings_count=0,
            first_reading_at=None,
            last_reading_at=None,
        )

    ordered = sorted(readings, key=lambda item: item.fecha_hora)
    return PeriodMetrics(
        average_temperature=_round_or_none(fmean(item.temperatura for item in ordered)),
        average_humidity=_round_or_none(fmean(item.humedad for item in ordered)),
        average_current=_round_or_none(fmean(item.corriente for item in ordered)),
        readings_count=len(ordered),
        first_reading_at=ordered[0].fecha_hora,
        last_reading_at=ordered[-1].fecha_hora,
    )


def build_delta(before: PeriodMetrics, after: PeriodMetrics) -> ComparisonDelta:
    def compute(after_value: float | None, before_value: float | None) -> float | None:
        if after_value is None or before_value is None:
            return None
        return round(after_value - before_value, 2)

    return ComparisonDelta(
        temperature=compute(after.average_temperature, before.average_temperature),
        humidity=compute(after.average_humidity, before.average_humidity),
        current=compute(after.average_current, before.average_current),
    )


def interpret_comparison(before: PeriodMetrics, after: PeriodMetrics, delta: ComparisonDelta) -> ComparisonInsight:
    if before.readings_count == 0 or after.readings_count == 0:
        return ComparisonInsight(
            status="insufficient_data",
            interpretation="No hay evidencia suficiente para comparar ambos periodos.",
            has_enough_data=False,
        )

    current_delta = delta.current or 0
    temperature_delta = delta.temperature or 0

    if current_delta <= -0.25 and temperature_delta <= -0.5:
        return ComparisonInsight(
            status="improved",
            interpretation="Disminuyo el consumo de corriente y mejoro el comportamiento termico despues del mantenimiento.",
            has_enough_data=True,
        )

    if current_delta >= 0.25 and temperature_delta >= 0:
        return ComparisonInsight(
            status="worsened",
            interpretation="Hubo aumento de consumo sin mejora termica clara; conviene revisar la efectividad del mantenimiento.",
            has_enough_data=True,
        )

    if abs(current_delta) < 0.25 and abs(temperature_delta) < 0.5:
        return ComparisonInsight(
            status="stable",
            interpretation="No hay un cambio relevante entre el periodo previo y el posterior al mantenimiento.",
            has_enough_data=True,
        )

    if current_delta < 0 and temperature_delta >= 0:
        return ComparisonInsight(
            status="mixed",
            interpretation="Disminuyo la corriente, pero la respuesta termica no muestra una mejora clara.",
            has_enough_data=True,
        )

    if current_delta > 0 and temperature_delta < 0:
        return ComparisonInsight(
            status="mixed",
            interpretation="Mejoro el comportamiento termico, pero hubo aumento de corriente promedio; puede existir una condicion mixta.",
            has_enough_data=True,
        )

    return ComparisonInsight(
        status="mixed",
        interpretation="Hay cambios entre ambos periodos, pero no permiten una conclusion fuerte sin mas contexto operativo.",
        has_enough_data=True,
    )
