from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.repository.form_stats import aggregate_validation_stats
from app.schemas.form_stats import FormStatsFiltersApplied, FormStatsResponse


async def get_validation_stats(
    session: AsyncSession,
    *,
    municipio: str | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
) -> FormStatsResponse:
    cumple, no_cumple, sin_resultado = await aggregate_validation_stats(
        session,
        municipio=municipio,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )
    total = cumple + no_cumple + sin_resultado
    return FormStatsResponse(
        total=total,
        cumple=cumple,
        no_cumple=no_cumple,
        sin_resultado=sin_resultado,
        filtros_aplicados=FormStatsFiltersApplied(
            municipio=municipio,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
        ),
    )
