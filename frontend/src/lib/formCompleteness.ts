import type { FormularioSnapshot } from "@/components/form/FormularioRespuestaReadOnly";
import {
  isRegistroFotoSlot,
  REGISTRO_FOTO_SLOT_NUMBERS,
  type RegistroFotoSlot,
} from "@/config/registroFotografico";
import { GPS_PLACEHOLDER_WHEN_NOT_CAPTURED } from "@/constants/gpsConfig";
import {
  isCuentaConCocinaOtroSelection,
  parseCuentaConCocinaFromStorage,
} from "@/lib/cuentaConCocina";
import {
  isDatosEncuestadoOtroSelection,
  parseDatosEncuestadoFromStorage,
} from "@/lib/datosEncuestado";
import { normalizeCoordNumericCell } from "@/lib/coordNumericToken";
import { REQUIRED_FIELDS, type FormFieldKey, type FormValues } from "@/types/formFields";
import { buildFormValuesFromSnapshot } from "@/services/formHistory";

function isBlank(value: string): boolean {
  return value.trim() === "";
}

function isGpsPlaceholder(
  gps: FormularioSnapshot["gps"] | null | undefined,
): boolean {
  if (!gps) {
    return true;
  }
  return (
    gps.latitud === GPS_PLACEHOLDER_WHEN_NOT_CAPTURED.latitud &&
    gps.longitud === GPS_PLACEHOLDER_WHEN_NOT_CAPTURED.longitud
  );
}

function coordFieldFilled(value: string, gpsCoord: number | undefined): boolean {
  const token = normalizeCoordNumericCell(value);
  if (token !== "" && token !== "0") {
    return true;
  }
  if (typeof gpsCoord === "number" && Number.isFinite(gpsCoord) && gpsCoord !== 0) {
    return true;
  }
  return false;
}

/** Campos auxiliares que solo cuentan si el select principal eligió OTRO. */
const CONDITIONAL_OTRO_FIELDS: Partial<
  Record<FormFieldKey, (values: FormValues) => boolean>
> = {
  cuenta_con_cocina_otro: (values) =>
    isCuentaConCocinaOtroSelection(values.cuenta_con_cocina),
  datos_encuestado_otro: (values) =>
    isDatosEncuestadoOtroSelection(values.datos_encuestado),
};

function isFieldMissing(
  key: FormFieldKey,
  values: FormValues,
  gps: FormularioSnapshot["gps"] | null | undefined,
): boolean {
  const conditional = CONDITIONAL_OTRO_FIELDS[key];
  if (conditional && !conditional(values)) {
    return false;
  }

  if (key === "latitud") {
    return !coordFieldFilled(values.latitud, gps?.latitud);
  }
  if (key === "longitud") {
    return !coordFieldFilled(values.longitud, gps?.longitud);
  }

  if (key === "cuenta_con_cocina") {
    const parsed = parseCuentaConCocinaFromStorage(
      values.cuenta_con_cocina,
      values.cuenta_con_cocina_otro,
    );
    if (isCuentaConCocinaOtroSelection(parsed.cuenta_con_cocina)) {
      return isBlank(parsed.cuenta_con_cocina_otro);
    }
    return isBlank(parsed.cuenta_con_cocina);
  }

  if (key === "datos_encuestado") {
    const parsed = parseDatosEncuestadoFromStorage(
      values.datos_encuestado,
      values.datos_encuestado_otro,
    );
    if (isDatosEncuestadoOtroSelection(parsed.datos_encuestado)) {
      return isBlank(parsed.datos_encuestado_otro);
    }
    return isBlank(parsed.datos_encuestado);
  }

  return isBlank(values[key]);
}

function resolveFotoSlot(
  foto: {
    slot?: unknown;
    visita?: unknown;
    serverIndex?: number;
  },
  orderedIndex?: number,
): RegistroFotoSlot | null {
  if (isRegistroFotoSlot(foto.slot)) {
    return foto.slot;
  }
  if (
    foto.visita === 1 ||
    foto.visita === 2 ||
    foto.visita === 3 ||
    foto.visita === 4
  ) {
    return foto.visita as RegistroFotoSlot;
  }
  if (
    typeof foto.serverIndex === "number" &&
    foto.serverIndex >= 0 &&
    foto.serverIndex < REGISTRO_FOTO_SLOT_NUMBERS.length
  ) {
    return REGISTRO_FOTO_SLOT_NUMBERS[foto.serverIndex] ?? null;
  }
  if (
    typeof orderedIndex === "number" &&
    orderedIndex >= 0 &&
    orderedIndex < REGISTRO_FOTO_SLOT_NUMBERS.length
  ) {
    return REGISTRO_FOTO_SLOT_NUMBERS[orderedIndex] ?? null;
  }
  return null;
}

function fotoSlotHasContent(foto: {
  data?: string;
  path?: string;
  serverFormId?: string;
  serverIndex?: number;
}): boolean {
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

export function getMissingPhotoSlots(
  fotos: FormularioSnapshot["fotos"] | undefined,
): RegistroFotoSlot[] {
  const list = fotos ?? [];
  const present = new Set<RegistroFotoSlot>();

  for (const [index, foto] of list.entries()) {
    if (!fotoSlotHasContent(foto)) {
      continue;
    }
    const slot = resolveFotoSlot(foto, index);
    if (slot != null) {
      present.add(slot);
    }
  }

  const unresolvedWithContent = list.filter(
    (foto, index) =>
      fotoSlotHasContent(foto) && resolveFotoSlot(foto, index) == null,
  );
  const missingSlots = REGISTRO_FOTO_SLOT_NUMBERS.filter(
    (slot) => !present.has(slot),
  );
  for (
    let i = 0;
    i < unresolvedWithContent.length && i < missingSlots.length;
    i += 1
  ) {
    present.add(missingSlots[i]);
  }

  return REGISTRO_FOTO_SLOT_NUMBERS.filter((slot) => !present.has(slot));
}

export function countMissingPhotoSlots(
  fotos: FormularioSnapshot["fotos"] | undefined,
): number {
  return getMissingPhotoSlots(fotos).length;
}

function shouldSkipFieldInCompletenessLoop(key: FormFieldKey): boolean {
  return key === "cuenta_con_cocina_otro" || key === "datos_encuestado_otro";
}

export function countMissingFormFields(values: FormValues): number {
  let missing = 0;
  for (const key of REQUIRED_FIELDS) {
    if (shouldSkipFieldInCompletenessLoop(key)) {
      continue;
    }
    if (isFieldMissing(key, values, null)) {
      missing += 1;
    }
  }
  return missing;
}

export function getMissingFormFieldKeysFromSnapshot(
  snapshot: FormularioSnapshot,
): Set<FormFieldKey> {
  const values = buildFormValuesFromSnapshot(snapshot);
  const gps = isGpsPlaceholder(snapshot.gps) ? null : snapshot.gps;
  const missing = new Set<FormFieldKey>();
  for (const key of REQUIRED_FIELDS) {
    if (shouldSkipFieldInCompletenessLoop(key)) {
      continue;
    }
    if (isFieldMissing(key, values, gps)) {
      missing.add(key);
    }
  }
  return missing;
}

export function countMissingFormFieldsFromSnapshot(
  snapshot: FormularioSnapshot,
): number {
  return (
    getMissingFormFieldKeysFromSnapshot(snapshot).size +
    countMissingPhotoSlots(snapshot.fotos)
  );
}

export type MissingPendingSummary = {
  missingFieldCount: number;
  missingPhotoCount: number;
};

export function getMissingPendingSummary(
  snapshot: FormularioSnapshot,
  options?: { includePhotos?: boolean },
): MissingPendingSummary {
  const includePhotos = options?.includePhotos !== false;
  return {
    missingFieldCount: getMissingFormFieldKeysFromSnapshot(snapshot).size,
    missingPhotoCount: includePhotos
      ? countMissingPhotoSlots(snapshot.fotos)
      : 0,
  };
}

export function getMissingBadgeFromSnapshot(
  snapshot: FormularioSnapshot,
  options?: { includePhotos?: boolean },
): string | null {
  return formatMissingPendingListBadge(
    getMissingPendingSummary(snapshot, options),
  );
}

export function formatMissingFieldsBadge(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1 ? "Falta 1 campo" : `Faltan ${count} campos`;
}

export function formatMissingPhotosBadge(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1 ? "Falta 1 foto" : `Faltan ${count} fotos`;
}

export function countMissingFieldsInSection(
  fieldKeys: readonly FormFieldKey[],
  missingFieldKeys: Set<FormFieldKey>,
): number {
  return fieldKeys.filter((key) => missingFieldKeys.has(key)).length;
}

/** Texto del badge en el listado de diligenciados (campos y fotos por separado). */
export function formatMissingPendingListBadge(
  summary: MissingPendingSummary,
): string | null {
  const { missingFieldCount, missingPhotoCount } = summary;
  if (missingFieldCount === 0 && missingPhotoCount === 0) {
    return null;
  }
  if (missingFieldCount > 0 && missingPhotoCount === 0) {
    return formatMissingFieldsBadge(missingFieldCount);
  }
  if (missingFieldCount === 0 && missingPhotoCount > 0) {
    return formatMissingPhotosBadge(missingPhotoCount);
  }
  const fieldsLabel =
    missingFieldCount === 1 ? "1 campo" : `${missingFieldCount} campos`;
  const photosLabel =
    missingPhotoCount === 1 ? "1 foto" : `${missingPhotoCount} fotos`;
  return `Faltan ${fieldsLabel} y ${photosLabel}`;
}

export function hasServerCompletenessCounts(
  counts: { missing_field_count?: number; missing_photo_count?: number } | null | undefined,
): counts is { missing_field_count: number; missing_photo_count: number } {
  return (
    counts != null &&
    typeof counts.missing_field_count === "number" &&
    typeof counts.missing_photo_count === "number"
  );
}

export function getMissingBadgeFromServerCounts(
  counts: { missing_field_count: number; missing_photo_count: number },
): string | null {
  return formatMissingPendingListBadge({
    missingFieldCount: counts.missing_field_count,
    missingPhotoCount: counts.missing_photo_count,
  });
}
