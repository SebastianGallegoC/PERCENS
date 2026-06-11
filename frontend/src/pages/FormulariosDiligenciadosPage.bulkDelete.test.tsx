import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FormReadItem } from "@/services/api";
import { ACCESS_TOKEN_KEY } from "@/lib/authStorage";
import {
  BULK_DELETE_ALL_PASSWORD,
  isBulkDeleteAllPasswordValid,
} from "@/pages/formulariosDiligenciados/bulkDeleteAllFormularios";

const mocks = vi.hoisted(() => {
  const makeForm = (): FormReadItem => ({
    id_formulario: "f-bulk-test-1",
    fecha_hora: "2020-01-15T12:00:00.000Z",
    fecha_actualizacion: "2020-01-15T12:00:00.000Z",
    latitud: 4.5,
    longitud: -74.0,
    precision: 5,
    datos_formulario: {},
    fotos: [],
  });

  const state = { items: [makeForm()] };

  return {
    state,
    resetState() {
      state.items = [makeForm()];
    },
    searchFormsFromApi: vi.fn(async () => ({
      items: state.items.map((it) => ({
        id_formulario: it.id_formulario,
        id_perfil_encuestador: it.id_perfil_encuestador ?? null,
        fecha_hora: it.fecha_hora,
        fecha_actualizacion: it.fecha_actualizacion,
        latitud: it.latitud,
        longitud: it.longitud,
        precision: it.precision,
        nombres_apellidos_encuestado: "",
        municipio: "",
        fecha_visita: "",
        resultado_validacion: "",
      })),
      total: state.items.length,
      limit: 100,
      offset: 0,
    })),
    fetchFormFromApi: vi.fn(async (id: string) =>
      state.items.find((x) => x.id_formulario === id),
    ),
    deleteFormFromApi: vi.fn(async (id: string) => {
      state.items = state.items.filter((x) => x.id_formulario !== id);
    }),
    eliminarFormularioDeDispositivo: vi.fn().mockResolvedValue(undefined),
    loadHiddenFormIds: vi.fn(async () => new Set<string>()),
  };
});

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: (selector: (s: { username: string | null }) => unknown) =>
    selector({ username: "tester" }),
}));

vi.mock("@/services/api", () => ({
  searchFormsFromApi: mocks.searchFormsFromApi,
  fetchFormFromApi: mocks.fetchFormFromApi,
  deleteFormFromApi: mocks.deleteFormFromApi,
  fetchFormPhotoDataUrl: vi.fn(),
  loginApi: vi.fn(),
}));

vi.mock("@/services/formLocalDelete", () => ({
  clearAllPrecargas: vi.fn().mockResolvedValue(undefined),
  eliminarCopiaLocalFormulario: vi.fn().mockResolvedValue(undefined),
  eliminarFormularioDeDispositivo: mocks.eliminarFormularioDeDispositivo,
  loadHiddenFormIds: mocks.loadHiddenFormIds,
}));

vi.mock("@/services/db", () => ({
  db: {
    precargas: {
      toArray: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    historialFormularios: {
      toArray: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    formularios: {
      get: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([]),
    },
    formulariosOcultos: {
      toArray: vi.fn().mockResolvedValue([]),
      put: vi.fn().mockResolvedValue(undefined),
    },
    sesionLocal: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { FormulariosDiligenciadosPage } from "@/pages/FormulariosDiligenciadosPage";

describe("FormulariosDiligenciadosPage — borrado masivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetState();
    localStorage.setItem(ACCESS_TOKEN_KEY, "token-de-prueba");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      writable: true,
      value: true,
    });
  });

  it("muestra error de contraseña si el modal recibe una clave incorrecta", async () => {
    render(
      <MemoryRouter>
        <FormulariosDiligenciadosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Eliminar todos los formularios/i }),
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Eliminar todos los formularios/i }),
    );

    expect(
      await screen.findByRole("heading", { name: /¿Eliminar todos los formularios\?/i }),
    ).toBeInTheDocument();

    const input = screen.getByLabelText(/Contraseña de confirmación/i);
    fireEvent.change(input, { target: { value: "clave-incorrecta" } });
    fireEvent.click(screen.getByRole("button", { name: /^Eliminar todo$/i }));

    expect(await screen.findByText("Contraseña incorrecta.")).toBeInTheDocument();
    expect(mocks.deleteFormFromApi).not.toHaveBeenCalled();
  });

  it("con la contraseña correcta borra en servidor y en dispositivo y vacía el listado", async () => {
    expect(isBulkDeleteAllPasswordValid(BULK_DELETE_ALL_PASSWORD)).toBe(true);

    render(
      <MemoryRouter>
        <FormulariosDiligenciadosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Eliminar todos los formularios/i }),
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Eliminar todos los formularios/i }),
    );

    const input = await screen.findByLabelText(/Contraseña de confirmación/i);
    fireEvent.change(input, { target: { value: BULK_DELETE_ALL_PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: /^Eliminar todo$/i }));

    await waitFor(() => {
      expect(mocks.deleteFormFromApi).toHaveBeenCalledWith("f-bulk-test-1");
    });
    await waitFor(() => {
      expect(mocks.eliminarFormularioDeDispositivo).toHaveBeenCalledWith(
        "f-bulk-test-1",
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/No hay registros en el historial local ni en el servidor/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("heading", { name: /¿Eliminar todos los formularios\?/i }),
    ).not.toBeInTheDocument();
  });
});
