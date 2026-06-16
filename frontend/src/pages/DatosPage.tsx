import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { useFormStats } from "@/hooks/useFormStats";
import { useFormMapPoints } from "@/hooks/useFormMapPoints";
import { useFormStatsMunicipios } from "@/hooks/useFormStatsMunicipios";
import { useFormStatsMonthly } from "@/hooks/useFormStatsMonthly";
import { DatosMapFilters } from "@/pages/datos/DatosMapFilters";
import { DatosFilters } from "@/pages/datos/DatosFilters";
import { DatosOfflineBanner } from "@/pages/datos/DatosOfflineBanner";
import { DatosReportSection } from "@/pages/datos/DatosReportSection";
import { MonthlyDiligenciasChart } from "@/pages/datos/MonthlyDiligenciasChart";
import { aggregateMonthlyStatsTodos } from "@/pages/datos/monthlyChartUtils";
import {
  MUNICIPIO_MENSUAL_TODOS,
  MonthlyDiligenciasFilters,
} from "@/pages/datos/MonthlyDiligenciasFilters";
import { ValidationStatsChart } from "@/pages/datos/ValidationStatsChart";
import type { FormStatsMonthlyQuery, FormStatsQuery } from "@/services/api";

import {
  getCurrentMonthIsoDateRange,
  getDefaultMonthlyAnio,
} from "@/pages/datos/datosDateDefaults";
import {
  getInitialDatosPageUiState,
  saveDatosPagePreferences,
} from "@/pages/datos/datosPagePreferences";

const FormulariosMapView = lazy(async () => {
  const mod = await import("@/pages/datos/FormulariosMapView");
  return { default: mod.FormulariosMapView };
});

export const DatosPage = () => {
  const online = useConnectivityStatus();
  const [initialUi] = useState(getInitialDatosPageUiState);
  const [openSections, setOpenSections] = useState(initialUi.openSections);
  const [municipio, setMunicipio] = useState(initialUi.municipio);
  const [fechaDesde, setFechaDesde] = useState(initialUi.fechaDesde);
  const [fechaHasta, setFechaHasta] = useState(initialUi.fechaHasta);

  const [anioMensual, setAnioMensual] = useState(initialUi.anioMensual);
  const [municipioMensual, setMunicipioMensual] = useState(initialUi.municipioMensual);
  const [mapMunicipios, setMapMunicipios] = useState(initialUi.mapMunicipios);
  const [mapMunicipiosInitialized, setMapMunicipiosInitialized] = useState(
    initialUi.mapMunicipiosInitialized,
  );
  const [mapFechaDesde, setMapFechaDesde] = useState(initialUi.mapFechaDesde);
  const [mapFechaHasta, setMapFechaHasta] = useState(initialUi.mapFechaHasta);

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

  const monthlyChartData = useMemo(() => {
    if (!monthlyData) {
      return null;
    }
    if (municipioMensual === MUNICIPIO_MENSUAL_TODOS) {
      return aggregateMonthlyStatsTodos(monthlyData);
    }
    return monthlyData;
  }, [monthlyData, municipioMensual]);

  const mapFilters = useMemo(
    () => ({
      municipios: [...mapMunicipios],
      fecha_desde: mapFechaDesde.trim(),
      fecha_hasta: mapFechaHasta.trim(),
    }),
    [mapMunicipios, mapFechaDesde, mapFechaHasta],
  );
  const {
    points: mapPoints,
    total: mapTotal,
    loadState: mapLoadState,
    isRefreshing: mapIsRefreshing,
    error: mapError,
    reload: reloadMapPoints,
  } = useFormMapPoints(mapFilters, online);

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
      setAnioMensual(getDefaultMonthlyAnio(anioOptions));
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

  useEffect(() => {
    if (municipiosLoadState !== "ready") {
      return;
    }
    if (!mapMunicipiosInitialized) {
      setMapMunicipios([...municipioOptions]);
      setMapMunicipiosInitialized(true);
      return;
    }

    setMapMunicipios((prev) => prev.filter((municipio) => municipioOptions.includes(municipio)));
  }, [
    mapMunicipiosInitialized,
    municipioOptions,
    municipiosLoadState,
  ]);

  const openSectionsKey = [...openSections].sort().join("|");
  const mapMunicipiosKey = mapMunicipios.join("|");

  useEffect(() => {
    saveDatosPagePreferences({
      openSections,
      municipio,
      fechaDesde,
      fechaHasta,
      anioMensual,
      municipioMensual,
      mapMunicipios,
      mapMunicipiosInitialized,
      mapFechaDesde,
      mapFechaHasta,
    });
  }, [
    openSectionsKey,
    municipio,
    fechaDesde,
    fechaHasta,
    anioMensual,
    municipioMensual,
    mapMunicipiosKey,
    mapMunicipiosInitialized,
    mapFechaDesde,
    mapFechaHasta,
  ]);

  const clearValidationFilters = () => {
    const { desde, hasta } = getCurrentMonthIsoDateRange();
    setMunicipio("");
    setFechaDesde(desde);
    setFechaHasta(hasta);
  };

  const clearMonthlyFilters = () => {
    setAnioMensual(getDefaultMonthlyAnio(anioOptions));
    setMunicipioMensual(MUNICIPIO_MENSUAL_TODOS);
  };

  const clearMapFilters = () => {
    const { desde, hasta } = getCurrentMonthIsoDateRange();
    setMapFechaDesde(desde);
    setMapFechaHasta(hasta);
    setMapMunicipios([...municipioOptions]);
  };

  const toggleMapMunicipio = (municipioName: string) => {
    setMapMunicipios((prev) =>
      prev.includes(municipioName)
        ? prev.filter((item) => item !== municipioName)
        : [...prev, municipioName],
    );
  };

  const setSectionOpen = (sectionId: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }
      return next;
    });
  };

  const refreshAll = () => {
    void reloadMunicipios();
    void reloadAnios();
    void reload();
    void reloadMonthly();
    void reloadMapPoints();
  };

  const anyLoading =
    loadState === "loading" ||
    (mapLoadState === "loading" && mapPoints.length === 0) ||
    monthlyLoadState === "loading" ||
    municipiosLoadState === "loading";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ee_0,_#f6f7f5_45%,_#f6f7f5_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 sm:mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/inicio">Regresar</Link>
            </Button>
            {online && !anyLoading ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshAll}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Actualizar
              </Button>
            ) : null}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-700 sm:text-xs sm:tracking-[0.35em]">
            NoSignal Survey
          </p>
          <h1 className="mt-1 text-xl font-semibold leading-tight text-slate-900 sm:mt-2 sm:text-3xl sm:leading-normal">
            Datos
          </h1>
          <p className="mt-1 text-xs leading-snug text-muted-foreground sm:mt-2 sm:text-sm sm:leading-normal">
            Estadísticas de formularios sincronizados en el servidor.
          </p>
        </header>

        {!online ? <DatosOfflineBanner /> : null}

        {online && loadState === "no_session" ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
            Iniciá sesión para ver estadísticas del servidor.
          </div>
        ) : null}

        <DatosReportSection
          ariaLabel="Mapa de formularios"
          title="Ubicación de formularios"
          description="Mapa con la coordenada GPS de cada formulario sincronizado. Los filtros de abajo aplican solo a este mapa."
          open={openSections.has("mapa")}
          onOpenChange={(isOpen) => setSectionOpen("mapa", isOpen)}
          filtersLabel="Filtros del mapa"
          filters={
            <DatosMapFilters
              municipioOptions={municipioOptions}
              selectedMunicipios={mapMunicipios}
              municipiosLoading={municipiosLoadState === "loading"}
              fechaDesde={mapFechaDesde}
              fechaHasta={mapFechaHasta}
              disabled={!online}
              onToggleMunicipio={toggleMapMunicipio}
              onSelectAllMunicipios={() => setMapMunicipios([...municipioOptions])}
              onClearMunicipios={() => setMapMunicipios([])}
              onChangeFechaDesde={setMapFechaDesde}
              onChangeFechaHasta={setMapFechaHasta}
              onClear={clearMapFilters}
            />
          }
        >
          <Suspense
            fallback={
              <p className="py-8 text-center text-sm text-slate-600">
                Cargando mapa…
              </p>
            }
          >
            <FormulariosMapView
              points={mapPoints}
              total={mapTotal}
              loadState={mapLoadState}
              isRefreshing={mapIsRefreshing}
              error={mapError}
              onRetry={() => void reloadMapPoints()}
            />
          </Suspense>
        </DatosReportSection>

        <DatosReportSection
          ariaLabel="Validación"
          title="Resultado de validación"
          description="Distribución de formularios según el campo «Resultado de validación». Los filtros de abajo aplican solo a este gráfico."
          open={openSections.has("validacion")}
          onOpenChange={(isOpen) => setSectionOpen("validacion", isOpen)}
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
          description="Cantidad de formularios por mes del año elegido, según la fecha de visita de cada registro (solo formularios con esa fecha registrada). Los filtros de abajo aplican solo a este gráfico."
          open={openSections.has("mensual")}
          onOpenChange={(isOpen) => setSectionOpen("mensual", isOpen)}
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
              No hay municipios ni formularios sin asociar para mostrar este gráfico.
            </p>
          ) : null}

          {online && monthlyLoadState === "ready" && monthlyChartData ? (
            <MonthlyDiligenciasChart data={monthlyChartData} />
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
