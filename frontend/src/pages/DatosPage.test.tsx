import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    mockFetchFormStatsMunicipios.mockResolvedValue(["Cúcuta", "Medellín"]);
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
      expect(lastCall?.municipios).toEqual(expect.arrayContaining(["Cúcuta", "Medellín"]));
      expect(screen.getByText(/Total en 2026/i)).toBeInTheDocument();
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
