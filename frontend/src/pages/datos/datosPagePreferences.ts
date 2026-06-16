import { MUNICIPIO_MENSUAL_TODOS } from "@/pages/datos/MonthlyDiligenciasFilters";
import {
  getCurrentCalendarYear,
  getCurrentMonthIsoDateRange,
} from "@/pages/datos/datosDateDefaults";

export const DATOS_PAGE_PREFS_STORAGE_KEY = "nosignal:datos-page-prefs";
export const DATOS_PAGE_PREFS_TTL_MS = 30 * 60 * 1000;

export const DATOS_SECTION_IDS = ["mapa", "validacion", "mensual"] as const;
export type DatosSectionId = (typeof DATOS_SECTION_IDS)[number];

type DatosPagePreferencesPayloadV1 = {
  openSections: string[];
  validation: {
    municipio: string;
    fechaDesde: string;
    fechaHasta: string;
  };
  monthly: {
    anio: number;
    municipioMensual: string;
  };
  map: {
    municipios: string[];
    fechaDesde: string;
    fechaHasta: string;
    municipiosInitialized: boolean;
  };
};

type DatosPagePreferencesStoredV1 = DatosPagePreferencesPayloadV1 & {
  v: 1;
  savedAt: number;
};

export type DatosPageUiState = {
  openSections: Set<string>;
  municipio: string;
  fechaDesde: string;
  fechaHasta: string;
  anioMensual: number;
  municipioMensual: string;
  mapMunicipios: string[];
  mapMunicipiosInitialized: boolean;
  mapFechaDesde: string;
  mapFechaHasta: string;
};

function defaultDatosPageUiState(): DatosPageUiState {
  const { desde, hasta } = getCurrentMonthIsoDateRange();
  return {
    openSections: new Set<string>(DATOS_SECTION_IDS),
    municipio: "",
    fechaDesde: desde,
    fechaHasta: hasta,
    anioMensual: getCurrentCalendarYear(),
    municipioMensual: MUNICIPIO_MENSUAL_TODOS,
    mapMunicipios: [],
    mapMunicipiosInitialized: false,
    mapFechaDesde: desde,
    mapFechaHasta: hasta,
  };
}

function isDatosSectionId(value: string): value is DatosSectionId {
  return (DATOS_SECTION_IDS as readonly string[]).includes(value);
}

function parseStoredPreferences(raw: string): DatosPagePreferencesStoredV1 | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (record.v !== 1 || typeof record.savedAt !== "number") {
      return null;
    }
    if (!Array.isArray(record.openSections)) {
      return null;
    }
    const validation = record.validation;
    const monthly = record.monthly;
    const map = record.map;
    if (!validation || typeof validation !== "object") {
      return null;
    }
    if (!monthly || typeof monthly !== "object") {
      return null;
    }
    if (!map || typeof map !== "object") {
      return null;
    }
    const validationRecord = validation as Record<string, unknown>;
    const monthlyRecord = monthly as Record<string, unknown>;
    const mapRecord = map as Record<string, unknown>;
    if (
      typeof validationRecord.municipio !== "string" ||
      typeof validationRecord.fechaDesde !== "string" ||
      typeof validationRecord.fechaHasta !== "string"
    ) {
      return null;
    }
    if (
      typeof monthlyRecord.anio !== "number" ||
      typeof monthlyRecord.municipioMensual !== "string"
    ) {
      return null;
    }
    if (
      !Array.isArray(mapRecord.municipios) ||
      typeof mapRecord.fechaDesde !== "string" ||
      typeof mapRecord.fechaHasta !== "string" ||
      typeof mapRecord.municipiosInitialized !== "boolean"
    ) {
      return null;
    }
    return {
      v: 1,
      savedAt: record.savedAt,
      openSections: record.openSections.filter(
        (section): section is string => typeof section === "string",
      ),
      validation: {
        municipio: validationRecord.municipio,
        fechaDesde: validationRecord.fechaDesde,
        fechaHasta: validationRecord.fechaHasta,
      },
      monthly: {
        anio: monthlyRecord.anio,
        municipioMensual: monthlyRecord.municipioMensual,
      },
      map: {
        municipios: mapRecord.municipios.filter(
          (municipio): municipio is string => typeof municipio === "string",
        ),
        fechaDesde: mapRecord.fechaDesde,
        fechaHasta: mapRecord.fechaHasta,
        municipiosInitialized: mapRecord.municipiosInitialized,
      },
    };
  } catch {
    return null;
  }
}

export function clearDatosPagePreferences(): void {
  try {
    sessionStorage.removeItem(DATOS_PAGE_PREFS_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function loadDatosPagePreferences(now = Date.now()): DatosPageUiState | null {
  try {
    const raw = sessionStorage.getItem(DATOS_PAGE_PREFS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const stored = parseStoredPreferences(raw);
    if (!stored) {
      clearDatosPagePreferences();
      return null;
    }
    if (now - stored.savedAt > DATOS_PAGE_PREFS_TTL_MS) {
      clearDatosPagePreferences();
      return null;
    }

    const openSections = stored.openSections.filter(isDatosSectionId);
    return {
      openSections: new Set(
        openSections.length > 0 ? openSections : DATOS_SECTION_IDS,
      ),
      municipio: stored.validation.municipio,
      fechaDesde: stored.validation.fechaDesde,
      fechaHasta: stored.validation.fechaHasta,
      anioMensual: stored.monthly.anio,
      municipioMensual: stored.monthly.municipioMensual,
      mapMunicipios: [...stored.map.municipios],
      mapMunicipiosInitialized: stored.map.municipiosInitialized,
      mapFechaDesde: stored.map.fechaDesde,
      mapFechaHasta: stored.map.fechaHasta,
    };
  } catch {
    return null;
  }
}

export function saveDatosPagePreferences(
  state: DatosPageUiState,
  now = Date.now(),
): void {
  try {
    const payload: DatosPagePreferencesStoredV1 = {
      v: 1,
      savedAt: now,
      openSections: [...state.openSections].filter(isDatosSectionId),
      validation: {
        municipio: state.municipio,
        fechaDesde: state.fechaDesde,
        fechaHasta: state.fechaHasta,
      },
      monthly: {
        anio: state.anioMensual,
        municipioMensual: state.municipioMensual,
      },
      map: {
        municipios: [...state.mapMunicipios],
        fechaDesde: state.mapFechaDesde,
        fechaHasta: state.mapFechaHasta,
        municipiosInitialized: state.mapMunicipiosInitialized,
      },
    };
    sessionStorage.setItem(DATOS_PAGE_PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // QuotaExceeded u otro: no bloquear la UI
  }
}

export function getInitialDatosPageUiState(): DatosPageUiState {
  return loadDatosPagePreferences() ?? defaultDatosPageUiState();
}
