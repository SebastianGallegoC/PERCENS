import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { useFormStats } from "@/hooks/useFormStats";
import { DatosFilters } from "@/pages/datos/DatosFilters";
import { DatosOfflineBanner } from "@/pages/datos/DatosOfflineBanner";
import { ValidationStatsChart } from "@/pages/datos/ValidationStatsChart";
import type { FormStatsQuery } from "@/services/api";

export const DatosPage = () => {
  const online = useConnectivityStatus();
  const [municipio, setMunicipio] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

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

  const clearFilters = () => {
    setMunicipio("");
    setFechaDesde("");
    setFechaHasta("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ee_0,_#f6f7f5_45%,_#f6f7f5_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
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
              Estadísticas de validación de formularios sincronizados en el servidor.
            </p>
          </div>
          {online && loadState !== "loading" ? (
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Actualizar
            </button>
          ) : null}
        </header>

        {!online ? <DatosOfflineBanner /> : null}

        <DatosFilters
          municipio={municipio}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          onChangeMunicipio={setMunicipio}
          onChangeFechaDesde={setFechaDesde}
          onChangeFechaHasta={setFechaHasta}
          onClear={clearFilters}
          disabled={!online}
        />

        {online && loadState === "no_session" ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
            Iniciá sesión para ver estadísticas del servidor.
          </div>
        ) : null}

        {online && loadState === "error" ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
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
          <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-12 text-center text-sm text-slate-600">
            Cargando estadísticas…
          </div>
        ) : null}

        {online && loadState === "ready" && stats ? (
          <section
            aria-label="Resultado de validación"
            className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Resultado de validación
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Basado en el campo «Resultado de validación» de cada formulario en el
              servidor.
            </p>
            <div className="mt-4">
              <ValidationStatsChart stats={stats} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};
