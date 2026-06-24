import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MUNICIPIO_SIN_ASOCIAR } from "@/constants/formStatsMunicipio";

const mockFetchFormStats = vi.fn();
const mockFetchFormStatsMunicipios = vi.fn();
const mockFetchFormStatsMonthly = vi.fn();
const mockFetchFormStatsAnios = vi.fn();
const mockFetchFormMapPoints = vi.fn();
const mockUseConnectivity = vi.fn(() => true);

vi.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => mockUseConnectivity(),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    fetchFormStatsFromApi: (...args: unknown[]) => mockFetchFormStats(...args),
    fetchFormStatsMunicipiosFromApi: () => mockFetchFormStatsMunicipios(),
    fetchFormStatsMonthlyFromApi: (...args: unknown[]) =>
      mockFetchFormStatsMonthly(...args),
    fetchFormStatsAniosFromApi: () => mockFetchFormStatsAnios(),
    fetchFormMapPointsFromApi: (...args: unknown[]) =>
      mockFetchFormMapPoints(...args),
  };
});

vi.mock("@/pages/datos/FormulariosMapView", () => ({
  FormulariosMapView: ({
    total,
    loadState,
  }: {
    total: number;
    loadState: string;
  }) => (
    <div data-testid="map-view-mock">
      mapa:{loadState}:{total}
    </div>
  ),
}));

vi.mock("@/lib/authStorage", () => ({
  ACCESS_TOKEN_KEY: "nosignal_access_token",
}));

import { getCurrentMonthIsoDateRange } from "@/pages/datos/datosDateDefaults";
import { saveDatosPagePreferences } from "@/pages/datos/datosPagePreferences";
import { DatosPage } from "@/pages/DatosPage";

const sampleStats = {
  total: 10,
  cumple: 6,
  no_cumple: 3,
  sin_resultado: 1,
  vista: "resumen" as const,
  cumple_detalle: null,
  filtros_aplicados: {
    municipio: null,
    fecha_desde: null,
    fecha_hasta: null,
    resultado_validacion: null,
  },
};

describe("DatosPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockUseConnectivity.mockReturnValue(true);
    mockFetchFormStatsMunicipios.mockResolvedValue([
      "Cúcuta",
      "Medellín",
      MUNICIPIO_SIN_ASOCIAR,
    ]);
    mockFetchFormStatsAnios.mockResolvedValue([2026, 2025]);
    mockFetchFormMapPoints.mockResolvedValue({
      items: [
        {
          id_formulario: "f-1",
          latitud: 7.889,
          longitud: -72.496,
          municipio: "Cúcuta",
          fecha_visita: "2026-06-15",
          nombres_apellidos_encuestado: "Ana Perez",
          resultado_validacion: "CUMPLE",
          informacion_vivienda: "",
        },
      ],
      total: 1,
      filtros_aplicados: {
        municipios: ["Cúcuta"],
        fecha_desde: "2026-06-01",
        fecha_hasta: "2026-06-30",
      },
    });
    mockFetchFormStatsMonthly.mockResolvedValue({
      anio: 2026,
      municipios: ["Cúcuta"],
      etiquetas_mes: [
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
      ],
      series: [
        {
          municipio: "Cúcuta",
          totales: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
      total: 2,
    });
  });

  it("muestra banner offline sin llamar al API", async () => {
    mockUseConnectivity.mockReturnValue(false);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Requiere conexión a internet/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetchFormStats).not.toHaveBeenCalled();
      expect(mockFetchFormMapPoints).not.toHaveBeenCalled();
    });
  });

  it("muestra sección de mapa y consulta puntos online", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Ubicación de formularios")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetchFormMapPoints).toHaveBeenCalled();
      expect(screen.getByTestId("map-view-mock")).toBeInTheDocument();
    });
  });

  it("solo lista municipios presentes en formularios del servidor", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStatsMunicipios.mockResolvedValue(["Cúcuta"]);
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockFetchFormStatsMunicipios).toHaveBeenCalled();
    });
    const select = screen.getAllByRole("combobox")[0];
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Cúcuta");
    expect(options).not.toContain("Abejorral");
  });

  it("muestra opción Sin asociar cuando el backend la devuelve", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    mockFetchFormStatsMunicipios.mockResolvedValue([MUNICIPIO_SIN_ASOCIAR]);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockFetchFormStatsMunicipios).toHaveBeenCalled();
    });

    const monthlySelect = screen.getByRole("combobox", {
      name: /Municipio para gráfico mensual/i,
    });
    await waitFor(() => {
      const options = Array.from(monthlySelect.querySelectorAll("option")).map(
        (o) => o.textContent,
      );
      expect(options).toContain("Sin asociar");
    });
  });

  it("aplica rango del mes actual por defecto en validación", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    const { desde, hasta } = getCurrentMonthIsoDateRange();
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockFetchFormStats).toHaveBeenCalled();
      const lastCall = mockFetchFormStats.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ fecha_desde: desde, fecha_hasta: hasta });
    });
    const validationSection = screen.getByLabelText("Validación");
    const desdeInput = within(validationSection).getByLabelText(
      /^Desde$/i,
    ) as HTMLInputElement;
    const hastaInput = within(validationSection).getByLabelText(
      /^Hasta$/i,
    ) as HTMLInputElement;
    expect(desdeInput.value).toBe(desde);
    expect(hastaInput.value).toBe(hasta);
  });

  it("muestra gráfico cuando hay datos del servidor", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Cumple")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  it("muestra gráfico mensual con todos los municipios por defecto", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(mockFetchFormStatsMonthly).toHaveBeenCalled();
      const lastCall = mockFetchFormStatsMonthly.mock.calls.at(-1)?.[0];
      expect(lastCall?.municipios).toEqual(
        expect.arrayContaining(["Cúcuta", "Medellín", MUNICIPIO_SIN_ASOCIAR]),
      );
      expect(screen.getByText(/Total en 2026/i)).toBeInTheDocument();
    });
  });

  it("envía centinela al seleccionar Sin asociar en mensual", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockFetchFormStatsMonthly).toHaveBeenCalled());
    const municipioSelect = screen.getByRole("combobox", {
      name: /Municipio para gráfico mensual/i,
    });
    fireEvent.change(municipioSelect, { target: { value: MUNICIPIO_SIN_ASOCIAR } });
    await waitFor(() => {
      const lastCall = mockFetchFormStatsMonthly.mock.calls.at(-1)?.[0];
      expect(lastCall?.municipios).toEqual([MUNICIPIO_SIN_ASOCIAR]);
    });
  });

  it("filtra gráfico mensual al elegir un municipio en el dropdown", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockFetchFormStatsMonthly).toHaveBeenCalled());
    const municipioSelect = screen.getByRole("combobox", {
      name: /Municipio para gráfico mensual/i,
    });
    fireEvent.change(municipioSelect, { target: { value: "Cúcuta" } });
    await waitFor(() => {
      const lastCall = mockFetchFormStatsMonthly.mock.calls.at(-1)?.[0];
      expect(lastCall?.municipios).toEqual(["Cúcuta"]);
    });
  });

  it("aplica filtro de resultado de validación al cambiar el select", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue({
      ...sampleStats,
      vista: "cumple_detalle",
      cumple_detalle: {
        sin_servicio_energia: 2,
        servicio_irregular_directo: 3,
        servicio_irregular_indirecto: 1,
        sin_clasificar: 0,
      },
    });
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockFetchFormStats).toHaveBeenCalled());
    const cumplenButton = screen.getByRole("button", { name: "Cumplen" });
    fireEvent.click(cumplenButton);
    await waitFor(() => {
      const lastCall = mockFetchFormStats.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ resultado_validacion: "CUMPLE" });
    });
  });

  it("aplica filtro de municipio al cambiar el select", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockFetchFormStats).toHaveBeenCalled());
    const callsBefore = mockFetchFormStats.mock.calls.length;
    const select = screen.getAllByRole("combobox")[0];
    fireEvent.change(select, { target: { value: "Cúcuta" } });
    await waitFor(() => {
      expect(mockFetchFormStats.mock.calls.length).toBeGreaterThan(callsBefore);
      const lastCall = mockFetchFormStats.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ municipio: "Cúcuta" });
    });
  });

  it("aplica filtro de municipio al mapa al cambiar el select de validación", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    mockFetchFormStatsMunicipios.mockResolvedValue(["Cúcuta", "Medellín"]);
    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockFetchFormMapPoints).toHaveBeenCalled());
    const callsBefore = mockFetchFormMapPoints.mock.calls.length;
    const select = screen.getAllByRole("combobox")[0];
    fireEvent.change(select, { target: { value: "Cúcuta" } });
    await waitFor(() => {
      expect(mockFetchFormMapPoints.mock.calls.length).toBeGreaterThan(callsBefore);
      const lastCall = mockFetchFormMapPoints.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({
        municipios: ["Cúcuta"],
      });
    });
  });

  it("restaura secciones y filtros guardados al volver a Datos", async () => {
    localStorage.setItem("nosignal_access_token", "token");
    mockFetchFormStats.mockResolvedValue(sampleStats);
    const { desde } = getCurrentMonthIsoDateRange();

    saveDatosPagePreferences(
      {
        openSections: new Set(["mapa"]),
        municipio: "Cúcuta",
        resultadoValidacion: "NO CUMPLE",
        fechaDesde: "2026-01-01",
        fechaHasta: "2026-01-31",
        anioMensual: 2025,
        municipioMensual: "Medellín",
      },
      Date.now(),
    );

    const view = render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );
    view.unmount();

    render(
      <MemoryRouter>
        <DatosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockFetchFormStats).toHaveBeenCalled();
      const lastCall = mockFetchFormStats.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({
        municipio: "Cúcuta",
        fecha_desde: "2026-01-01",
        fecha_hasta: "2026-01-31",
      });
    });

    const validationSection = screen.getByLabelText(
      "Validación",
    ) as HTMLDetailsElement;
    expect(validationSection.open).toBe(false);

    const validationFilters = within(validationSection);
    expect(
      (validationFilters.getByLabelText(/^Desde$/i) as HTMLInputElement).value,
    ).toBe("2026-01-01");
    expect(
      (validationFilters.getByLabelText(/^Hasta$/i) as HTMLInputElement).value,
    ).not.toBe(desde);
  });
});
