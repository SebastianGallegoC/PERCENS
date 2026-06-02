import {
  listEnabledEncuestadorProfilesApi,
  listEncuestadorProfilesApi,
  type EncuestadorProfileLite,
  type EncuestadorProfileRead,
} from "@/services/api";
import { db, type EncuestadorProfileCacheRow } from "@/services/db";

export type EncuestadorProfileExportFields = {
  nombres_apellidos_encuestador: string;
  tipo_documento_encuestador: string;
  numero_documento_encuestador: string;
  telefono_encuestador: string;
  cargo_encuestador: string;
  empresa_entidad_encuestador: string;
};

export const ENCUESTADOR_EXPORT_FIELD_KEYS = [
  "nombres_apellidos_encuestador",
  "tipo_documento_encuestador",
  "numero_documento_encuestador",
  "telefono_encuestador",
  "cargo_encuestador",
  "empresa_entidad_encuestador",
] as const satisfies readonly (keyof EncuestadorProfileExportFields)[];

function nowIso(): string {
  return new Date().toISOString();
}

export function encuestadorProfileToExportFields(
  profile: Pick<EncuestadorProfileRead, keyof EncuestadorProfileExportFields>,
): EncuestadorProfileExportFields {
  return {
    nombres_apellidos_encuestador: profile.nombres_apellidos_encuestador.trim(),
    tipo_documento_encuestador: profile.tipo_documento_encuestador.trim(),
    numero_documento_encuestador: profile.numero_documento_encuestador.trim(),
    telefono_encuestador: profile.telefono_encuestador.trim(),
    cargo_encuestador: profile.cargo_encuestador.trim(),
    empresa_entidad_encuestador: profile.empresa_entidad_encuestador.trim(),
  };
}

function cacheRowToExportFields(row: EncuestadorProfileCacheRow): EncuestadorProfileExportFields {
  return {
    nombres_apellidos_encuestador: row.nombre.trim(),
    tipo_documento_encuestador: row.tipo_documento_encuestador?.trim() ?? "",
    numero_documento_encuestador: row.numero_documento_encuestador?.trim() ?? "",
    telefono_encuestador: row.telefono_encuestador?.trim() ?? "",
    cargo_encuestador: row.cargo_encuestador?.trim() ?? "",
    empresa_entidad_encuestador: row.empresa_entidad_encuestador?.trim() ?? "",
  };
}

async function getSessionUsername(): Promise<string | null> {
  const row = await db.sesionLocal.get("current");
  return row?.username?.trim() || null;
}

async function persistEncuestadorProfilesExportCache(
  username: string,
  profiles: EncuestadorProfileRead[],
): Promise<void> {
  if (profiles.length === 0) {
    return;
  }
  const updatedAt = nowIso();
  await db.transaction("rw", db.encuestadorProfilesCache, async () => {
    for (const profile of profiles) {
      await db.encuestadorProfilesCache.put({
        id: profile.id,
        username,
        nombre: profile.nombres_apellidos_encuestador,
        tipo_documento_encuestador: profile.tipo_documento_encuestador,
        numero_documento_encuestador: profile.numero_documento_encuestador,
        telefono_encuestador: profile.telefono_encuestador,
        cargo_encuestador: profile.cargo_encuestador,
        empresa_entidad_encuestador: profile.empresa_entidad_encuestador,
        habilitado: profile.habilitado,
        updated_at: updatedAt,
      });
    }
  });
}

/** Resuelve datos del encuestador para Excel (sin firma). Usa API y caché local. */
export async function buildEncuestadorProfilesMapForExport(
  profileIds: Iterable<number | null | undefined>,
): Promise<Map<number, EncuestadorProfileExportFields>> {
  const wanted = new Set<number>();
  for (const id of profileIds) {
    if (typeof id === "number" && Number.isFinite(id) && id > 0) {
      wanted.add(id);
    }
  }
  const map = new Map<number, EncuestadorProfileExportFields>();
  if (wanted.size === 0) {
    return map;
  }

  const username = await getSessionUsername();
  if (username) {
    const cached = await db.encuestadorProfilesCache
      .where("username")
      .equals(username)
      .toArray();
    for (const row of cached) {
      if (wanted.has(row.id)) {
        map.set(row.id, cacheRowToExportFields(row));
      }
    }
  }

  try {
    const items = await listEncuestadorProfilesApi();
    if (username) {
      await persistEncuestadorProfilesExportCache(username, items);
    }
    for (const profile of items) {
      if (wanted.has(profile.id)) {
        map.set(profile.id, encuestadorProfileToExportFields(profile));
      }
    }
  } catch {
    // Sin red: se conserva lo disponible en caché local.
  }

  return map;
}

export async function syncEnabledEncuestadorProfiles(username: string): Promise<EncuestadorProfileLite[]> {
  const apiItems = await listEnabledEncuestadorProfilesApi();
  const updatedAt = nowIso();
  await db.transaction("rw", db.encuestadorProfilesCache, async () => {
    await db.encuestadorProfilesCache.where("username").equals(username).delete();
    if (apiItems.length === 0) {
      return;
    }
    const rows: EncuestadorProfileCacheRow[] = apiItems.map((item) => ({
      id: item.id,
      username,
      nombre: item.nombre,
      habilitado: true,
      updated_at: updatedAt,
    }));
    await db.encuestadorProfilesCache.bulkPut(rows);
  });
  return apiItems;
}

export async function listEnabledEncuestadorProfilesLocal(
  username: string,
): Promise<EncuestadorProfileLite[]> {
  const rows = await db.encuestadorProfilesCache.where("username").equals(username).toArray();
  return rows
    .filter((r) => r.habilitado)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((r) => ({ id: r.id, nombre: r.nombre }));
}

/** Texto legible para detalle / solo lectura del formulario. */
export function formatPerfilEncuestadorDisplay(
  id: number | null | undefined,
  nombre?: string | null,
): string {
  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) {
    return "—";
  }
  const label = nombre?.trim();
  if (label) {
    return `${label} (ID ${id})`;
  }
  return `Perfil ID ${id}`;
}

export async function resolveEncuestadorProfileNombre(
  username: string,
  profileId: number | null | undefined,
): Promise<string | null> {
  if (typeof profileId !== "number" || !Number.isFinite(profileId) || profileId <= 0) {
    return null;
  }
  const local = await listEnabledEncuestadorProfilesLocal(username);
  return local.find((p) => p.id === profileId)?.nombre ?? null;
}

/** Formularios locales (cola, historial o precarga) que referencian el perfil. */
export async function encuestadorProfileHasLocalForms(profileId: number): Promise<boolean> {
  const [queued, historial, precargas] = await Promise.all([
    db.formularios.toArray(),
    db.historialFormularios.toArray(),
    db.precargas.toArray(),
  ]);
  const matchesProfile = (value: number | null | undefined) => value === profileId;
  return (
    queued.some((row) => matchesProfile(row.id_perfil_encuestador)) ||
    historial.some((row) => matchesProfile(row.id_perfil_encuestador)) ||
    precargas.some((row) => matchesProfile(row.id_perfil_encuestador))
  );
}

export function encuestadorProfileHasServerForms(profile: {
  formularios_asociados?: number | null;
}): boolean {
  const count = profile.formularios_asociados ?? 0;
  return Number.isFinite(count) && count > 0;
}

export async function encuestadorProfileCanBeDeleted(profile: {
  id: number;
  formularios_asociados?: number | null;
}): Promise<boolean> {
  if (encuestadorProfileHasServerForms(profile)) {
    return false;
  }
  const local = await encuestadorProfileHasLocalForms(profile.id);
  return !local;
}

export async function enrichFormularioSnapshotEncuestador<
  T extends { id_perfil_encuestador?: number | null; encuestador_perfil_nombre?: string | null },
>(snapshot: T, username: string | null): Promise<T> {
  const id = snapshot.id_perfil_encuestador;
  if (typeof id !== "number" || id <= 0) {
    return { ...snapshot, encuestador_perfil_nombre: null };
  }
  const nombre = username
    ? await resolveEncuestadorProfileNombre(username, id)
    : null;
  return { ...snapshot, encuestador_perfil_nombre: nombre };
}
