import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { useFormStats } from "@/hooks/useFormStats";
import { useFormStatsMunicipios } from "@/hooks/useFormStatsMunicipios";
import { useFormStatsMonthly } from "@/hooks/useFormStatsMonthly";
import { DatosFilters } from "@/pages/datos/DatosFilters";
import { DatosOfflineBanner } from "@/pages/datos/DatosOfflineBanner";
import { DatosReportSection } from "@/pages/datos/DatosReportSection";
import { MonthlyDiligenciasChart } from "@/pages/datos/MonthlyDiligenciasChart";
import {
  MUNICIPIO_MENSUAL_TODOS,
  MonthlyDiligenciasFilters,
} from "@/pages/datos/MonthlyDiligenciasFilters";
import { ValidationStatsChart } from "@/pages/datos/ValidationStatsChart";
import type { FormStatsMonthlyQuery, FormStatsQuery } from "@/services/api";

export const DatosPage = () => {
  const online = useConnectivityStatus();
  const [municipio, setMunicipio] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [anioMensual, setAnioMensual] = useState(() => new Date().getFullYear());
  const [municipioMensual, setMunicipioMensual] = useState(MUNICIPIO_MENSUAL_TODOS);

  const filters = useMemo((): FormStatsQuery => {
    const q: FormStatsQuery = {};
    if (municipio.trim()) {
      q.municipio = municipio.trim();
    }
    if (fechaDesde.trim()) {
      q.fecha_desde = fechaDesde.trim();
    }
    if (fechaHasta.trim()) {
      q.fecha_hasta = fechaHasta.trim();
    }
    return q;
  }, [municipio, fechaDesde, fechaHasta]);

  const { stats, loadState, error, reload } = useFormStats(filters, online);
  const {
    municipios: municipioOptions,
    loadState: municipiosLoadState,
    reload: reloadMunicipios,
  } = useFormStatsMunicipios(online);

  const monthlyQuery = useMemo((): FormStatsMonthlyQuery => {
    if (municipiosLoadState !== "ready" || municipioOptions.length === 0) {
      return { anio: anioMensual, municipios: [] };
    }
    const municipios =
      municipioMensual === MUNICIPIO_MENSUAL_TODOS
        ? [...municipioOptions]
        : [municipioMensual];
    return { anio: anioMensual, municipios };
  }, [anioMensual, municipioMensual, municipioOptions, municipiosLoadState]);

  const {
    data: monthlyData,
    anios: anioOptions,
    aniosLoadState,
    loadState: monthlyLoadState,
    error: monthlyError,
    reload: reloadMonthly,
    reloadAnios,
  } = useFormStatsMonthly(monthlyQuery, online);

  useEffect(() => {
    if (
      municipio &&
      municipiosLoadState === "ready" &&
      !municipioOptions.includes(municipio)
    ) {
      setMunicipio("");
    }
  }, [municipio, municipioOptions, municipiosLoadState]);

  useEffect(() => {
    if (aniosLoadState !== "ready" || anioOptions.length === 0) {
      return;
    }
    if (!anioOptions.includes(anioMensual)) {
      setAnioMensual(anioOptions[0]);
    }
  }, [aniosLoadState, anioOptions, anioMensual]);

  useEffect(() => {
    if (
      municipioMensual !== MUNICIPIO_MENSUAL_TODOS &&
      municipiosLoadState === "ready" &&
      !municipioOptions.includes(municipioMensual)
    ) {
      setMunicipioMensual(MUNICIPIO_MENSUAL_TODOS);
    }
  }, [municipioMensual, municipioOptions, municipiosLoadState]);

  const clearValidationFilters = () => {
    setMunicipio("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const clearMonthlyFilters = () => {
    setAnioMensual(anioOptions[0] ?? new Date().getFullYear());
    setMunicipioMensual(MUNICIPIO_MENSUAL_TODOS);
  };

  const refreshAll = () => {
    void reloadMunicipios();
    void reloadAnios();
    void reload();
    void reloadMonthly();
  };

  const anyLoading =
    loadState === "loading" ||
    monthlyLoadState === "loading" ||
    municipiosLoadState === "loading";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ee_0,_#f6f7f5_45%,_#f6f7f5_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/inicio"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Inicio
            </Link>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-700 sm:text-xs">
              NoSignal Survey
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
              Datos
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Estadísticas de formularios sincronizados en el servidor.
            </p>
          </div>
          {online && !anyLoading ? (
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Actualizar
            </button>
          ) : null}
        </header>

        {!online ? <DatosOfflineBanner /> : null}

        {online && loadState === "no_session" ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
            Iniciá sesión para ver estadísticas del servidor.
          </div>
        ) : null}

        <DatosReportSection
          ariaLabel="Validación"
          title="Resultado de validación"
          description="Distribución de formularios según el campo «Resultado de validación». Los filtros de abajo aplican solo a este gráfico."
          filters={
            <DatosFilters
              municipio={municipio}
              municipioOptions={municipioOptions}
              municipiosLoading={municipiosLoadState === "loading"}
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              onChangeMunicipio={setMunicipio}
              onChangeFechaDesde={setFechaDesde}
              onChangeFechaHasta={setFechaHasta}
              onClear={clearValidationFilters}
              disabled={!online}
            />
          }
        >
          {online && loadState === "error" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
              No se pudieron cargar las estadísticas: {error ?? "error desconocido"}.
              <button
                type="button"
                onClick={() => void reload()}
                className="ml-2 font-medium underline"
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {online && loadState === "loading" ? (
            <p className="py-8 text-center text-sm text-slate-600">
              Cargando gráfico…
            </p>
          ) : null}

          {online && loadState === "ready" && stats ? (
            <ValidationStatsChart stats={stats} />
          ) : null}

          {!online ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Conectate a internet para ver este gráfico.
            </p>
          ) : null}
        </DatosReportSection>

        <DatosReportSection
          ariaLabel="Diligencias mensuales"
          title="Formularios diligenciados por mes"
          description="Cantidad de formularios por mes del año elegido, según la fecha de visita de cada registro. Los filtros de abajo aplican solo a este gráfico."
          filters={
            <MonthlyDiligenciasFilters
              anio={anioMensual}
              anioOptions={anioOptions}
              aniosLoading={aniosLoadState === "loading"}
              municipio={municipioMensual}
              municipioOptions={municipioOptions}
              municipiosLoading={municipiosLoadState === "loading"}
              onChangeAnio={setAnioMensual}
              onChangeMunicipio={setMunicipioMensual}
              onClear={clearMonthlyFilters}
              disabled={!online}
            />
          }
        >
          {online && monthlyLoadState === "error" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
              No se pudieron cargar los datos: {monthlyError ?? "error desconocido"}.
              <button
                type="button"
                onClick={() => void reloadMonthly()}
                className="ml-2 font-medium underline"
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {online && monthlyLoadState === "loading" ? (
            <p className="py-8 text-center text-sm text-slate-600">
              Cargando gráfico…
            </p>
          ) : null}

          {online &&
          municipiosLoadState === "ready" &&
          municipioOptions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
              No hay formularios con municipio registrado para mostrar este gráfico.
            </p>
          ) : null}

          {online && monthlyLoadState === "ready" && monthlyData ? (
            <MonthlyDiligenciasChart data={monthlyData} />
          ) : null}

          {!online ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Conectate a internet para ver este gráfico.
            </p>
          ) : null}
        </DatosReportSection>
      </div>
    </div>
  );
};
