import { afterEach, describe, expect, it, vi } from "vitest";

import { MUNICIPIO_MENSUAL_TODOS } from "@/pages/datos/MonthlyDiligenciasFilters";
import {
  DATOS_PAGE_PREFS_STORAGE_KEY,
  DATOS_PAGE_PREFS_TTL_MS,
  clearDatosPagePreferences,
  getInitialDatosPageUiState,
  loadDatosPagePreferences,
  saveDatosPagePreferences,
} from "@/pages/datos/datosPagePreferences";

describe("datosPagePreferences", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("guarda y restaura secciones y filtros", () => {
    saveDatosPagePreferences(
      {
        openSections: new Set(["mapa"]),
        municipio: "Cúcuta",
        fechaDesde: "2026-01-01",
        fechaHasta: "2026-01-31",
        anioMensual: 2025,
        municipioMensual: "Medellín",
        mapMunicipios: ["Cúcuta", "Medellín"],
        mapMunicipiosInitialized: true,
        mapFechaDesde: "2026-02-01",
        mapFechaHasta: "2026-02-28",
      },
      1_000,
    );

    const restored = loadDatosPagePreferences(1_000);
    expect(restored).not.toBeNull();
    expect(restored?.openSections).toEqual(new Set(["mapa"]));
    expect(restored?.municipio).toBe("Cúcuta");
    expect(restored?.anioMensual).toBe(2025);
    expect(restored?.mapMunicipios).toEqual(["Cúcuta", "Medellín"]);
    expect(restored?.mapMunicipiosInitialized).toBe(true);
  });

  it("expira preferencias después de 30 minutos", () => {
    saveDatosPagePreferences(
      {
        openSections: new Set(["validacion"]),
        municipio: "",
        fechaDesde: "2026-06-01",
        fechaHasta: "2026-06-30",
        anioMensual: 2026,
        municipioMensual: MUNICIPIO_MENSUAL_TODOS,
        mapMunicipios: [],
        mapMunicipiosInitialized: false,
        mapFechaDesde: "2026-06-01",
        mapFechaHasta: "2026-06-30",
      },
      0,
    );

    expect(loadDatosPagePreferences(DATOS_PAGE_PREFS_TTL_MS)).not.toBeNull();
    expect(loadDatosPagePreferences(DATOS_PAGE_PREFS_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(DATOS_PAGE_PREFS_STORAGE_KEY)).toBeNull();
  });

  it("getInitialDatosPageUiState usa defaults si no hay preferencias", () => {
    clearDatosPagePreferences();
    const initial = getInitialDatosPageUiState();
    expect(initial.openSections.has("mapa")).toBe(true);
    expect(initial.openSections.has("validacion")).toBe(true);
    expect(initial.openSections.has("mensual")).toBe(true);
    expect(initial.municipio).toBe("");
  });
});
