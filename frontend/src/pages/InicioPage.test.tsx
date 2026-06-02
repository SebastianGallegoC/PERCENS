import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/sync", () => ({
  countPendingForms: vi.fn().mockResolvedValue(7),
  countErrorForms: vi.fn().mockResolvedValue(3),
}));

const mockUseConnectivity = vi.fn(() => true);

vi.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => mockUseConnectivity(),
}));

import { InicioPage } from "@/pages/InicioPage";

async function renderInicio() {
  const view = render(
    <MemoryRouter>
      <InicioPage />
    </MemoryRouter>,
  );
  await waitFor(() => {
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  return view;
}

describe("InicioPage", () => {
  it("oculta enlace a Datos cuando está offline", async () => {
    mockUseConnectivity.mockReturnValue(false);
    await renderInicio();
    expect(screen.queryByRole("link", { name: /Datos/i })).not.toBeInTheDocument();
    mockUseConnectivity.mockReturnValue(true);
  });

  it("muestra enlace a Datos cuando está online", async () => {
    mockUseConnectivity.mockReturnValue(true);
    await renderInicio();
    const datos = screen.getByRole("link", { name: /Datos/i });
    expect(datos).toHaveAttribute("href", "/datos");
  });

  it("renderiza enlaces a formulario, diligenciados, perfil y plantilla", async () => {
    await renderInicio();

    const formulario = screen.getByRole("link", { name: /Completar encuesta/i });
    const diligenciados = screen.getByRole("link", {
      name: /Ver encuestas diligenciadas/i,
    });
    const perfil = screen.getByRole("link", { name: /Perfil encuestador/i });
    const plantilla = screen.getByRole("link", { name: /Descargar plantilla vacía/i });

    expect(formulario).toHaveAttribute("href", "/formulario");
    expect(diligenciados).toHaveAttribute("href", "/formularios-diligenciados");
    expect(perfil).toHaveAttribute("href", "/perfil-encuestador");
    expect(plantilla).toHaveAttribute("href", "/PLANTILLA.xlsx");
  });

  it("muestra contadores de pendientes y errores tras cargar", async () => {
    await renderInicio();

    const statsRegion = screen.getByTestId("inicio-stats");
    expect(within(statsRegion).getByText("7")).toBeInTheDocument();
    expect(within(statsRegion).getByText("3")).toBeInTheDocument();
  });

  it("coloca el bloque de acciones antes del bloque de estadísticas", async () => {
    await renderInicio();

    const actions = screen.getByTestId("inicio-acciones");
    const stats = screen.getByTestId("inicio-stats");

    expect(
      actions.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
