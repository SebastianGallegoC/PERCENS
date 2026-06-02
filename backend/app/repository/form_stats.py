from datetime import date

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.form_record import FormRecord

MES_ETIQUETAS = (
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
)


def _json_text(key: str):
    return FormRecord.datos_formulario[key].as_string()


async def aggregate_validation_stats(
    session: AsyncSession,
    *,
    municipio: str | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
) -> tuple[int, int, int]:
    """
    Devuelve (cumple, no_cumple, sin_resultado) según filtros opcionales.
    """
    resultado = _json_text("resultado_validacion")
    municipio_col = _json_text("municipio")
    fecha_visita = _json_text("fecha_visita")

    stmt = select(
        func.count().filter(resultado == "CUMPLE").label("cumple"),
        func.count().filter(resultado == "NO CUMPLE").label("no_cumple"),
        func.count().filter(
            (resultado.is_(None))
            | (resultado == "")
            | (~resultado.in_(["CUMPLE", "NO CUMPLE"]))
        ).label("sin_resultado"),
    ).select_from(FormRecord)

    if municipio:
        stmt = stmt.where(municipio_col == municipio)

    if fecha_desde is not None:
        desde = fecha_desde.isoformat()
        stmt = stmt.where(
            fecha_visita.isnot(None),
            fecha_visita != "",
            fecha_visita >= desde,
        )

    if fecha_hasta is not None:
        hasta = fecha_hasta.isoformat()
        stmt = stmt.where(
            fecha_visita.isnot(None),
            fecha_visita != "",
            fecha_visita <= hasta,
        )

    result = await session.execute(stmt)
    row = result.one()
    cumple = int(row.cumple or 0)
    no_cumple = int(row.no_cumple or 0)
    sin_resultado = int(row.sin_resultado or 0)
    return cumple, no_cumple, sin_resultado


async def list_distinct_municipios(session: AsyncSession) -> list[str]:
    """Municipios no vacíos presentes en al menos un formulario sincronizado."""
    municipio_col = _json_text("municipio")
    stmt = (
        select(municipio_col)
        .select_from(FormRecord)
        .where(municipio_col.isnot(None), municipio_col != "")
        .distinct()
        .order_by(municipio_col)
    )
    result = await session.execute(stmt)
    return [str(row[0]).strip() for row in result.all() if row[0] and str(row[0]).strip()]


def _fecha_visita_valida():
    fecha_visita = _json_text("fecha_visita")
    return (
        fecha_visita.isnot(None),
        fecha_visita != "",
        func.length(fecha_visita) >= 10,
        func.substring(fecha_visita, 5, 1) == "-",
        func.substring(fecha_visita, 8, 1) == "-",
    )


async def list_distinct_anios_fecha_visita(session: AsyncSession) -> list[int]:
    fecha_visita = _json_text("fecha_visita")
    anio_txt = func.substring(fecha_visita, 1, 4)
    stmt = (
        select(anio_txt)
        .select_from(FormRecord)
        .where(*_fecha_visita_valida())
        .distinct()
        .order_by(anio_txt.desc())
    )
    result = await session.execute(stmt)
    anios: list[int] = []
    for row in result.all():
        raw = row[0]
        if raw is None:
            continue
        try:
            anios.append(int(str(raw).strip()))
        except ValueError:
            continue
    return anios


async def aggregate_monthly_diligencias(
    session: AsyncSession,
    *,
    anio: int,
    municipios: list[str],
) -> list[tuple[str, int, int]]:
    """
    Devuelve filas (municipio, mes 1-12, total) para el año y municipios dados.
  """
    if not municipios:
        return []

    fecha_visita = _json_text("fecha_visita")
    municipio_col = _json_text("municipio")
    anio_txt = str(anio)
    mes_col = cast(func.substring(fecha_visita, 6, 2), Integer)

    stmt = (
        select(
            municipio_col.label("municipio"),
            mes_col.label("mes"),
            func.count().label("total"),
        )
        .select_from(FormRecord)
        .where(
            *_fecha_visita_valida(),
            func.substring(fecha_visita, 1, 4) == anio_txt,
            municipio_col.in_(municipios),
            mes_col >= 1,
            mes_col <= 12,
        )
        .group_by(municipio_col, mes_col)
    )
    result = await session.execute(stmt)
    rows: list[tuple[str, int, int]] = []
    for row in result.all():
        municipio = str(row.municipio or "").strip()
        mes = int(row.mes or 0)
        total = int(row.total or 0)
        if municipio and 1 <= mes <= 12:
            rows.append((municipio, mes, total))
    return rows
