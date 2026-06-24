from datetime import datetime
import unicodedata

from geoalchemy2 import WKTElement
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.form_record import FormRecord
from app.repository.forms import create_form, get_form_by_id
from app.schemas.form_payload import FormPayload
from app.services.encuestador_profiles import validate_profile_for_form_persist
from app.services.storage import normalize_stored_foto_paths, safe_delete_stored_photos, save_photos


def parse_fecha_hora_iso(value: str) -> datetime:
    """ISO 8601 desde el cliente (p. ej. toISOString() con 'Z'); compatible con Python < 3.11."""
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


def resolve_fecha_actualizacion_dt(payload: FormPayload) -> datetime:
    """Última modificación coherente con fecha_hora (primer envío); nunca antes por reloj descoordinado."""
    fecha_envio = parse_fecha_hora_iso(payload.fecha_hora)
    if not payload.fecha_actualizacion:
        return fecha_envio
    cand = parse_fecha_hora_iso(payload.fecha_actualizacion)
    return cand if cand >= fecha_envio else fecha_envio


def _normalize_fecha_visita(raw: object) -> str | None:
    if not isinstance(raw, str):
        return None
    value = raw.strip()
    if not value:
        return ""
    if len(value) == 10 and value[4] == "-" and value[7] == "-":
        return value
    if len(value) == 10 and value[2] == "/" and value[5] == "/":
        dd, mm, yyyy = value.split("/")
        if len(dd) == 2 and len(mm) == 2 and len(yyyy) == 4:
            return f"{yyyy}-{mm}-{dd}"
    try:
        parsed = parse_fecha_hora_iso(value)
        return parsed.date().isoformat()
    except ValueError:
        return None


def _distancia_seguridad_impide_cumplir(raw: object) -> bool:
    return isinstance(raw, str) and raw.strip().upper() == "NO"


def _apply_distancia_seguridad_rule(normalized: dict[str, object]) -> None:
    if not _distancia_seguridad_impide_cumplir(normalized.get("cumple_distancia_seguridad")):
        return
    normalized["resultado_validacion"] = "NO CUMPLE"


def _strip_accents(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(
        char for char in decomposed if unicodedata.category(char) != "Mn"
    )


def _normalize_vereda(raw: object) -> str | None:
    if not isinstance(raw, str):
        return None
    trimmed = raw.strip()
    if not trimmed:
        return ""
    return _strip_accents(trimmed).upper()


def normalize_datos_formulario_for_persist(
    datos_formulario: dict[str, object],
) -> dict[str, object]:
    normalized = dict(datos_formulario)
    normalized_fecha_visita = _normalize_fecha_visita(normalized.get("fecha_visita"))
    if normalized_fecha_visita is not None:
        normalized["fecha_visita"] = normalized_fecha_visita
    normalized_vereda = _normalize_vereda(normalized.get("vereda"))
    if normalized_vereda is not None:
        normalized["vereda"] = normalized_vereda
    _apply_distancia_seguridad_rule(normalized)
    return normalized


def _require_fecha_visita_in_datos(datos_formulario: dict[str, object]) -> None:
    raw = datos_formulario.get("fecha_visita")
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("fecha_visita_required")
    normalized = _normalize_fecha_visita(raw)
    if normalized is None:
        raise ValueError("fecha_visita_invalid")
    if normalized == "":
        raise ValueError("fecha_visita_required")


async def persist_form(
    session: AsyncSession,
    payload: FormPayload,
    _username: str,
) -> FormRecord:
    fecha_hora = parse_fecha_hora_iso(payload.fecha_hora)
    fecha_act = resolve_fecha_actualizacion_dt(payload)
    datos_formulario = normalize_datos_formulario_for_persist(
        dict(payload.datos_formulario)
    )
    _require_fecha_visita_in_datos(datos_formulario)
    gps_point = WKTElement(f"POINT({payload.gps.longitud} {payload.gps.latitud})", srid=4326)
    existing = await get_form_by_id(session, payload.id_formulario)
    existing_profile_id = existing.id_perfil_encuestador if existing else None
    if payload.id_perfil_encuestador is not None:
        profile_ok, profile_error = await validate_profile_for_form_persist(
            session,
            payload.id_perfil_encuestador,
            existing_profile_id=existing_profile_id,
        )
        if not profile_ok:
            raise ValueError(profile_error or "encuestador_profile_invalid")

    if existing:
        # Reenvío con el mismo id (p. ej. edición desde otro dispositivo): actualizar datos en BD.
        old_paths = normalize_stored_foto_paths(existing.fotos)
        if payload.fotos:
            safe_delete_stored_photos(old_paths)
            new_paths = save_photos(
                payload.id_formulario,
                payload.fotos,
                fecha_hora,
            )
            existing.fotos = new_paths
        existing.fecha_actualizacion = fecha_act
        existing.id_perfil_encuestador = payload.id_perfil_encuestador
        existing.gps = gps_point
        existing.datos_formulario = datos_formulario
        await session.commit()
        await session.refresh(existing)
        return existing

    fotos = (
        save_photos(payload.id_formulario, payload.fotos, fecha_hora)
        if payload.fotos
        else []
    )

    record = FormRecord(
        id_formulario=payload.id_formulario,
        id_perfil_encuestador=payload.id_perfil_encuestador,
        fecha_hora=fecha_hora,
        fecha_actualizacion=fecha_act,
        gps=gps_point,
        datos_formulario=datos_formulario,
        fotos=fotos,
    )

    return await create_form(session, record)
