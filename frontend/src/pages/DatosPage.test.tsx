import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockFetchFormStats = vi.fn();
const mockUseConnectivity = vi.fn(() => true);

vi.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => mockUseConnectivity(),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    fetchFormStatsFromApi: (...args: unknown[]) => mockFetchFormStats(...args),
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
    const select = screen.getByLabelText(/Municipio/i);
    fireEvent.change(select, { target: { value: "Cúcuta" } });
    await waitFor(() => {
      expect(mockFetchFormStats.mock.calls.length).toBeGreaterThan(callsBefore);
      const lastCall = mockFetchFormStats.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ municipio: "Cúcuta" });
    });
  });
});
