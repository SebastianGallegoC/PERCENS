from datetime import date

from pydantic import BaseModel, Field, model_validator


class FormStatsFiltersApplied(BaseModel):
    municipio: str | None = None
    fecha_desde: date | None = None
    fecha_hasta: date | None = None


class FormStatsResponse(BaseModel):
    total: int = Field(ge=0)
    cumple: int = Field(ge=0)
    no_cumple: int = Field(ge=0)
    sin_resultado: int = Field(ge=0)
    filtros_aplicados: FormStatsFiltersApplied


class FormStatsQueryParams(BaseModel):
    """Parámetros de consulta validados para estadísticas de formularios."""

    municipio: str | None = None
    fecha_desde: date | None = None
    fecha_hasta: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "FormStatsQueryParams":
        if (
            self.fecha_desde is not None
            and self.fecha_hasta is not None
            and self.fecha_desde > self.fecha_hasta
        ):
            raise ValueError("fecha_desde_must_be_lte_fecha_hasta")
        return self
