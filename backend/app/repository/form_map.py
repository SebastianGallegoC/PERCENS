import json
from datetime import date

from geoalchemy2.functions import ST_AsGeoJSON
from sqlalchemy import String, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.form_stats_municipio import MUNICIPIO_SIN_ASOCIAR
from app.models.form_record import FormRecord
from app.schemas.form_map import FormMapPointItem


def _json_text(key: str):
    return FormRecord.datos_formulario[key].as_string()


def _municipio_vacio():
    municipio_col = _json_text("municipio")
    return or_(municipio_col.is_(None), municipio_col == "")


async def list_form_map_points(
    session: AsyncSession,
    *,
    municipios: list[str],
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    resultado_validacion: str | None = None,
) -> list[FormMapPointItem]:
    municipio_col = _json_text("municipio")
    fecha_visita_col = _json_text("fecha_visita")

    filters = []
    normalized = [municipio.strip() for municipio in municipios if municipio and municipio.strip()]
    include_sin_asociar = MUNICIPIO_SIN_ASOCIAR in normalized
    named_municipios = [municipio for municipio in normalized if municipio != MUNICIPIO_SIN_ASOCIAR]

    if normalized:
        municipio_filters = []
        if named_municipios:
            municipio_filters.append(municipio_col.in_(named_municipios))
        if include_sin_asociar:
            municipio_filters.append(_municipio_vacio())
        filters.append(or_(*municipio_filters))

    if fecha_desde is not None:
        filters.extend(
            [
                fecha_visita_col.isnot(None),
                fecha_visita_col != "",
                fecha_visita_col >= fecha_desde.isoformat(),
            ]
        )
    if fecha_hasta is not None:
        filters.extend(
            [
                fecha_visita_col.isnot(None),
                fecha_visita_col != "",
                fecha_visita_col <= fecha_hasta.isoformat(),
            ]
        )

    if resultado_validacion:
        filters.append(
            _json_text("resultado_validacion") == resultado_validacion,
        )

    stmt = (
        select(
            FormRecord.id_formulario,
            cast(ST_AsGeoJSON(FormRecord.gps), String).label("geojson"),
            municipio_col.label("municipio"),
            fecha_visita_col.label("fecha_visita"),
            _json_text("nombres_apellidos_encuestado").label("nombres_apellidos_encuestado"),
            _json_text("resultado_validacion").label("resultado_validacion"),
            _json_text("informacion_vivienda").label("informacion_vivienda"),
        )
        .select_from(FormRecord)
    )
    if filters:
        stmt = stmt.where(*filters)
    result = await session.execute(stmt)

    items: list[FormMapPointItem] = []
    for row in result.mappings():
        geo = json.loads(row["geojson"])
        if geo.get("type") != "Point" or not isinstance(geo.get("coordinates"), list):
            continue
        coords = geo["coordinates"]
        if len(coords) < 2:
            continue
        longitud = float(coords[0])
        latitud = float(coords[1])
        if latitud == 0 and longitud == 0:
            continue
        municipio = str(row.get("municipio") or "").strip()
        items.append(
            FormMapPointItem(
                id_formulario=row["id_formulario"],
                latitud=latitud,
                longitud=longitud,
                municipio=municipio or MUNICIPIO_SIN_ASOCIAR,
                fecha_visita=str(row.get("fecha_visita") or "").strip(),
                nombres_apellidos_encuestado=str(
                    row.get("nombres_apellidos_encuestado") or ""
                ).strip(),
                resultado_validacion=str(row.get("resultado_validacion") or "").strip(),
                informacion_vivienda=str(row.get("informacion_vivienda") or "").strip(),
            )
        )
    return items
