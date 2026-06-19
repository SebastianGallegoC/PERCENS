import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DisplayRow } from "@/services/formHistory";

const apiMocks = vi.hoisted(() => ({
  fetchFormFromApi: vi.fn(),
  fetchFormPhotoDataUrl: vi.fn(),
}));

vi.mock("@/services/api", () => apiMocks);

import { hydrateFotosFromServerIfNeeded } from "@/pages/formulariosDiligenciados/helpers";

describe("hydrateFotosFromServerIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchFormFromApi.mockReset();
    apiMocks.fetchFormPhotoDataUrl.mockReset();
  });

  it("obtiene metadatos de fotos con GET detalle cuando el listado trae fotos vacías", async () => {
    apiMocks.fetchFormFromApi.mockResolvedValue({
      id_formulario: "srv-1",
      fotos: [{ path: "uploads/a.jpg", slot: 1 }],
    });
    apiMocks.fetchFormPhotoDataUrl.mockResolvedValue(
      "data:image/jpeg;base64,QQ==",
    );

    const row: DisplayRow = {
      id_formulario: "srv-1",
      onServer: true,
      server: {
        id_formulario: "srv-1",
        fecha_hora: "2026-03-01T10:00:00.000Z",
        fecha_actualizacion: "2026-03-01T10:00:00.000Z",
        latitud: 1,
        longitud: 2,
        precision: 1,
        datos_formulario: {},
        fotos: [],
        missing_photo_count: 1,
      },
    };

    const fotos = await hydrateFotosFromServerIfNeeded(row, []);

    expect(apiMocks.fetchFormFromApi).toHaveBeenCalledWith("srv-1");
    expect(apiMocks.fetchFormPhotoDataUrl).toHaveBeenCalledWith("srv-1", 0);
    expect(fotos).toEqual([
      {
        nombre_archivo: "a.jpg",
        data: "data:image/jpeg;base64,QQ==",
        slot: 1,
      },
    ]);
  });

  it("no llama al detalle si missing_photo_count es 0 y fotos vienen vacías", async () => {
    const row: DisplayRow = {
      id_formulario: "srv-2",
      onServer: true,
      server: {
        id_formulario: "srv-2",
        fecha_hora: "2026-03-01T10:00:00.000Z",
        fecha_actualizacion: "2026-03-01T10:00:00.000Z",
        latitud: 1,
        longitud: 2,
        precision: 1,
        datos_formulario: {},
        fotos: [],
        missing_photo_count: 0,
      },
    };

    const fotos = await hydrateFotosFromServerIfNeeded(row, []);

    expect(apiMocks.fetchFormFromApi).not.toHaveBeenCalled();
    expect(fotos).toEqual([]);
  });
});
