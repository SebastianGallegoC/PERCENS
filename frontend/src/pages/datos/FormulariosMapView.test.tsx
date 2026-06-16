import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return {
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      setView: vi.fn(),
      fitBounds: vi.fn(),
      whenReady: (callback: () => void) => {
        callback();
      },
      invalidateSize: vi.fn(),
      stop: vi.fn(),
      getSize: () => ({ x: 400, y: 320 }),
      getContainer: () => container,
    };
  },
}));

import { FormulariosMapView } from "@/pages/datos/FormulariosMapView";

describe("FormulariosMapView", () => {
  it("mantiene el mapa montado cuando faltan municipios seleccionados", () => {
    render(
      <FormulariosMapView
        points={[]}
        total={0}
        loadState="needs_municipios"
        error={null}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(
      screen.getByText(/Seleccioná al menos un municipio/i),
    ).toBeInTheDocument();
  });

  it("mantiene el mapa montado cuando no hay puntos para los filtros", () => {
    render(
      <FormulariosMapView
        points={[]}
        total={0}
        loadState="ready"
        error={null}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(
      screen.getByText(/No hay formularios con coordenadas válidas/i),
    ).toBeInTheDocument();
  });

  it("no monta el mapa cuando la sección está colapsada", () => {
    render(
      <FormulariosMapView
        points={[]}
        total={0}
        loadState="ready"
        error={null}
        onRetry={vi.fn()}
        sectionOpen={false}
      />,
    );
    expect(screen.queryByTestId("map-container")).not.toBeInTheDocument();
    expect(screen.getByText(/Expandí la sección para cargar el mapa/i)).toBeInTheDocument();
  });

  it("muestra aviso de actualización sin desmontar el mapa", () => {
    render(
      <FormulariosMapView
        points={[
          {
            id_formulario: "f-1",
            latitud: 7.89,
            longitud: -72.49,
            municipio: "Cúcuta",
            fecha_visita: "2026-06-01",
            nombres_apellidos_encuestado: "Ana",
            resultado_validacion: "CUMPLE",
          },
        ]}
        total={1}
        loadState="ready"
        isRefreshing
        error={null}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByText(/Actualizando puntos/i)).toBeInTheDocument();
  });
});
