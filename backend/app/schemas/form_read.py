from typing import Any

from pydantic import BaseModel, Field


class FormReadItem(BaseModel):
    """Formulario persistido (lectura); las fotos son rutas en disco del servidor, no base64."""

    id_formulario: str
    id_perfil_encuestador: int | None = None
    fecha_hora: str
    fecha_actualizacion: str
    latitud: float
    longitud: float
    precision: float | None = Field(default=None, description="No almacenada en BD; null.")
    datos_formulario: dict[str, Any] = Field(default_factory=dict)
    fotos: list[Any] = Field(default_factory=list)


class FormListResponse(BaseModel):
    items: list[FormReadItem]


class FormSummaryItem(BaseModel):
    """Fila liviana para listados y búsqueda en servidor."""

    id_formulario: str
    id_perfil_encuestador: int | None = None
    fecha_hora: str
    fecha_actualizacion: str
    latitud: float
    longitud: float
    precision: float | None = Field(default=None, description="No almacenada en BD; null.")
    nombres_apellidos_encuestado: str = ""
    municipio: str = ""
    fecha_visita: str = ""
    resultado_validacion: str = ""
    missing_field_count: int = 0
    missing_photo_count: int = 0


class FormSearchResponse(BaseModel):
    items: list[FormSummaryItem]
    total: int
    limit: int
    offset: int
