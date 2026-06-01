import { describe, expect, it } from "vitest";

import { isSearchableSelectField, TIPO_DOCUMENTO_OPTIONS } from "@/config/formSelectOptions";

describe("formSelectOptions — tipo documento", () => {
  it("expone opciones de tipo de documento para perfiles y formulario", () => {
    expect(TIPO_DOCUMENTO_OPTIONS).toContain("CÉDULA DE CIUDADANÍA");
    expect(TIPO_DOCUMENTO_OPTIONS).toHaveLength(4);
  });
});

describe("formSelectOptions — búsqueda en select", () => {
  it("solo municipio usa búsqueda por texto", () => {
    expect(isSearchableSelectField("municipio")).toBe(true);
    expect(isSearchableSelectField("autoriza_tratamiento_datos")).toBe(false);
    expect(isSearchableSelectField("datos_encuestado")).toBe(false);
    expect(isSearchableSelectField("tipo_documento_encuestado")).toBe(false);
    expect(isSearchableSelectField("informacion_vivienda")).toBe(false);
    expect(isSearchableSelectField("cuenta_con_cocina")).toBe(false);
    expect(isSearchableSelectField("resultado_validacion")).toBe(false);
    expect(isSearchableSelectField("medio_transporte")).toBe(false);
  });
});
