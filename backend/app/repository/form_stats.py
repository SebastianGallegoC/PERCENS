from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.form_record import FormRecord


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
