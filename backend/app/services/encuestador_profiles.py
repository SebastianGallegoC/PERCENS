from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.encuestador_profile import EncuestadorProfile
from app.repository.encuestador_profiles import (
    count_forms_grouped_by_profile_ids,
    count_forms_using_profile,
    create_profile,
    delete_profile,
    get_profile_for_user,
    list_enabled_profiles_for_user,
    list_profiles_for_user,
    save_profile,
)
from app.schemas.encuestador_profile import (
    EncuestadorProfileCreate,
    EncuestadorProfileLite,
    EncuestadorProfileRead,
    EncuestadorProfileUpdate,
)


def _iso(value: datetime | None) -> str:
    if value is None:
        return datetime.utcnow().isoformat()
    return value.isoformat()


def to_read_model(profile: EncuestadorProfile, *, formularios_asociados: int = 0) -> EncuestadorProfileRead:
    return EncuestadorProfileRead(
        id=profile.id,
        username_owner=profile.username_owner,
        nombres_apellidos_encuestador=profile.nombres_apellidos_encuestador,
        tipo_documento_encuestador=profile.tipo_documento_encuestador,
        numero_documento_encuestador=profile.numero_documento_encuestador,
        telefono_encuestador=profile.telefono_encuestador,
        cargo_encuestador=profile.cargo_encuestador,
        empresa_entidad_encuestador=profile.empresa_entidad_encuestador,
        firma_encuestador=profile.firma_encuestador,
        habilitado=bool(profile.habilitado),
        formularios_asociados=max(0, int(formularios_asociados)),
        created_at=_iso(profile.created_at),
        updated_at=_iso(profile.updated_at),
    )


def to_lite_model(profile: EncuestadorProfile) -> EncuestadorProfileLite:
    return EncuestadorProfileLite(id=profile.id, nombre=profile.nombres_apellidos_encuestador)


async def list_profile_reads(session: AsyncSession, username: str) -> list[EncuestadorProfileRead]:
    profiles = await list_profiles_for_user(session, username)
    profile_ids = [int(item.id) for item in profiles]
    form_counts = await count_forms_grouped_by_profile_ids(session, profile_ids)
    return [
        to_read_model(item, formularios_asociados=form_counts.get(int(item.id), 0))
        for item in profiles
    ]


async def list_enabled_profile_lites(session: AsyncSession, username: str) -> list[EncuestadorProfileLite]:
    profiles = await list_enabled_profiles_for_user(session, username)
    return [to_lite_model(item) for item in profiles]


async def create_profile_for_user(
    session: AsyncSession,
    username: str,
    payload: EncuestadorProfileCreate,
) -> EncuestadorProfileRead:
    created = await create_profile(
        session,
        EncuestadorProfile(
            username_owner=username,
            nombres_apellidos_encuestador=payload.nombres_apellidos_encuestador,
            tipo_documento_encuestador=payload.tipo_documento_encuestador,
            numero_documento_encuestador=payload.numero_documento_encuestador,
            telefono_encuestador=payload.telefono_encuestador,
            cargo_encuestador=payload.cargo_encuestador,
            empresa_entidad_encuestador=payload.empresa_entidad_encuestador,
            firma_encuestador=payload.firma_encuestador,
            habilitado=payload.habilitado,
        ),
    )
    return to_read_model(created)


async def update_profile_for_user(
    session: AsyncSession,
    username: str,
    profile_id: int,
    payload: EncuestadorProfileUpdate,
) -> EncuestadorProfileRead | None:
    profile = await get_profile_for_user(session, profile_id, username)
    if profile is None:
        return None
    profile.nombres_apellidos_encuestador = payload.nombres_apellidos_encuestador
    profile.tipo_documento_encuestador = payload.tipo_documento_encuestador
    profile.numero_documento_encuestador = payload.numero_documento_encuestador
    profile.telefono_encuestador = payload.telefono_encuestador
    profile.cargo_encuestador = payload.cargo_encuestador
    profile.empresa_entidad_encuestador = payload.empresa_entidad_encuestador
    profile.firma_encuestador = payload.firma_encuestador
    profile.habilitado = payload.habilitado
    saved = await save_profile(session, profile)
    return to_read_model(saved)


async def set_profile_enabled_for_user(
    session: AsyncSession,
    username: str,
    profile_id: int,
    enabled: bool,
) -> EncuestadorProfileRead | None:
    profile = await get_profile_for_user(session, profile_id, username)
    if profile is None:
        return None
    profile.habilitado = enabled
    saved = await save_profile(session, profile)
    return to_read_model(saved)


async def delete_profile_for_user(
    session: AsyncSession,
    username: str,
    profile_id: int,
) -> tuple[bool, str | None]:
    profile = await get_profile_for_user(session, profile_id, username)
    if profile is None:
        return False, "not_found"
    uses = await count_forms_using_profile(session, profile_id)
    if uses > 0:
        return False, "profile_in_use"
    await delete_profile(session, profile)
    return True, None


async def validate_profile_is_assignable(
    session: AsyncSession,
    username: str,
    profile_id: int,
) -> tuple[bool, str | None]:
    profile = await get_profile_for_user(session, profile_id, username)
    if profile is None:
        return False, "encuestador_profile_not_found"
    if not bool(profile.habilitado):
        return False, "encuestador_profile_disabled"
    return True, None


async def validate_profile_for_form_persist(
    session: AsyncSession,
    username: str,
    profile_id: int | None,
    *,
    existing_profile_id: int | None,
) -> tuple[bool, str | None]:
    """Permite conservar un perfil ya vinculado aunque esté deshabilitado; bloquea asignaciones nuevas."""
    if profile_id is None:
        return True, None
    if existing_profile_id is not None and existing_profile_id == profile_id:
        profile = await get_profile_for_user(session, profile_id, username)
        if profile is None:
            return False, "encuestador_profile_not_found"
        return True, None
    return await validate_profile_is_assignable(session, username, profile_id)
