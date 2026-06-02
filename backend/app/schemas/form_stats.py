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


class FormStatsMunicipiosResponse(BaseModel):
    municipios: list[str] = Field(default_factory=list)


class FormStatsAniosResponse(BaseModel):
    anios: list[int] = Field(default_factory=list)


class FormStatsMonthlyMunicipioSerie(BaseModel):
    municipio: str
    totales: list[int] = Field(
        min_length=12,
        max_length=12,
        description="Conteo por mes (índice 0 = enero).",
    )


class FormStatsMonthlyResponse(BaseModel):
    anio: int
    municipios: list[str] = Field(default_factory=list)
    etiquetas_mes: list[str] = Field(default_factory=list)
    series: list[FormStatsMonthlyMunicipioSerie] = Field(default_factory=list)
    total: int = Field(ge=0)


class FormStatsMonthlyQueryParams(BaseModel):
    anio: int = Field(ge=2000, le=2100)
    municipios: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_municipios(self) -> "FormStatsMonthlyQueryParams":
        seen: set[str] = set()
        normalized: list[str] = []
        for m in self.municipios:
            s = m.strip()
            if not s or s in seen:
                continue
            seen.add(s)
            normalized.append(s)
        self.municipios = normalized
        return self


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
