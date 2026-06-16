import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import { municipioFilterLabel } from "@/constants/formStatsMunicipio";
import type { FormMapPointItem } from "@/services/api";
import { spreadMapPoints } from "@/pages/datos/mapPointSpread";

function isMapUsable(map: L.Map): boolean {
  try {
    const container = map.getContainer();
    return Boolean(container?.isConnected);
  } catch {
    return false;
  }
}

/** Evita errores de Leaflet cuando el mapa se desmonta durante navegación o colapso de sección. */
function safeMapCall(map: L.Map, operation: () => void): void {
  if (!isMapUsable(map)) {
    return;
  }
  try {
    operation();
  } catch {
    // El contenedor o los panes ya fueron eliminados del DOM.
  }
}

interface FormulariosMapViewProps {
  points: FormMapPointItem[];
  total: number;
  loadState:
    | "idle"
    | "loading"
    | "ready"
    | "error"
    | "offline"
    | "needs_municipios"
    | "no_session";
  isRefreshing?: boolean;
  error: string | null;
  onRetry: () => void;
  /** Cuando la sección está colapsada el mapa no debe montarse (evita errores de Leaflet). */
  sectionOpen?: boolean;
}

function markerColor(resultado: string): string {
  if (resultado === "CUMPLE") {
    return "#16a34a";
  }
  if (resultado === "NO CUMPLE") {
    return "#dc2626";
  }
  return "#64748b";
}

function createMarkerIcon(resultado: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:12px;height:12px;border-radius:9999px;background:${markerColor(
      resultado,
    )};border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.22);"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function createPopupContent(point: FormMapPointItem): HTMLElement {
  const container = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = point.nombres_apellidos_encuestado || "Sin nombre registrado";
  container.appendChild(title);

  const municipio = document.createElement("div");
  municipio.textContent = `Municipio: ${municipioFilterLabel(point.municipio)}`;
  container.appendChild(municipio);

  const fecha = document.createElement("div");
  fecha.textContent = `Fecha visita: ${point.fecha_visita || "Sin fecha"}`;
  container.appendChild(fecha);

  const resultado = document.createElement("div");
  resultado.textContent = `Resultado: ${point.resultado_validacion || "Sin resultado"}`;
  container.appendChild(resultado);

  return container;
}

function MapMarkers({ points }: { points: FormMapPointItem[] }) {
  const map = useMap();
  const displayPoints = useMemo(() => spreadMapPoints(points), [points]);

  useEffect(() => {
    const layerGroup = L.layerGroup();

    for (const point of displayPoints) {
      const marker = L.marker([point.displayLat, point.displayLng], {
        icon: createMarkerIcon(point.resultado_validacion),
      });
      marker.bindPopup(createPopupContent(point));
      layerGroup.addLayer(marker);
    }

    safeMapCall(map, () => {
      map.addLayer(layerGroup);
    });

    return () => {
      safeMapCall(map, () => {
        map.removeLayer(layerGroup);
      });
    };
  }, [displayPoints, map]);

  return null;
}

function MapInvalidateSizeOnMount() {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (!cancelled) {
        safeMapCall(map, () => {
          map.invalidateSize({ animate: false });
        });
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [map]);

  return null;
}

/** Ajusta la vista solo la primera vez que hay puntos; no al cambiar filtros. */
function MapFitBoundsOnce({ points }: { points: FormMapPointItem[] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (hasFittedRef.current || points.length === 0) {
      return;
    }

    let cancelled = false;

    const fitView = () => {
      if (cancelled || hasFittedRef.current) {
        return;
      }

      safeMapCall(map, () => {
        const { x, y } = map.getSize();
        if (x === 0 || y === 0) {
          return;
        }

        hasFittedRef.current = true;

        if (points.length === 1) {
          const one = points[0];
          map.setView([one.latitud, one.longitud], 14, { animate: false });
          return;
        }

        const bounds = L.latLngBounds(
          points.map((point) => [point.latitud, point.longitud]),
        );
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14, animate: false });
      });
    };

    map.whenReady(() => {
      if (cancelled) {
        return;
      }
      safeMapCall(map, () => {
        map.invalidateSize({ animate: false });
        requestAnimationFrame(() => {
          if (!cancelled) {
            fitView();
          }
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [map, points]);

  return null;
}

export const FormulariosMapView = ({
  points,
  total,
  loadState,
  isRefreshing = false,
  error,
  onRetry,
  sectionOpen = true,
}: FormulariosMapViewProps) => {
  const mapMountKeyRef = useRef(0);

  useEffect(() => {
    if (sectionOpen) {
      mapMountKeyRef.current += 1;
    }
  }, [sectionOpen]);

  if (loadState === "offline") {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Conectate a internet para ver este mapa.
      </p>
    );
  }
  if (loadState === "no_session") {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Iniciá sesión para ver el mapa del servidor.
      </p>
    );
  }

  const initialLoading =
    (loadState === "loading" || loadState === "idle") && points.length === 0;
  const blockingError = loadState === "error" && points.length === 0;
  const showNeedsMunicipios = loadState === "needs_municipios";
  const showEmpty =
    loadState === "ready" &&
    points.length === 0 &&
    !isRefreshing &&
    !showNeedsMunicipios;

  if (blockingError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
        No se pudieron cargar los puntos del mapa: {error ?? "error desconocido"}.
        <button
          type="button"
          onClick={onRetry}
          className="ml-2 font-medium underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {initialLoading
          ? "Cargando formularios en el mapa…"
          : `Mostrando ${total} formularios con coordenadas válidas.`}
      </p>

      <div className="relative h-[320px] overflow-hidden rounded-xl border border-slate-200 sm:h-[420px]">
        {(isRefreshing || initialLoading) && (
          <div
            className="pointer-events-none absolute inset-x-0 top-2 z-[1000] mx-auto w-fit rounded-full bg-white/95 px-3 py-1 text-xs text-slate-600 shadow-sm"
            aria-live="polite"
          >
            Actualizando puntos…
          </div>
        )}

        {error && points.length > 0 ? (
          <div className="absolute inset-x-2 top-2 z-[1000] rounded-lg border border-rose-200 bg-rose-50/95 px-3 py-2 text-xs text-rose-900">
            No se pudieron actualizar los puntos: {error}.
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 font-medium underline"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {showNeedsMunicipios ? (
          <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center bg-white/75 px-4 text-center text-sm text-slate-600">
            Seleccioná al menos un municipio para visualizar puntos.
          </div>
        ) : null}

        {showEmpty ? (
          <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center bg-white/75 px-4 text-center text-sm text-slate-600">
            No hay formularios con coordenadas válidas para los filtros seleccionados.
          </div>
        ) : null}

        {sectionOpen ? (
          <MapContainer
            key={`formularios-map-${mapMountKeyRef.current}`}
            center={[4.570868, -74.297333]}
            zoom={6}
            className="h-full w-full"
            preferCanvas
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInvalidateSizeOnMount />
            <MapMarkers points={points} />
            <MapFitBoundsOnce points={points} />
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 px-4 text-center text-sm text-slate-500">
            Expandí la sección para cargar el mapa.
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Colores: verde (cumple), rojo (no cumple), gris (sin resultado). Puntos en la misma
        ubicación se muestran ligeramente separados para facilitar la selección.
      </p>
    </div>
  );
};
