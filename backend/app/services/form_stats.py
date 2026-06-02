from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.repository.form_stats import (
    MES_ETIQUETAS,
    aggregate_monthly_diligencias,
    aggregate_validation_stats,
    list_distinct_anios_fecha_visita,
    list_distinct_municipios,
)
from app.schemas.form_stats import (
    FormStatsAniosResponse,
    FormStatsFiltersApplied,
    FormStatsMonthlyMunicipioSerie,
    FormStatsMonthlyResponse,
    FormStatsMunicipiosResponse,
    FormStatsResponse,
)


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


async def get_distinct_municipios(session: AsyncSession) -> FormStatsMunicipiosResponse:
    municipios = await list_distinct_municipios(session)
    return FormStatsMunicipiosResponse(municipios=municipios)


async def get_distinct_anios(session: AsyncSession) -> FormStatsAniosResponse:
    anios = await list_distinct_anios_fecha_visita(session)
    return FormStatsAniosResponse(anios=anios)


async def get_monthly_diligencias(
    session: AsyncSession,
    *,
    anio: int,
    municipios: list[str],
) -> FormStatsMonthlyResponse:
    rows = await aggregate_monthly_diligencias(
        session,
        anio=anio,
        municipios=municipios,
    )
    by_municipio: dict[str, list[int]] = {m: [0] * 12 for m in municipios}
    for municipio, mes, total in rows:
        if municipio in by_municipio:
            by_municipio[municipio][mes - 1] = total

    series = [
        FormStatsMonthlyMunicipioSerie(municipio=m, totales=by_municipio[m])
        for m in municipios
    ]
    total = sum(sum(s.totales) for s in series)
    return FormStatsMonthlyResponse(
        anio=anio,
        municipios=municipios,
        etiquetas_mes=list(MES_ETIQUETAS),
        series=series,
        total=total,
    )
