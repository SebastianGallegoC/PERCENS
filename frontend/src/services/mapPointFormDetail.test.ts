import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  fetchFormFromApi: vi.fn(),
  fetchFormPhotoDataUrl: vi.fn(),
}));

vi.mock("@/services/formHistory", () => ({
  mapServerFotos: vi.fn(),
}));

import { fetchFormFromApi, fetchFormPhotoDataUrl } from "@/services/api";
import { mapServerFotos } from "@/services/formHistory";
import { loadMapPointFormDetail } from "@/services/mapPointFormDetail";

describe("loadMapPointFormDetail", () => {
  beforeEach(() => {
    vi.mocked(fetchFormFromApi).mockReset();
    vi.mocked(fetchFormPhotoDataUrl).mockReset();
    vi.mocked(mapServerFotos).mockReset();
  });

  it("carga informacion_vivienda y fotos del servidor", async () => {
    vi.mocked(fetchFormFromApi).mockResolvedValue({
      id_formulario: "f-1",
      fecha_hora: "",
      fecha_actualizacion: "",
      latitud: 1,
      longitud: 2,
      precision: null,
      datos_formulario: {
        informacion_vivienda: "CON SERVICIO IRREGULAR DIRECTO",
      },
      fotos: [{ path: "uploads/a.jpg", slot: 1 }],
    });
    vi.mocked(mapServerFotos).mockReturnValue([
      {
        nombre_archivo: "a.jpg",
        serverFormId: "f-1",
        serverIndex: 0,
        slot: 1,
      },
    ]);
    vi.mocked(fetchFormPhotoDataUrl).mockResolvedValue(
      "data:image/jpeg;base64,AA==",
    );

    const detail = await loadMapPointFormDetail("f-1");

    expect(detail.informacion_vivienda).toBe("CON SERVICIO IRREGULAR DIRECTO");
    expect(detail.fotos).toEqual([
      {
        nombre_archivo: "a.jpg",
        data: "data:image/jpeg;base64,AA==",
        slot: 1,
      },
    ]);
  });
});
