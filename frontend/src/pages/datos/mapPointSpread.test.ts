import { describe, expect, it } from "vitest";

import { spreadMapPoints } from "@/pages/datos/mapPointSpread";
import type { FormMapPointItem } from "@/services/api";

function samplePoint(id: string, lat: number, lng: number): FormMapPointItem {
  return {
    id_formulario: id,
    latitud: lat,
    longitud: lng,
    municipio: "Cúcuta",
    fecha_visita: "2026-06-01",
    nombres_apellidos_encuestado: "Encuestado",
    resultado_validacion: "CUMPLE",
    informacion_vivienda: "",
  };
}

describe("spreadMapPoints", () => {
  it("deja un solo punto en su coordenada original", () => {
    const spread = spreadMapPoints([samplePoint("a", 7.89, -72.49)]);
    expect(spread).toHaveLength(1);
    expect(spread[0]?.displayLat).toBe(7.89);
    expect(spread[0]?.displayLng).toBe(-72.49);
  });

  it("separa puntos con la misma coordenada", () => {
    const spread = spreadMapPoints([
      samplePoint("a", 7.89, -72.49),
      samplePoint("b", 7.89, -72.49),
      samplePoint("c", 7.89, -72.49),
    ]);

    expect(spread).toHaveLength(3);
    const positions = spread.map((p) => `${p.displayLat},${p.displayLng}`);
    expect(new Set(positions).size).toBe(3);
    expect(spread[0]?.displayLat).not.toBeCloseTo(spread[1]?.displayLat ?? 0, 6);
    expect(spread[0]?.displayLng).not.toBeCloseTo(spread[1]?.displayLng ?? 0, 6);
  });

  it("agrupa coordenadas muy cercanas en el mismo bucket", () => {
    const spread = spreadMapPoints([
      samplePoint("a", 7.890001, -72.490001),
      samplePoint("b", 7.890002, -72.490002),
    ]);

    expect(spread).toHaveLength(2);
    expect(spread[0]?.displayLat).not.toBe(spread[1]?.displayLat);
  });
});
