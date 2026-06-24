import { describe, expect, it } from "vitest";

import {
  formatInformacionVivienda,
  INFORMACION_VIVIENDA,
} from "@/constants/informacionVivienda";

describe("formatInformacionVivienda", () => {
  it("formatea las cuatro opciones del formulario", () => {
    expect(formatInformacionVivienda(INFORMACION_VIVIENDA.SIN_SERVICIO_ENERGIA)).toBe(
      "Sin servicio de energía",
    );
    expect(
      formatInformacionVivienda(INFORMACION_VIVIENDA.SERVICIO_IRREGULAR_DIRECTO),
    ).toBe("Servicio irregular directo");
    expect(
      formatInformacionVivienda(INFORMACION_VIVIENDA.SERVICIO_IRREGULAR_INDIRECTO),
    ).toBe("Servicio irregular indirecto");
    expect(formatInformacionVivienda(INFORMACION_VIVIENDA.SERVICIO_LEGAL)).toBe(
      "Con servicio legal",
    );
  });

  it("devuelve mensaje por defecto si no hay valor", () => {
    expect(formatInformacionVivienda("")).toBe("Sin información registrada");
  });
});
