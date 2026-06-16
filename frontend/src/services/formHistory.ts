import type { FormularioSnapshot } from "@/components/form/FormularioRespuestaReadOnly";
import { applyCuentaConCocinaToFormValues } from "@/lib/cuentaConCocina";
import { applyDatosEncuestadoToFormValues } from "@/lib/datosEncuestado";
import { parseISODate } from "@/lib/formatDateTime";
import {
  isRegistroFotoSlot,
  REGISTRO_FOTO_SLOT_NUMBERS,
} from "@/config/registroFotografico";
import type { FormReadItem } from "@/services/api";
import type { HistorialForm, OfflineForm, PrecargaForm } from "@/services/db";
import { REQUIRED_FIELDS, type FormValues } from "@/types/formFields";
import {
  getMissingBadgeFromServerCounts,
  getMissingBadgeFromSnapshot,
  hasServerCompletenessCounts,
} from "@/lib/formCompleteness";

export type DisplayRow = {
  id_formulario: string;
  onServer: boolean;
  server?: FormReadItem;
  historial?: HistorialForm;
  /**
   * Fila solo por precarga en IndexedDB (p. ej. sin fila en historial cuando
   * el listado del servidor no está disponible offline).
   */
  precargaSolo?: PrecargaForm;
};

/**
 * Tras un `GET /forms` exitoso con sesión, el servidor es la fuente de verdad de qué
 * envíos siguen existiendo. Un `ENVIADO` local cuyo id ya no viene en la lista se
 * interpreta como borrado en otro dispositivo y debe dejar de mostrarse (y limpiarse
 * en IndexedDB en el caller).
 *
 * Además, una precarga cuyo id ya no está en el listado del servidor se elimina del
 * merge (salvo que el historial local siga en PENDIENTE o ERROR: envío aún no
 * reflejado en el listado o pendiente de reintento).
 *
 * No usar cuando el listado falló o no hubo token: en ese caso no se infiere ausencia.
 */
export function reconcileLocalStateWithTrustedServerList(
  local: HistorialForm[],
  server: FormReadItem[],
  precargas: PrecargaForm[],
): {
  historialForMerge: HistorialForm[];
  precargasForMerge: PrecargaForm[];
  staleEnviadoIds: string[];
  /** Precargas a borrar en IndexedDB: id no está en servidor y no hay cola PENDIENTE/ERROR. */
  orphanPrecargaIds: string[];
} {
  const serverIds = new Set(server.map((s) => s.id_formulario));
  const staleEnviadoIds = local
    .filter((h) => h.estado === "ENVIADO" && !serverIds.has(h.id_formulario))
    .map((h) => h.id_formulario);
  const stale = new Set(staleEnviadoIds);
  const historialForMerge = local.filter((h) => !stale.has(h.id_formulario));
  let precargasForMerge = precargas.filter((p) => !stale.has(p.id_formulario));

  const orphanPrecargaIds: string[] = [];
  for (const p of precargasForMerge) {
    if (serverIds.has(p.id_formulario)) {
      continue;
    }
    const h = historialForMerge.find((x) => x.id_formulario === p.id_formulario);
    const keepForPendingSync =
      h != null && (h.estado === "PENDIENTE" || h.estado === "ERROR");
    if (!keepForPendingSync) {
      orphanPrecargaIds.push(p.id_formulario);
    }
  }

  if (orphanPrecargaIds.length > 0) {
    const orphan = new Set(orphanPrecargaIds);
    precargasForMerge = precargasForMerge.filter((p) => !orphan.has(p.id_formulario));
  }

  return {
    historialForMerge,
    precargasForMerge,
    staleEnviadoIds,
    orphanPrecargaIds,
  };
}

export function mergeForms(server: FormReadItem[], local: HistorialForm[]): DisplayRow[] {
  const map = new Map<string, DisplayRow>();
  for (const s of server) {
    map.set(s.id_formulario, {
      id_formulario: s.id_formulario,
      onServer: true,
      server: s,
    });
  }
  for (const h of local) {
    const ex = map.get(h.id_formulario);
    if (ex) {
      ex.historial = h;
    } else {
      map.set(h.id_formulario, {
        id_formulario: h.id_formulario,
        onServer: false,
        historial: h,
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    const ta = Date.parse(a.server?.fecha_hora ?? a.historial?.fecha_hora ?? "");
    const tb = Date.parse(b.server?.fecha_hora ?? b.historial?.fecha_hora ?? "");
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
}

/** Une servidor + historial y agrega filas por precargas huérfanas (sin id en el merge). */
export function mergeFormsWithPrecargas(
  server: FormReadItem[],
  local: HistorialForm[],
  precargas: PrecargaForm[],
): DisplayRow[] {
  const merged = mergeForms(server, local);
  const ids = new Set(merged.map((r) => r.id_formulario));
  for (const p of precargas) {
    if (!ids.has(p.id_formulario)) {
      merged.push({
        id_formulario: p.id_formulario,
        onServer: false,
        precargaSolo: p,
      });
      ids.add(p.id_formulario);
    }
  }
  return merged.sort((a, b) => {
    const ta = getFechaReferenciaEnvio(a);
    const tb = getFechaReferenciaEnvio(b);
    const sa = Number.isNaN(ta) ? 0 : ta;
    const sb = Number.isNaN(tb) ? 0 : tb;
    return sb - sa;
  });
}

/** Sin listado del servidor: precargas locales y borradores pendientes de envío (historial PENDIENTE/ERROR). */
export function filterDisplayRowsWithPrecarga(
  rows: DisplayRow[],
  precargas: PrecargaForm[],
): DisplayRow[] {
  const precargaIds = new Set(precargas.map((p) => p.id_formulario));
  return rows.filter((r) => {
    if (precargaIds.has(r.id_formulario)) {
      return true;
    }
    const estado = r.historial?.estado;
    return estado === "PENDIENTE" || estado === "ERROR";
  });
}

/**
 * Filas visibles en «Formularios diligenciados» según conectividad.
 * Si el hook marca sin API o el navegador está offline, se aplica el mismo criterio
 * que cuando falla el listado del servidor (precargas + historial PENDIENTE/ERROR),
 * para no listar todo el merge aunque `GET /forms` hubiera venido de caché HTTP.
 */
export function rowsForOfflineAwareList(
  rows: DisplayRow[],
  precargas: PrecargaForm[],
  opts: { connectivityOnline: boolean; navigatorOnLine: boolean },
): DisplayRow[] {
  const modoOffline = !opts.connectivityOnline || !opts.navigatorOnLine;
  if (!modoOffline) {
    return rows;
  }
  return filterDisplayRowsWithPrecarga(rows, precargas);
}

export function mapServerFotos(
  formId: string,
  raw: unknown,
): NonNullable<FormularioSnapshot["fotos"]> {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? (() => {
          try {
            const j = JSON.parse(raw) as unknown;
            return Array.isArray(j) ? j : [];
          } catch {
            return [];
          }
        })()
      : [];
  return list.map((p, i) => {
    const slotFromIndex =
      i >= 0 && i < REGISTRO_FOTO_SLOT_NUMBERS.length
        ? REGISTRO_FOTO_SLOT_NUMBERS[i]
        : null;
    if (typeof p === "string") {
      const base = p.split(/[/\\]/).pop() || `foto_${i + 1}.jpg`;
      return {
        nombre_archivo: base,
        path: p,
        serverFormId: formId,
        serverIndex: i,
        ...(slotFromIndex != null ? { slot: slotFromIndex } : {}),
      };
    }
    if (p !== null && typeof p === "object" && "path" in p) {
      const path = String((p as { path: unknown }).path);
      const base = path.split(/[/\\]/).pop() || `foto_${i + 1}.jpg`;
      const slotRaw = (p as { slot?: unknown; visita?: unknown }).slot;
      let slot: number | null = null;
      if (isRegistroFotoSlot(slotRaw)) {
        slot = slotRaw;
      } else {
        const legacy = (p as { visita?: unknown }).visita;
        const legacyNum =
          typeof legacy === "number"
            ? legacy
            : typeof legacy === "string"
              ? Number.parseInt(legacy, 10)
              : NaN;
        if (legacyNum === 1 || legacyNum === 2 || legacyNum === 3 || legacyNum === 4) {
          slot = legacyNum;
        }
      }
      const resolvedSlot =
        slot != null && isRegistroFotoSlot(slot) ? slot : slotFromIndex;
      return {
        nombre_archivo: base,
        path,
        serverFormId: formId,
        serverIndex: i,
        ...(resolvedSlot != null ? { slot: resolvedSlot } : {}),
      };
    }
    return {
      nombre_archivo: `foto_${i + 1}`,
      path: String(p),
      serverFormId: formId,
      serverIndex: i,
      ...(slotFromIndex != null ? { slot: slotFromIndex } : {}),
    };
  });
}

export function getFechaReferenciaEnvio(row: DisplayRow): number {
  const h = row.historial;
  const s = row.server;
  // Servidor: fecha_hora = primer registro en BD (no cambia en ediciones).
  if (s?.fecha_hora) {
    return parseISODate(s.fecha_hora);
  }
  if (h?.fecha_envio) {
    return parseISODate(h.fecha_envio);
  }
  if (h?.fecha_hora) {
    return parseISODate(h.fecha_hora);
  }
  if (row.precargaSolo?.fecha_precarga) {
    return parseISODate(row.precargaSolo.fecha_precarga);
  }
  return NaN;
}

function gpsPrecisionOrDefault(precision: number | null | undefined): number {
  return typeof precision === "number" && precision > 0 ? precision : 1;
}

/**
 * Datos del formulario para exportar (Excel/ZIP masivo), alineado con la vista de detalle:
 * cola local en vivo > servidor > precarga > historial.
 */
export function resolveDatosFormularioForExport(
  row: DisplayRow,
  queued?: OfflineForm | null,
): Record<string, unknown> {
  if (queued?.datos_formulario) {
    return queued.datos_formulario;
  }
  const serverDatos = row.server?.datos_formulario;
  if (serverDatos && typeof serverDatos === "object") {
    return serverDatos as Record<string, unknown>;
  }
  const precargaDatos = row.precargaSolo?.datos_formulario;
  if (precargaDatos) {
    return precargaDatos;
  }
  return row.historial?.datos_formulario ?? {};
}

/** GPS para exportación masiva con la misma prioridad que `resolveDatosFormularioForExport`. */
export function resolveGpsForExport(
  row: DisplayRow,
  queued?: OfflineForm | null,
): OfflineForm["gps"] {
  if (queued?.gps) {
    return {
      latitud: queued.gps.latitud,
      longitud: queued.gps.longitud,
      precision: gpsPrecisionOrDefault(queued.gps.precision),
    };
  }
  if (row.server) {
    return {
      latitud: row.server.latitud,
      longitud: row.server.longitud,
      precision: gpsPrecisionOrDefault(row.server.precision),
    };
  }
  const pg = row.precargaSolo?.gps;
  if (pg) {
    return {
      latitud: pg.latitud,
      longitud: pg.longitud,
      precision: gpsPrecisionOrDefault(pg.precision ?? undefined),
    };
  }
  const hg = row.historial?.gps;
  if (hg) {
    return {
      latitud: hg.latitud,
      longitud: hg.longitud,
      precision: gpsPrecisionOrDefault(hg.precision),
    };
  }
  return { latitud: 0, longitud: 0, precision: 1 };
}

/** Nombre del encuestado con prioridad servidor > precarga > historial local. */
export function getBeneficiarioDisplayName(row: DisplayRow): string {
  const h = row.historial;
  const s = row.server;
  const solo = row.precargaSolo?.datos_formulario;
  const rawServer = (s?.datos_formulario as Record<string, unknown> | undefined)
    ?.nombres_apellidos_encuestado;
  if (typeof rawServer === "string" && rawServer.trim() !== "") {
    return rawServer.trim();
  }
  const raw = solo?.nombres_apellidos_encuestado;
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.trim();
  }
  const rawHistorial = (h?.datos_formulario as Record<string, unknown> | undefined)
    ?.nombres_apellidos_encuestado;
  if (typeof rawHistorial === "string" && rawHistorial.trim() !== "") {
    return rawHistorial.trim();
  }
  return "";
}

function municipioFromDatos(datos: Record<string, unknown> | undefined): string {
  const raw = datos?.municipio;
  if (typeof raw === "string") {
    return raw.trim();
  }
  return "";
}

/** Municipio con prioridad servidor > precarga > historial local. */
export function getMunicipioDisplayValue(row: DisplayRow): string {
  const server = municipioFromDatos(
    row.server?.datos_formulario as Record<string, unknown> | undefined,
  );
  if (server) {
    return server;
  }
  const precarga = municipioFromDatos(row.precargaSolo?.datos_formulario);
  if (precarga) {
    return precarga;
  }
  return municipioFromDatos(
    row.historial?.datos_formulario as Record<string, unknown> | undefined,
  );
}

/** Municipios distintos presentes en el listado, ordenados alfabéticamente. */
export function collectMunicipiosFromRows(rows: DisplayRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const municipio = getMunicipioDisplayValue(row);
    if (municipio) {
      seen.add(municipio);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "es"));
}

/** Normaliza texto para búsqueda insensible a mayúsculas y tildes. */
export function normalizeTextoBusqueda(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function parseFiltroDiaInicio(isoDay: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    return NaN;
  }
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function parseFiltroDiaFin(isoDay: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    return NaN;
  }
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** Toma el primer id de perfil válido entre varias fuentes (servidor, historial, cola, etc.). */
export function coalesceIdPerfilEncuestador(
  ...values: Array<number | null | undefined>
): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return null;
}

/** Snapshot liviano para calcular campos faltantes en el listado de diligenciados. */
type ListPreviewFoto = NonNullable<FormularioSnapshot["fotos"]>[number];

function listPreviewFotoHasContent(foto: ListPreviewFoto): boolean {
  if (typeof foto.data === "string" && foto.data.trim() !== "") {
    return true;
  }
  if (typeof foto.path === "string" && foto.path.trim() !== "") {
    return true;
  }
  return (
    typeof foto.serverFormId === "string" &&
    foto.serverFormId.trim() !== "" &&
    typeof foto.serverIndex === "number" &&
    Number.isFinite(foto.serverIndex)
  );
}

function coalesceFotosForListPreview(
  row: DisplayRow,
  opts?: {
    precarga?: PrecargaForm | null;
    queued?: OfflineForm | null;
    serverPreview?: FormularioSnapshot | null;
  },
): FormularioSnapshot["fotos"] {
  const candidates: Array<FormularioSnapshot["fotos"] | undefined> = [
    opts?.queued?.fotos,
    row.historial?.fotos,
    opts?.precarga?.fotos,
    row.precargaSolo?.fotos,
    opts?.serverPreview?.fotos,
  ];
  if (row.server?.fotos?.length) {
    candidates.push(mapServerFotos(row.server.id_formulario, row.server.fotos));
  }

  let best: FormularioSnapshot["fotos"] = [];
  let bestContent = 0;
  for (const candidate of candidates) {
    if (!candidate?.length) {
      continue;
    }
    const contentCount = candidate.filter((foto) =>
      listPreviewFotoHasContent(foto),
    ).length;
    if (contentCount > bestContent) {
      bestContent = contentCount;
      best = candidate;
    }
  }
  return best;
}

/** Elige la lista de fotos con más entradas reconocibles (evita degradar el preview). */
export function pickRicherFotoList(
  a: FormularioSnapshot["fotos"] | undefined,
  b: FormularioSnapshot["fotos"] | undefined,
): FormularioSnapshot["fotos"] {
  const score = (fotos: FormularioSnapshot["fotos"] | undefined): number =>
    fotos?.filter((foto) => listPreviewFotoHasContent(foto)).length ?? 0;
  const scoreA = score(a);
  const scoreB = score(b);
  if (scoreB > scoreA) {
    return b ?? [];
  }
  return a ?? [];
}

/** true si hay al menos una fuente confiable de metadatos/fotos para evaluar slots. */
export function isPhotoCompletenessKnown(
  row: DisplayRow,
  opts?: {
    precarga?: PrecargaForm | null;
    queued?: OfflineForm | null;
    serverPreview?: FormularioSnapshot | null;
  },
): boolean {
  if (opts?.queued) {
    return true;
  }
  if (opts?.serverPreview) {
    return true;
  }
  if ((row.historial?.fotos ?? []).some((foto) => listPreviewFotoHasContent(foto))) {
    return true;
  }
  if ((opts?.precarga?.fotos ?? []).some((foto) => listPreviewFotoHasContent(foto))) {
    return true;
  }
  if ((row.precargaSolo?.fotos ?? []).some((foto) => listPreviewFotoHasContent(foto))) {
    return true;
  }
  if (row.server?.fotos?.length) {
    return true;
  }
  return false;
}

export function buildListPreviewSnapshot(
  row: DisplayRow,
  opts?: {
    precarga?: PrecargaForm | null;
    queued?: OfflineForm | null;
    serverPreview?: FormularioSnapshot | null;
  },
): FormularioSnapshot | null {
  const queued = opts?.queued ?? null;
  let snapshot: FormularioSnapshot | null = null;
  if (queued) {
    snapshot = {
      id_perfil_encuestador: queued.id_perfil_encuestador ?? null,
      datos_formulario: queued.datos_formulario ?? {},
      gps: queued.gps ?? null,
      fotos: [],
    };
  } else if (opts?.serverPreview) {
    snapshot = {
      id_perfil_encuestador: opts.serverPreview.id_perfil_encuestador ?? null,
      encuestador_perfil_nombre: opts.serverPreview.encuestador_perfil_nombre ?? null,
      datos_formulario: opts.serverPreview.datos_formulario ?? {},
      gps: opts.serverPreview.gps ?? null,
      fotos: [],
    };
  } else {
    const historialDatos = row.historial?.datos_formulario;
    if (historialDatos && Object.keys(historialDatos).length > 0) {
      snapshot = {
        id_perfil_encuestador: row.historial?.id_perfil_encuestador ?? null,
        datos_formulario: historialDatos,
        gps: row.historial?.gps ?? null,
        fotos: [],
      };
    } else {
      const precarga = opts?.precarga ?? row.precargaSolo ?? null;
      if (precarga) {
        snapshot = precargaToSnapshot(precarga);
        snapshot = { ...snapshot, fotos: [] };
      }
    }
  }
  if (!snapshot) {
    return null;
  }
  return {
    ...snapshot,
    fotos: coalesceFotosForListPreview(row, opts),
  };
}

function historialHasLocalDatos(historial: HistorialForm | undefined): boolean {
  const datos = historial?.datos_formulario;
  return datos != null && Object.keys(datos).length > 0;
}

function precargaHasLocalDatos(precarga: PrecargaForm | null | undefined): boolean {
  const datos = precarga?.datos_formulario;
  return datos != null && Object.keys(datos).length > 0;
}

/**
 * true cuando los datos locales (cola, historial pendiente o precarga offline)
 * deben prevalecer sobre los contadores del servidor en el badge del listado.
 */
export function shouldPreferLocalCompleteness(
  row: DisplayRow,
  opts?: {
    precarga?: PrecargaForm | null;
    queued?: OfflineForm | null;
  },
): boolean {
  if (opts?.queued) {
    return true;
  }
  const estado = row.historial?.estado;
  if (
    historialHasLocalDatos(row.historial) &&
    (estado === "PENDIENTE" || estado === "ERROR" || !row.onServer)
  ) {
    return true;
  }
  const precarga = opts?.precarga ?? row.precargaSolo ?? null;
  if (!row.onServer && precargaHasLocalDatos(precarga)) {
    return true;
  }
  return false;
}

/** Badge del listado: servidor (search) si aplica; si no, cálculo local sobre snapshot. */
export function getMissingBadgeForListRow(
  row: DisplayRow,
  opts?: {
    precarga?: PrecargaForm | null;
    queued?: OfflineForm | null;
  },
): string | null {
  const precarga = opts?.precarga ?? row.precargaSolo ?? null;
  const queued = opts?.queued ?? null;

  if (
    !shouldPreferLocalCompleteness(row, { precarga, queued }) &&
    row.onServer &&
    hasServerCompletenessCounts(row.server)
  ) {
    return getMissingBadgeFromServerCounts(row.server);
  }

  const snapshot = buildListPreviewSnapshot(row, {
    precarga,
    queued,
    serverPreview: null,
  });
  if (!snapshot) {
    return null;
  }
  return getMissingBadgeFromSnapshot(snapshot, {
    includePhotos: isPhotoCompletenessKnown(row, { precarga, queued, serverPreview: null }),
  });
}

export function precargaToSnapshot(precarga: {
  id_perfil_encuestador?: number | null;
  encuestador_perfil_nombre?: string | null;
  datos_formulario?: Record<string, unknown>;
  gps?: FormularioSnapshot["gps"];
  fotos?: FormularioSnapshot["fotos"];
}): FormularioSnapshot {
  return {
    id_perfil_encuestador: precarga.id_perfil_encuestador ?? null,
    encuestador_perfil_nombre: precarga.encuestador_perfil_nombre ?? null,
    datos_formulario: precarga.datos_formulario ?? {},
    gps: precarga.gps ?? null,
    fotos: precarga.fotos ?? [],
  };
}

export function buildFormValuesFromSnapshot(snapshot: FormularioSnapshot): FormValues {
  const base = Object.fromEntries(REQUIRED_FIELDS.map((k) => [k, ""])) as FormValues;
  const raw = snapshot.datos_formulario ?? {};
  for (const key of REQUIRED_FIELDS) {
    const value = (raw as Record<string, unknown>)[key];
    if (value == null) {
      continue;
    }
    if (typeof value === "string") {
      base[key] = value;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      base[key] = String(value);
    }
  }
  if (
    typeof snapshot.id_perfil_encuestador === "number" &&
    snapshot.id_perfil_encuestador > 0
  ) {
    base.id_perfil_encuestador = String(snapshot.id_perfil_encuestador);
  }
  return applyDatosEncuestadoToFormValues(applyCuentaConCocinaToFormValues(base));
}
