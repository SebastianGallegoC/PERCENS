from pydantic import BaseModel, Field


class EncuestadorProfileBase(BaseModel):
    nombres_apellidos_encuestador: str = Field(min_length=1, max_length=255)
    tipo_documento_encuestador: str = Field(min_length=1, max_length=255)
    numero_documento_encuestador: str = Field(min_length=1, max_length=255)
    telefono_encuestador: str = Field(min_length=1, max_length=255)
    cargo_encuestador: str = Field(min_length=1, max_length=255)
    empresa_entidad_encuestador: str = Field(min_length=1, max_length=255)
    firma_encuestador: str = Field(
        min_length=1,
        max_length=600_000,
        description="Imagen de firma (data URL JPEG) comprimida desde el cliente.",
    )


class EncuestadorProfileCreate(EncuestadorProfileBase):
    habilitado: bool = True


class EncuestadorProfileUpdate(EncuestadorProfileBase):
    habilitado: bool


class EncuestadorProfileEnabledUpdate(BaseModel):
    habilitado: bool


class EncuestadorProfileRead(EncuestadorProfileBase):
    id: int
    username_owner: str
    habilitado: bool
    created_at: str
    updated_at: str


class EncuestadorProfileLite(BaseModel):
    id: int
    nombre: str


class EncuestadorProfileListResponse(BaseModel):
    items: list[EncuestadorProfileRead]


class EncuestadorProfileLiteListResponse(BaseModel):
    items: list[EncuestadorProfileLite]
