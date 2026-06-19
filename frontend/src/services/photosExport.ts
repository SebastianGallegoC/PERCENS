import JSZip from "jszip";

import {
  isRegistroFotoSlot,
  REGISTRO_FOTO_SLOTS,
  type RegistroFotoSlot,
} from "@/config/registroFotografico";
import type { FotoForm, OfflineForm } from "@/services/db";

function stripWindowsIllegalChars(value: string): string {
  return [...value]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && !'<>:"/\\|?*'.includes(ch);
    })
    .join("");
}

export function photosExportDateStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Carpeta raíz dentro del ZIP: `FotosFormulariosPercens-YYYY-MM-DD`. */
export function photosExportRootFolderName(date = new Date()): string {
  return `FotosFormulariosPercens-${photosExportDateStamp(date)}`;
}

/** Subcarpeta por encuestado (nombre del beneficiario). */
export function photosExportEncuestadoFolderName(form: OfflineForm): string {
  const datos = form.datos_formulario as Record<string, unknown>;
  let raw = String(datos.nombres_apellidos_encuestado ?? "").trim();
  raw = stripWindowsIllegalChars(raw);
  raw = raw.replace(/\s+/g, " ").replace(/^ +| +$/g, "");
  raw = raw.replace(/[.\s]+$/g, "");
  raw = raw.slice(0, 80);
  return raw.length > 0 ? raw : "sin encuestado";
}

/** Nombre del archivo .zip descargado. */
export function photosZipFilename(date = new Date()): string {
  return `${photosExportRootFolderName(date)}.zip`;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const t = dataUrl.trim();
  if (!t.startsWith("data:")) {
    throw new Error("La foto no está en formato data URL.");
  }
  const comma = t.indexOf(",");
  if (comma === -1) {
    throw new Error("Data URL inválida (falta separador base64).");
  }
  const payload = t.slice(comma + 1).trim();
  const isBase64 = /;base64/i.test(t.slice(0, comma));
  if (!isBase64) {
    throw new Error("Solo se admiten imágenes en base64.");
  }
  try {
    const binary = atob(payload);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    throw new Error("No se pudo decodificar una imagen (base64 inválido).");
  }
}

function safeBasename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim() || "foto.jpg";
  return base.replace(/\.\./g, "_");
}

function extensionFromNombreArchivo(name: string): string {
  const base = safeBasename(name);
  const dot = base.lastIndexOf(".");
  if (dot > 0 && dot < base.length - 1) {
    return base.slice(dot);
  }
  return "";
}

export function fotoExportFileName(
  slot: RegistroFotoSlot,
  nombreArchivo: string,
): string {
  return `foto${slot}${extensionFromNombreArchivo(nombreArchivo)}`;
}

function uniqueEncuestadoFolderName(baseName: string, used: Set<string>): string {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  let n = 2;
  let candidate = `${baseName}-${n}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${baseName}-${n}`;
  }
  used.add(candidate);
  return candidate;
}

function resolveFotoSlot(foto: FotoForm): RegistroFotoSlot | null {
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
  return null;
}

function partitionFotosBySlot(fotos: FotoForm[]): Record<RegistroFotoSlot, FotoForm[]> {
  const bySlot = Object.fromEntries(
    REGISTRO_FOTO_SLOTS.map(({ slot }) => [slot, [] as FotoForm[]]),
  ) as Record<RegistroFotoSlot, FotoForm[]>;
  for (const foto of fotos) {
    const slot = resolveFotoSlot(foto);
    if (slot != null) {
      bySlot[slot].push(foto);
    }
  }
  return bySlot;
}

function appendFormPhotosToZip(
  zip: JSZip,
  form: OfflineForm,
  rootFolder: string,
  encuestadoFolder: string,
): boolean {
  const fotos = (form.fotos ?? []).filter(
    (f): f is FotoForm => typeof f?.data === "string" && f.data.trim() !== "",
  );
  if (fotos.length === 0) {
    return false;
  }

  const bySlot = partitionFotosBySlot(fotos);
  let addedAtLeastOne = false;
  const folderBase = `${rootFolder}/${encuestadoFolder}`;

  for (const { slot } of REGISTRO_FOTO_SLOTS) {
    const list = bySlot[slot];
    if (list.length === 0) {
      continue;
    }
    const foto = list[0];
    const fileName = fotoExportFileName(slot, foto.nombre_archivo);
    const bytes = dataUrlToUint8Array(foto.data);
    zip.file(`${folderBase}/${fileName}`, bytes);
    addedAtLeastOne = true;
  }

  return addedAtLeastOne;
}

export async function buildPhotosZip(
  form: OfflineForm,
  date = new Date(),
): Promise<Blob> {
  const fotos = form.fotos ?? [];
  if (fotos.length === 0) {
    throw new Error("No hay fotos para exportar.");
  }

  const zip = new JSZip();
  const rootFolder = photosExportRootFolderName(date);
  const encuestadoFolder = photosExportEncuestadoFolderName(form);
  const added = appendFormPhotosToZip(zip, form, rootFolder, encuestadoFolder);
  if (!added) {
    throw new Error("No hay fotos para exportar.");
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function downloadPhotosZip(form: OfflineForm): Promise<void> {
  const date = new Date();
  const blob = await buildPhotosZip(form, date);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = photosZipFilename(date);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function photosBulkZipFilename(date = new Date()): string {
  return photosZipFilename(date);
}

export async function buildPhotosBulkZip(
  forms: OfflineForm[],
  date = new Date(),
): Promise<Blob> {
  const zip = new JSZip();
  const rootFolder = photosExportRootFolderName(date);
  const usedEncuestadoFolders = new Set<string>();
  let addedAtLeastOne = false;

  for (const form of forms) {
    const baseName = photosExportEncuestadoFolderName(form);
    const encuestadoFolder = uniqueEncuestadoFolderName(
      baseName,
      usedEncuestadoFolders,
    );
    if (
      appendFormPhotosToZip(zip, form, rootFolder, encuestadoFolder)
    ) {
      addedAtLeastOne = true;
    }
  }

  if (!addedAtLeastOne) {
    throw new Error("No hay fotos para exportar en los formularios seleccionados.");
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function downloadPhotosBulkZip(forms: OfflineForm[]): Promise<void> {
  const date = new Date();
  const blob = await buildPhotosBulkZip(forms, date);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = photosBulkZipFilename(date);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
