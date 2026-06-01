/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EncuestadorProfileCacheRow } from "@/services/db";

const cacheStore: EncuestadorProfileCacheRow[] = [];

const cacheMocks = vi.hoisted(() => ({
  deleteByUsername: vi.fn(async (username: string) => {
    for (let i = cacheStore.length - 1; i >= 0; i -= 1) {
      if (cacheStore[i].username === username) {
        cacheStore.splice(i, 1);
      }
    }
  }),
  toArrayByUsername: vi.fn(async (username: string) =>
    cacheStore.filter((row) => row.username === username),
  ),
  bulkPut: vi.fn(async (rows: EncuestadorProfileCacheRow[]) => {
    for (const row of rows) {
      const index = cacheStore.findIndex((r) => r.id === row.id);
      if (index >= 0) {
        cacheStore[index] = row;
      } else {
        cacheStore.push(row);
      }
    }
  }),
}));

vi.mock("@/services/api", () => ({
  listEnabledEncuestadorProfilesApi: vi.fn(),
}));

const localFormsStore = {
  formularios: [] as Array<{ id_perfil_encuestador?: number | null }>,
  historialFormularios: [] as Array<{ id_perfil_encuestador?: number | null }>,
  precargas: [] as Array<{ id_perfil_encuestador?: number | null }>,
};

vi.mock("@/services/db", () => ({
  db: {
    formularios: {
      toArray: async () => localFormsStore.formularios,
    },
    historialFormularios: {
      toArray: async () => localFormsStore.historialFormularios,
    },
    precargas: {
      toArray: async () => localFormsStore.precargas,
    },
    transaction: async (_mode: string, _table: unknown, fn: () => Promise<void>) => {
      await fn();
    },
    encuestadorProfilesCache: {
      where: () => ({
        equals: (username: string) => ({
          delete: () => cacheMocks.deleteByUsername(username),
          toArray: () => cacheMocks.toArrayByUsername(username),
        }),
      }),
      bulkPut: (rows: EncuestadorProfileCacheRow[]) => cacheMocks.bulkPut(rows),
    },
  },
}));

import { listEnabledEncuestadorProfilesApi } from "@/services/api";
import {
  encuestadorProfileCanBeDeleted,
  encuestadorProfileHasServerForms,
  formatPerfilEncuestadorDisplay,
  listEnabledEncuestadorProfilesLocal,
  resolveEncuestadorProfileNombre,
  syncEnabledEncuestadorProfiles,
} from "@/services/encuestadorProfiles";

describe("formatPerfilEncuestadorDisplay", () => {
  it("muestra nombre e id cuando hay caché", () => {
    expect(formatPerfilEncuestadorDisplay(3, "Ana Pérez")).toBe("Ana Pérez (ID 3)");
  });

  it("muestra solo id si no hay nombre", () => {
    expect(formatPerfilEncuestadorDisplay(5, null)).toBe("Perfil ID 5");
  });

  it("muestra guión sin perfil válido", () => {
    expect(formatPerfilEncuestadorDisplay(null)).toBe("—");
    expect(formatPerfilEncuestadorDisplay(0)).toBe("—");
  });
});

describe("encuestadorProfileCanBeDeleted", () => {
  beforeEach(() => {
    localFormsStore.formularios = [];
    localFormsStore.historialFormularios = [];
    localFormsStore.precargas = [];
  });

  it("rechaza si el servidor reporta formularios asociados", async () => {
    expect(
      await encuestadorProfileCanBeDeleted({ id: 1, formularios_asociados: 2 }),
    ).toBe(false);
  });

  it("rechaza si hay formularios locales con el mismo perfil", async () => {
    localFormsStore.historialFormularios = [{ id_perfil_encuestador: 5 }];
    expect(await encuestadorProfileCanBeDeleted({ id: 5, formularios_asociados: 0 })).toBe(
      false,
    );
  });

  it("permite eliminar sin vínculos", async () => {
    expect(await encuestadorProfileCanBeDeleted({ id: 3, formularios_asociados: 0 })).toBe(true);
  });
});

describe("encuestadorProfileHasServerForms", () => {
  it("detecta conteo positivo", () => {
    expect(encuestadorProfileHasServerForms({ formularios_asociados: 1 })).toBe(true);
    expect(encuestadorProfileHasServerForms({ formularios_asociados: 0 })).toBe(false);
  });
});

describe("encuestadorProfiles", () => {
  beforeEach(() => {
    cacheStore.length = 0;
    localFormsStore.formularios = [];
    localFormsStore.historialFormularios = [];
    localFormsStore.precargas = [];
    vi.clearAllMocks();
  });

  it("resolveEncuestadorProfileNombre lee desde caché local", async () => {
    cacheStore.push({
      id: 7,
      username: "u1",
      nombre: "Carlos Ruiz",
      habilitado: true,
      updated_at: "2026-01-01T00:00:00Z",
    });
    await expect(resolveEncuestadorProfileNombre("u1", 7)).resolves.toBe(
      "Carlos Ruiz",
    );
    await expect(resolveEncuestadorProfileNombre("u1", 99)).resolves.toBeNull();
  });

  it("syncEnabledEncuestadorProfiles persiste id y nombre por usuario", async () => {
    vi.mocked(listEnabledEncuestadorProfilesApi).mockResolvedValue([
      { id: 2, nombre: "María López" },
      { id: 1, nombre: "Ana Pérez" },
    ]);

    const items = await syncEnabledEncuestadorProfiles("encuestador1");

    expect(items).toHaveLength(2);
    expect(cacheStore).toHaveLength(2);
    expect(cacheStore.every((row) => row.username === "encuestador1")).toBe(true);
    expect(cacheStore.find((row) => row.id === 1)?.nombre).toBe("Ana Pérez");
    expect(cacheStore.find((row) => row.id === 2)?.nombre).toBe("María López");
  });

  it("re-sync reemplaza el catálogo del usuario", async () => {
    vi.mocked(listEnabledEncuestadorProfilesApi).mockResolvedValueOnce([
      { id: 1, nombre: "Ana Pérez" },
      { id: 2, nombre: "María López" },
    ]);
    await syncEnabledEncuestadorProfiles("user-a");

    vi.mocked(listEnabledEncuestadorProfilesApi).mockResolvedValueOnce([
      { id: 3, nombre: "Carlos Ruiz" },
    ]);
    await syncEnabledEncuestadorProfiles("user-a");

    const local = await listEnabledEncuestadorProfilesLocal("user-a");
    expect(local).toEqual([{ id: 3, nombre: "Carlos Ruiz" }]);
    expect(cacheStore.some((row) => row.id === 1 || row.id === 2)).toBe(false);
  });

  it("listEnabledEncuestadorProfilesLocal ordena por nombre (es)", async () => {
    cacheStore.push(
      {
        id: 2,
        username: "user-b",
        nombre: "Zorro",
        habilitado: true,
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: 1,
        username: "user-b",
        nombre: "Árbol",
        habilitado: true,
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: 3,
        username: "user-b",
        nombre: "Mesa",
        habilitado: false,
        updated_at: "2026-01-01T00:00:00Z",
      },
    );

    const local = await listEnabledEncuestadorProfilesLocal("user-b");

    expect(local).toEqual([
      { id: 1, nombre: "Árbol" },
      { id: 2, nombre: "Zorro" },
    ]);
  });

  it("no mezcla perfiles de distintos usuarios", async () => {
    vi.mocked(listEnabledEncuestadorProfilesApi).mockResolvedValueOnce([
      { id: 1, nombre: "Usuario A" },
    ]);
    await syncEnabledEncuestadorProfiles("user-a");

    vi.mocked(listEnabledEncuestadorProfilesApi).mockResolvedValueOnce([
      { id: 10, nombre: "Usuario B" },
    ]);
    await syncEnabledEncuestadorProfiles("user-b");

    expect(await listEnabledEncuestadorProfilesLocal("user-a")).toEqual([
      { id: 1, nombre: "Usuario A" },
    ]);
    expect(await listEnabledEncuestadorProfilesLocal("user-b")).toEqual([
      { id: 10, nombre: "Usuario B" },
    ]);
  });
});
