import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MUNICIPIO_SIN_ASOCIAR } from "@/constants/formStatsMunicipio";

const mockFetchFormStats = vi.fn();
const mockFetchFormStatsMunicipios = vi.fn();
const mockFetchFormStatsMonthly = vi.fn();
const mockFetchFormStatsAnios = vi.fn();
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
  };
});

vi.mock("@/lib/authStorage", () => ({
  ACCESS_TOKEN_KEY: "nosignal_access_token",
}));

import { getCurrentMonthIsoDateRange } from "@/pages/datos/datosDateDefaults";
import { DatosPage } from "@/pages/DatosPage";

const sampleStats = {
  total: 10,
  cumple: 6,
  no_cumple: 3,
  sin_resultado: 1,
  filtros_aplicados: {
    municipio: null,
    fecha_desde: null,
    fecha_hasta: null,
  },
};

describe("DatosPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseConnectivity.mockReturnValue(true);
    mockFetchFormStatsMunicipios.mockResolvedValue([
      "Cúcuta",
      "Medellín",
      MUNICIPIO_SIN_ASOCIAR,
    ]);
    mockFetchFormStatsAnios.mockResolvedValue([2026, 2025]);
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
    const options = Array.from(monthlySelect.querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Sin asociar");
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
    const desdeInput = screen.getByLabelText(/^Desde$/i) as HTMLInputElement;
    const hastaInput = screen.getByLabelText(/^Hasta$/i) as HTMLInputElement;
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
});
