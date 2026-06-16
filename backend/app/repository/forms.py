import json

from geoalchemy2.functions import ST_AsGeoJSON
from sqlalchemy import String, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.schema_flags import forms_has_fecha_actualizacion
from app.models.form_record import FormRecord
from app.schemas.form_read import FormReadItem, FormSummaryItem
from app.services.form_completeness import compute_missing_pending_summary
from app.services.storage import (
    fotos_json_for_api_list,
    normalize_stored_foto_paths,
    safe_delete_stored_photos,
)


async def get_form_by_id(session: AsyncSession, form_id: str) -> FormRecord | None:
    result = await session.execute(select(FormRecord).where(FormRecord.id_formulario == form_id))
    return result.scalars().first()


async def get_form_fotos_paths_by_id(session: AsyncSession, form_id: str) -> list[str] | None:
    """Solo la columna `fotos` (evita cargar GPS, datos_formulario, etc. en cada miniatura)."""
    result = await session.execute(select(FormRecord.fotos).where(FormRecord.id_formulario == form_id))
    raw = result.scalar_one_or_none()
    if raw is None:
        return None
    return normalize_stored_foto_paths(raw)


async def create_form(session: AsyncSession, record: FormRecord) -> FormRecord:
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def delete_form(session: AsyncSession, form_id: str) -> bool:
    """Borra la fila en BD y luego intenta borrar archivos de foto en disco."""
    record = await get_form_by_id(session, form_id)
    if record is None:
        return False
    paths = normalize_stored_foto_paths(record.fotos)
    await session.delete(record)
    await session.commit()
    safe_delete_stored_photos(paths)
    return True


def _mapping_to_form_read_item(row) -> FormReadItem | None:
    geo = json.loads(row["geojson"])
    if geo.get("type") != "Point" or not isinstance(geo.get("coordinates"), list):
        return None
    coords = geo["coordinates"]
    if len(coords) < 2:
        return None
    lon, lat = float(coords[0]), float(coords[1])
    fh = row["fecha_hora"]
    fa = row.get("fecha_actualizacion") or fh
    fecha_iso = fh.isoformat() if hasattr(fh, "isoformat") else str(fh)
    fecha_actualizacion_iso = fa.isoformat() if hasattr(fa, "isoformat") else str(fa)
    datos = row["datos_formulario"] if isinstance(row["datos_formulario"], dict) else {}
    fotos_list = fotos_json_for_api_list(row["fotos"])
    return FormReadItem(
        id_formulario=row["id_formulario"],
        id_perfil_encuestador=row.get("id_perfil_encuestador"),
        fecha_hora=fecha_iso,
        fecha_actualizacion=fecha_actualizacion_iso,
        latitud=lat,
        longitud=lon,
        precision=None,
        datos_formulario=datos,
        fotos=fotos_list,
    )


async def get_form_for_read_by_id(session: AsyncSession, form_id: str) -> FormReadItem | None:
    cols = (
        FormRecord.id_formulario,
        FormRecord.id_perfil_encuestador,
        FormRecord.fecha_hora,
        FormRecord.datos_formulario,
        FormRecord.fotos,
        cast(ST_AsGeoJSON(FormRecord.gps), String).label("geojson"),
    )
    if forms_has_fecha_actualizacion:
        cols = cols + (FormRecord.fecha_actualizacion,)
    stmt = select(*cols).where(FormRecord.id_formulario == form_id).limit(1)
    result = await session.execute(stmt)
    row = result.mappings().first()
    if row is None:
        return None
    return _mapping_to_form_read_item(row)


async def list_forms_for_read(session: AsyncSession, limit: int) -> list[FormReadItem]:
    cols = (
        FormRecord.id_formulario,
        FormRecord.id_perfil_encuestador,
        FormRecord.fecha_hora,
        FormRecord.datos_formulario,
        FormRecord.fotos,
        cast(ST_AsGeoJSON(FormRecord.gps), String).label("geojson"),
    )
    if forms_has_fecha_actualizacion:
        cols = cols + (FormRecord.fecha_actualizacion,)
    stmt = select(*cols).order_by(FormRecord.fecha_hora.desc()).limit(limit)
    result = await session.execute(stmt)
    items: list[FormReadItem] = []
    for row in result.mappings():
        item = _mapping_to_form_read_item(row)
        if item is not None:
            items.append(item)
    return items


def _json_text_value(key: str):
    return FormRecord.datos_formulario[key].as_string()


async def search_forms_summary(
    session: AsyncSession,
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    municipio: str | None = None,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
) -> tuple[list[FormSummaryItem], int]:
    nombre_col = _json_text_value("nombres_apellidos_encuestado")
    municipio_col = _json_text_value("municipio")
    fecha_visita_col = _json_text_value("fecha_visita")
    resultado_col = _json_text_value("resultado_validacion")

    filters = []
    q_norm = (q or "").strip()
    if q_norm:
        filters.append(func.lower(func.coalesce(nombre_col, "")).contains(q_norm.lower()))

    municipio_norm = (municipio or "").strip()
    if municipio_norm:
        filters.append(municipio_col == municipio_norm)

    if fecha_desde:
        filters.extend(
            [
                fecha_visita_col.isnot(None),
                fecha_visita_col != "",
                fecha_visita_col >= fecha_desde,
            ]
        )
    if fecha_hasta:
        filters.extend(
            [
                fecha_visita_col.isnot(None),
                fecha_visita_col != "",
                fecha_visita_col <= fecha_hasta,
            ]
        )

    count_stmt = select(func.count()).select_from(FormRecord)
    data_stmt = select(
        FormRecord.id_formulario,
        FormRecord.id_perfil_encuestador,
        FormRecord.fecha_hora,
        FormRecord.fecha_actualizacion,
        FormRecord.datos_formulario,
        FormRecord.fotos,
        cast(ST_AsGeoJSON(FormRecord.gps), String).label("geojson"),
        nombre_col.label("nombres_apellidos_encuestado"),
        municipio_col.label("municipio"),
        fecha_visita_col.label("fecha_visita"),
        resultado_col.label("resultado_validacion"),
    )
    if filters:
        count_stmt = count_stmt.where(*filters)
        data_stmt = data_stmt.where(*filters)
    data_stmt = data_stmt.order_by(FormRecord.fecha_hora.desc()).offset(offset).limit(limit)

    total = int((await session.execute(count_stmt)).scalar_one() or 0)
    result = await session.execute(data_stmt)

    items: list[FormSummaryItem] = []
    for row in result.mappings():
        geo = json.loads(row["geojson"])
        if geo.get("type") != "Point" or not isinstance(geo.get("coordinates"), list):
            continue
        coords = geo["coordinates"]
        if len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        fh = row["fecha_hora"]
        fa = row.get("fecha_actualizacion") or fh
        fecha_iso = fh.isoformat() if hasattr(fh, "isoformat") else str(fh)
        fecha_actualizacion_iso = fa.isoformat() if hasattr(fa, "isoformat") else str(fa)
        datos = row["datos_formulario"] if isinstance(row["datos_formulario"], dict) else {}
        id_perfil = row.get("id_perfil_encuestador")
        missing_fields, missing_photos = compute_missing_pending_summary(
            datos,
            latitud=lat,
            longitud=lon,
            id_perfil_encuestador=id_perfil,
            fotos_raw=row.get("fotos"),
        )
        items.append(
            FormSummaryItem(
                id_formulario=row["id_formulario"],
                id_perfil_encuestador=id_perfil,
                fecha_hora=fecha_iso,
                fecha_actualizacion=fecha_actualizacion_iso,
                latitud=lat,
                longitud=lon,
                precision=None,
                nombres_apellidos_encuestado=(row.get("nombres_apellidos_encuestado") or "").strip(),
                municipio=(row.get("municipio") or "").strip(),
                fecha_visita=(row.get("fecha_visita") or "").strip(),
                resultado_validacion=(row.get("resultado_validacion") or "").strip(),
                missing_field_count=missing_fields,
                missing_photo_count=missing_photos,
            )
        )
    return items, total
