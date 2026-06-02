import { Workbook, type Worksheet } from "exceljs";

import { GPS_PLACEHOLDER_WHEN_NOT_CAPTURED } from "@/constants/gpsConfig";
import {
  COORD_NUMERIC_FIELD_KEYS,
  normalizeCoordNumericCell,
} from "@/lib/coordNumericToken";
import type { OfflineForm } from "@/services/db";

export const MATRIZ_COLUMN_COUNT = 29;
export const MATRIZ_SHEET_NAME = "Plantilla";
/** Ruta pública de la plantilla Excel (archivo en `frontend/public/templates/`). */
export const MATRIZ_TEMPLATE_PUBLIC_PATH = "/templates/PLANTILLA.xlsx";

export const MATRIZ_F_PSA_HEADERS: readonly string[] = [
  "LATITUD",
  "LONGITUD",
  "METROS SOBRE EL NIVEL DEL MAR",
  "TRATAMIENTO DE DATOS",
  "FECHA DE LA VISITA",
  "MUNICIPIO",
  "VEREDA",
  "NOMBRE DEL PREDIO",
  "DATOS DEL ENCUESTADO",
  "NOMBRES Y APELLIDOS",
  "IDENTIFICACIÓN",
  "N°",
  "NÚMERO TELEFÓNICO",
  "EDAD",
  "INFORMACIÓN DE LA VIVIENDA",
  "¿CUENTA CON COCINA?",
  "RESULTADO DE VALIDACIÓN",
  "OBSERVACIONES",
  "TIEMPO DE DESPLAZAMIENTO - HORAS",
  "TIEMPO DE DESPLAZAMIENTO - MINUTOS",
  "MEDIO DE TRANSPORTE",
  "COMENTARIOS",
  "NOMBRES Y APELLIDOS",
  "IDENTIFICACIÓN",
  "N°",
  "NÚMERO TELEFÓNICO",
  "CARGO",
  "EMPRESA Y/O ENTIDAD",
  "FIRMA",
] as const;

if (MATRIZ_F_PSA_HEADERS.length !== MATRIZ_COLUMN_COUNT) {
  throw new Error(`survey: se esperan ${MATRIZ_COLUMN_COUNT} columnas`);
}

export type MatrizRowCellSource =
  | { kind: "field"; key: string }
  | { kind: "fecha"; key: string }
  | { kind: "lon" }
  | { kind: "lat" }
  | { kind: "cocina" };

export const MATRIZ_ROW_CELL_SOURCES: readonly MatrizRowCellSource[] = [
  { kind: "lat" },
  { kind: "lon" },
  { kind: "field", key: "metros_sobre_nivel_mar" },
  { kind: "field", key: "autoriza_tratamiento_datos" },
  { kind: "fecha", key: "fecha_visita" },
  { kind: "field", key: "municipio" },
  { kind: "field", key: "vereda" },
  { kind: "field", key: "nombre_predio" },
  { kind: "field", key: "datos_encuestado" },
  { kind: "field", key: "nombres_apellidos_encuestado" },
  { kind: "field", key: "tipo_documento_encuestado" },
  { kind: "field", key: "numero_documento_encuestado" },
  { kind: "field", key: "telefono_encuestado" },
  { kind: "field", key: "edad_encuestado" },
  { kind: "field", key: "informacion_vivienda" },
  { kind: "cocina" },
  { kind: "field", key: "resultado_validacion" },
  { kind: "field", key: "observaciones" },
  { kind: "field", key: "tiempo_desplazamiento_horas" },
  { kind: "field", key: "tiempo_desplazamiento_minutos" },
  { kind: "field", key: "medio_transporte" },
  { kind: "field", key: "comentarios_desplazamiento" },
  { kind: "field", key: "nombres_apellidos_encuestador" },
  { kind: "field", key: "tipo_documento_encuestador" },
  { kind: "field", key: "numero_documento_encuestador" },
  { kind: "field", key: "telefono_encuestador" },
  { kind: "field", key: "cargo_encuestador" },
  { kind: "field", key: "empresa_entidad_encuestador" },
  { kind: "field", key: "firma_encuestador" },
] as const;

if (MATRIZ_ROW_CELL_SOURCES.length !== MATRIZ_COLUMN_COUNT) {
  throw new Error(
    `survey: MATRIZ_ROW_CELL_SOURCES debe tener ${MATRIZ_COLUMN_COUNT} entradas`,
  );
}

function strFromDatos(datos: Record<string, unknown>, key: string): string {
  const v = datos[key];
  if (v == null) {
    return "";
  }
  return String(v).trim();
}

function coordTokenFromDatos(datos: Record<string, unknown>, key: string): string {
  return normalizeCoordNumericCell(strFromDatos(datos, key));
}

export function isGpsPlaceholderForExport(gps: OfflineForm["gps"]): boolean {
  return (
    gps.latitud === GPS_PLACEHOLDER_WHEN_NOT_CAPTURED.latitud &&
    gps.longitud === GPS_PLACEHOLDER_WHEN_NOT_CAPTURED.longitud
  );
}

export function coordFieldForMatrizExport(
  datos: Record<string, unknown>,
  key: string,
): string {
  return coordTokenFromDatos(datos, key);
}

function decimalCoordForMatrizExport(
  datos: Record<string, unknown>,
  key: "longitud" | "latitud",
  gps: OfflineForm["gps"],
): string {
  const token = coordTokenFromDatos(datos, key);
  if (token !== "") {
    if (token === "0" && isGpsPlaceholderForExport(gps)) {
      return "";
    }
    return token;
  }
  if (isGpsPlaceholderForExport(gps)) {
    return "";
  }
  const gpsVal = key === "longitud" ? gps.longitud : gps.latitud;
  return Number.isFinite(gpsVal) ? String(gpsVal) : "";
}

export function formatFechaMatriz(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) {
    return t;
  }
  const isoDay = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (isoDay) {
    const [, year, month, day] = isoDay;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    return t;
  }
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function cocinaValue(datos: Record<string, unknown>): string {
  const main = strFromDatos(datos, "cuenta_con_cocina");
  const other = strFromDatos(datos, "cuenta_con_cocina_otro");
  const otroMatch = /^OTRO\s*-\s*(.+)$/i.exec(main);
  if (otroMatch?.[1]?.trim()) {
    return otroMatch[1].trim();
  }
  if (other && main.toUpperCase().startsWith("OTRO")) {
    return other;
  }
  return main;
}

function cellValueForSource(
  src: MatrizRowCellSource,
  form: OfflineForm,
): string {
  const datos = form.datos_formulario as Record<string, unknown>;
  if (src.kind === "lat") {
    return decimalCoordForMatrizExport(datos, "latitud", form.gps);
  }
  if (src.kind === "lon") {
    return decimalCoordForMatrizExport(datos, "longitud", form.gps);
  }
  if (src.kind === "fecha") {
    return formatFechaMatriz(strFromDatos(datos, src.key));
  }
  if (src.kind === "cocina") {
    return cocinaValue(datos);
  }
  if ((COORD_NUMERIC_FIELD_KEYS as ReadonlySet<string>).has(src.key)) {
    return coordFieldForMatrizExport(datos, src.key);
  }
  return strFromDatos(datos, src.key);
}

export function buildMatrizCaracterizacionRow(form: OfflineForm): string[] {
  return MATRIZ_ROW_CELL_SOURCES.map((src) => cellValueForSource(src, form));
}

function sanitizeFilePart(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function safeFechaFromForm(form: OfflineForm): string {
  const datos = form.datos_formulario as Record<string, unknown>;
  const fechaVisita = strFromDatos(datos, "fecha_visita");
  const formatted = fechaVisita ? formatFechaMatriz(fechaVisita) : "";
  const token = formatted.replaceAll("/", "-");
  if (token) {
    return sanitizeFilePart(token);
  }
  const sendDate = Date.parse(form.fecha_hora);
  if (Number.isNaN(sendDate)) {
    return "sin_fecha";
  }
  const d = new Date(sendDate);
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function matrizCaracterizacionFilename(form: OfflineForm): string {
  const datos = form.datos_formulario as Record<string, unknown>;
  const nombre = sanitizeFilePart(
    String(datos.nombres_apellidos_encuestado ?? "").trim(),
  ) || "sin_encuestado";
  return `${nombre}-${safeFechaFromForm(form)}.xlsx`;
}

export function matrizCaracterizacionBulkFilename(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `Encuestas_diligenciadas_${y}-${m}-${d}.xlsx`;
}

type WorksheetWithDataValidations = Worksheet & {
  dataValidations?: { model?: Record<string, unknown> };
};

function worksheetWithDataValidations(ws: Worksheet): WorksheetWithDataValidations {
  return ws as WorksheetWithDataValidations;
}

export function countWorksheetDataValidations(ws: Worksheet): number {
  const model = worksheetWithDataValidations(ws).dataValidations?.model;
  return model ? Object.keys(model).length : 0;
}

export function stripWorksheetDataValidations(ws: Worksheet): void {
  const dv = worksheetWithDataValidations(ws).dataValidations;
  if (dv?.model) {
    dv.model = {};
  }
}

async function loadTemplateWorkbook(): Promise<Workbook | null> {
  const templateUrl =
    import.meta.env.VITE_MATRIZ_TEMPLATE_URL ?? MATRIZ_TEMPLATE_PUBLIC_PATH;
  const resolvedTemplateUrl =
    templateUrl.startsWith("/") && typeof window !== "undefined"
      ? new URL(templateUrl, window.location.origin).toString()
      : templateUrl;

  try {
    const res = await fetch(resolvedTemplateUrl);
    if (!res.ok) {
      return null;
    }
    const buf = await res.arrayBuffer();
    const wb = new Workbook();
    await wb.xlsx.load(buf);
    return wb;
  } catch (e) {
    console.warn("survey: no se pudo cargar plantilla, usando builder interno", e);
    return null;
  }
}

function writeRow(ws: Worksheet, rowNumber: number, form: OfflineForm): void {
  const cells = buildMatrizCaracterizacionRow(form);
  for (let i = 0; i < cells.length; i += 1) {
    const cell = ws.getCell(rowNumber, i + 1);
    cell.value = cells[i];
    cell.alignment = { wrapText: true, vertical: "top" };
  }
}

export async function buildMatrizCaracterizacionWorkbook(
  form: OfflineForm,
): Promise<Workbook> {
  const wb = await loadTemplateWorkbook();
  if (wb) {
    const ws = wb.getWorksheet(MATRIZ_SHEET_NAME) ?? wb.worksheets[0];
    if (ws) {
      writeRow(ws, 7, form);
      return wb;
    }
  }
  return buildMatrizCaracterizacionWorkbookFromScratch([form]);
}

async function buildMatrizCaracterizacionWorkbookFromScratch(
  forms: OfflineForm[],
): Promise<Workbook> {
  const wb = new Workbook();
  const ws = wb.addWorksheet(MATRIZ_SHEET_NAME);

  const sections: Array<[number, number, string]> = [
    [1, 3, "COORDENADAS WGS84 GRADOS DECIMALES"],
    [4, 4, "TRATAMIENTO DE DATOS"],
    [5, 5, "Fecha de la Visita"],
    [6, 8, "UBICACIÓN"],
    [9, 14, "ENCUESTADO"],
    [15, 16, "VIVIENDA"],
    [17, 18, "VALIDACIÓN"],
    [19, 22, "DESPLAZAMIENTO"],
    [23, 29, "ENCUESTADOR"],
  ];

  for (const [from, to, label] of sections) {
    if (from !== to) {
      ws.mergeCells(1, from, 1, to);
    }
    const c = ws.getCell(1, from);
    c.value = label;
    c.font = { bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  MATRIZ_F_PSA_HEADERS.forEach((header, i) => {
    const c = ws.getCell(3, i + 1);
    c.value = header;
    c.font = { bold: true };
    c.alignment = { wrapText: true, vertical: "top" };
  });

  forms.forEach((form, i) => writeRow(ws, 7 + i, form));
  ws.columns = MATRIZ_F_PSA_HEADERS.map((h) => ({
    width: Math.min(42, Math.max(14, Math.ceil(h.length * 0.55 + 6))),
  }));
  return wb;
}

export async function buildMatrizCaracterizacionWorkbookBulk(
  forms: OfflineForm[],
): Promise<Workbook> {
  const wb = await loadTemplateWorkbook();
  if (wb) {
    const ws = wb.getWorksheet(MATRIZ_SHEET_NAME) ?? wb.worksheets[0];
    if (ws) {
      forms.forEach((form, i) => writeRow(ws, 7 + i, form));
      return wb;
    }
  }
  return buildMatrizCaracterizacionWorkbookFromScratch(forms);
}

async function downloadWorkbook(wb: Workbook, filename: string): Promise<void> {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadMatrizCaracterizacionXlsx(
  form: OfflineForm,
): Promise<void> {
  await downloadWorkbook(
    await buildMatrizCaracterizacionWorkbook(form),
    matrizCaracterizacionFilename(form),
  );
}

export async function downloadMatrizCaracterizacionBulkXlsx(
  forms: OfflineForm[],
): Promise<void> {
  await downloadWorkbook(
    await buildMatrizCaracterizacionWorkbookBulk(forms),
    matrizCaracterizacionBulkFilename(),
  );
}
