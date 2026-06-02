import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { useFormStats } from "@/hooks/useFormStats";
import { useFormStatsMunicipios } from "@/hooks/useFormStatsMunicipios";
import { useFormStatsMonthly } from "@/hooks/useFormStatsMonthly";
import { DatosFilters } from "@/pages/datos/DatosFilters";
import { DatosOfflineBanner } from "@/pages/datos/DatosOfflineBanner";
import { MonthlyDiligenciasChart } from "@/pages/datos/MonthlyDiligenciasChart";
import { MonthlyDiligenciasFilters } from "@/pages/datos/MonthlyDiligenciasFilters";
import { ValidationStatsChart } from "@/pages/datos/ValidationStatsChart";
import type { FormStatsMonthlyQuery, FormStatsQuery } from "@/services/api";

export const DatosPage = () => {
  const online = useConnectivityStatus();
  const [municipio, setMunicipio] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [anioMensual, setAnioMensual] = useState(() => new Date().getFullYear());
  const [municipiosMensuales, setMunicipiosMensuales] = useState<string[]>([]);

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

  const monthlyQuery = useMemo(
    (): FormStatsMonthlyQuery => ({
      anio: anioMensual,
      municipios: municipiosMensuales,
    }),
    [anioMensual, municipiosMensuales],
  );

  const { stats, loadState, error, reload } = useFormStats(filters, online);
  const {
    municipios: municipioOptions,
    loadState: municipiosLoadState,
    reload: reloadMunicipios,
  } = useFormStatsMunicipios(online);
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
    if (municipiosLoadState !== "ready") {
      return;
    }
    setMunicipiosMensuales((prev) =>
      prev.filter((m) => municipioOptions.includes(m)),
    );
  }, [municipioOptions, municipiosLoadState]);

  const clearValidationFilters = () => {
    setMunicipio("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const clearMonthlyFilters = () => {
    setAnioMensual(anioOptions[0] ?? new Date().getFullYear());
    setMunicipiosMensuales([]);
  };

  const toggleMunicipioMensual = (name: string) => {
    setMunicipiosMensuales((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name],
    );
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

        <section className="mb-8" aria-label="Validación">
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

          {online && loadState === "error" ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
              No se pudieron cargar las estadísticas de validación:{" "}
              {error ?? "error desconocido"}.
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
            <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-12 text-center text-sm text-slate-600">
              Cargando validación…
            </div>
          ) : null}

          {online && loadState === "ready" && stats ? (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-slate-900">
                Resultado de validación
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Basado en el campo «Resultado de validación» de cada formulario.
              </p>
              <div className="mt-4">
                <ValidationStatsChart stats={stats} />
              </div>
            </div>
          ) : null}
        </section>

        <section aria-label="Diligencias mensuales">
          <MonthlyDiligenciasFilters
            anio={anioMensual}
            anioOptions={anioOptions}
            aniosLoading={aniosLoadState === "loading"}
            municipiosSeleccionados={municipiosMensuales}
            municipioOptions={municipioOptions}
            municipiosLoading={municipiosLoadState === "loading"}
            onChangeAnio={setAnioMensual}
            onToggleMunicipio={toggleMunicipioMensual}
            onSelectAllMunicipios={() =>
              setMunicipiosMensuales([...municipioOptions])
            }
            onClearMunicipios={() => setMunicipiosMensuales([])}
            onClear={clearMonthlyFilters}
            disabled={!online}
          />

          {online && monthlyLoadState === "error" ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
              No se pudieron cargar las diligencias mensuales:{" "}
              {monthlyError ?? "error desconocido"}.
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
            <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-12 text-center text-sm text-slate-600">
              Cargando diligencias mensuales…
            </div>
          ) : null}

          {online &&
          monthlyLoadState === "needs_municipios" &&
          municipiosMensuales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
              Elegí uno o más municipios en los filtros para ver el gráfico mensual.
            </div>
          ) : null}

          {online && monthlyLoadState === "ready" && monthlyData ? (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-slate-900">
                Formularios diligenciados por mes
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Conteo por mes del año {monthlyData.anio} según la fecha de visita
                de cada formulario.
              </p>
              <div className="mt-4">
                <MonthlyDiligenciasChart data={monthlyData} />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};
