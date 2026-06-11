import { describe, expect, it } from "vitest";

import {
  applyDistanciaSeguridadRule,
  distanciaSeguridadImpideCumplir,
  RESULTADO_CUMPLE,
  RESULTADO_NO_CUMPLE,
  resultadoValidacionPermitido,
} from "@/lib/distanciaSeguridadValidacion";

describe("distanciaSeguridadValidacion", () => {
  it("detecta cuando la distancia impide cumplir", () => {
    expect(distanciaSeguridadImpideCumplir("NO")).toBe(true);
    expect(distanciaSeguridadImpideCumplir("no")).toBe(true);
    expect(distanciaSeguridadImpideCumplir("SI")).toBe(false);
    expect(distanciaSeguridadImpideCumplir("")).toBe(false);
  });

  it("no permite CUMPLE si distancia es NO", () => {
    expect(resultadoValidacionPermitido("NO", RESULTADO_CUMPLE)).toBe(false);
    expect(resultadoValidacionPermitido("NO", RESULTADO_NO_CUMPLE)).toBe(true);
    expect(resultadoValidacionPermitido("NO", "")).toBe(true);
    expect(resultadoValidacionPermitido("SI", RESULTADO_CUMPLE)).toBe(true);
  });

  it("fuerza NO CUMPLE al persistir cuando distancia es NO", () => {
    expect(
      applyDistanciaSeguridadRule({
        cumple_distancia_seguridad: "NO",
        resultado_validacion: RESULTADO_CUMPLE,
      }),
    ).toEqual({ resultado_validacion: RESULTADO_NO_CUMPLE });

    expect(
      applyDistanciaSeguridadRule({
        cumple_distancia_seguridad: "SI",
        resultado_validacion: RESULTADO_CUMPLE,
      }),
    ).toEqual({ resultado_validacion: RESULTADO_CUMPLE });
  });
});
