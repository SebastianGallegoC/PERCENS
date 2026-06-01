import {
  listEnabledEncuestadorProfilesApi,
  type EncuestadorProfileLite,
} from "@/services/api";
import { db, type EncuestadorProfileCacheRow } from "@/services/db";

function nowIso(): string {
  return new Date().toISOString();
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
