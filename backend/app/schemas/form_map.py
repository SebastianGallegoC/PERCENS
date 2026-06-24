from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class FormMapPointsQueryParams(BaseModel):
    municipios: list[str] = Field(default_factory=list)
    fecha_desde: date | None = None
    fecha_hasta: date | None = None
    resultado_validacion: Literal["CUMPLE", "NO CUMPLE"] | None = None

    @model_validator(mode="after")
    def validate_query(self) -> "FormMapPointsQueryParams":
        if (
            self.fecha_desde is not None
            and self.fecha_hasta is not None
            and self.fecha_desde > self.fecha_hasta
        ):
            raise ValueError("fecha_desde_must_be_lte_fecha_hasta")

        seen: set[str] = set()
        normalized: list[str] = []
        for municipio in self.municipios:
            name = municipio.strip()
            if not name or name in seen:
                continue
            seen.add(name)
            normalized.append(name)
        self.municipios = normalized
        return self


class FormMapPointsFiltersApplied(BaseModel):
    municipios: list[str] = Field(default_factory=list)
    fecha_desde: date | None = None
    fecha_hasta: date | None = None
    resultado_validacion: Literal["CUMPLE", "NO CUMPLE"] | None = None


class FormMapPointItem(BaseModel):
    id_formulario: str
    latitud: float
    longitud: float
    municipio: str = ""
    fecha_visita: str = ""
    nombres_apellidos_encuestado: str = ""
    resultado_validacion: str = ""
    informacion_vivienda: str = ""


class FormMapPointsResponse(BaseModel):
    items: list[FormMapPointItem] = Field(default_factory=list)
    total: int = Field(ge=0)
    filtros_aplicados: FormMapPointsFiltersApplied
