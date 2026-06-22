import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/sync", () => ({
  countPendingForms: vi.fn().mockResolvedValue(7),
  countErrorForms: vi.fn().mockResolvedValue(3),
}));

const mockUseConnectivity = vi.fn(() => true);
const mockUsePermissions = vi.fn(() => ({
  canManageEncuestadorProfiles: true,
  canManageUsers: false,
}));

vi.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => mockUseConnectivity(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

import { InicioPage } from "@/pages/InicioPage";
import { MATRIZ_TEMPLATE_PUBLIC_PATH } from "@/services/matrizCaracterizacionExport";

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
  it("oculta enlaces a Datos y Perfil encuestador cuando está offline", async () => {
    mockUseConnectivity.mockReturnValue(false);
    await renderInicio();
    expect(screen.queryByRole("link", { name: /Datos/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Perfil encuestador/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cerrar sesión/i })).not.toBeInTheDocument();
    mockUseConnectivity.mockReturnValue(true);
  });

  it("muestra cerrar sesión solo en el menú principal cuando está online", async () => {
    mockUseConnectivity.mockReturnValue(true);
    await renderInicio();
    expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeInTheDocument();
  });

  it("muestra enlaces a Datos y Perfil encuestador cuando está online", async () => {
    mockUseConnectivity.mockReturnValue(true);
    await renderInicio();
    expect(screen.getByRole("link", { name: /Datos/i })).toHaveAttribute(
      "href",
      "/datos",
    );
    expect(screen.getByRole("link", { name: /Perfil encuestador/i })).toHaveAttribute(
      "href",
      "/perfil-encuestador",
    );
  });

  it("muestra el acceso a usuarios solo para admin", async () => {
    mockUsePermissions.mockReturnValue({
      canManageEncuestadorProfiles: true,
      canManageUsers: true,
    });
    await renderInicio();
    expect(screen.getByRole("link", { name: /Usuarios/i })).toHaveAttribute(
      "href",
      "/usuarios",
    );
    mockUsePermissions.mockReturnValue({
      canManageEncuestadorProfiles: true,
      canManageUsers: false,
    });
  });

  it("renderiza enlaces a formulario, diligenciados y plantilla", async () => {
    await renderInicio();

    const formulario = screen.getByRole("link", { name: /Completar encuesta/i });
    const diligenciados = screen.getByRole("link", {
      name: /Ver encuestas diligenciadas/i,
    });
    const plantilla = screen.getByRole("link", { name: /Descargar plantilla vacía/i });

    expect(formulario).toHaveAttribute("href", "/formulario");
    expect(diligenciados).toHaveAttribute("href", "/formularios-diligenciados");
    expect(plantilla).toHaveAttribute("href", MATRIZ_TEMPLATE_PUBLIC_PATH);
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
