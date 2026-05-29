import { describe, expect, it } from "vitest";

import { fieldLabel, inputKindForField } from "@/config/formFieldMeta";

describe("formFieldMeta — Survey", () => {
  it("configura selectores principales de la plantilla", () => {
    expect(inputKindForField("autoriza_tratamiento_datos")).toBe("select");
    expect(inputKindForField("datos_encuestado")).toBe("select");
    expect(inputKindForField("resultado_validacion")).toBe("select");
  });

  it("configura fecha y numéricos", () => {
    expect(inputKindForField("fecha_visita")).toBe("date");
    expect(inputKindForField("edad_encuestado")).toBe("number");
    expect(inputKindForField("tiempo_desplazamiento_minutos")).toBe("number");
  });

  it("configura textareas extensibles", () => {
    expect(inputKindForField("observaciones")).toBe("textarea");
    expect(inputKindForField("comentarios_desplazamiento")).toBe("textarea");
    expect(inputKindForField("cuenta_con_cocina_otro")).toBe("textarea");
  });

  it("mantiene etiquetas específicas de columnas duplicadas", () => {
    expect(fieldLabel("nombres_apellidos_encuestado")).toBe("Nombres y apellidos");
    expect(fieldLabel("tipo_documento_encuestador")).toBe("Identificación");
    expect(fieldLabel("empresa_entidad_encuestador")).toBe("Empresa y/o entidad");
  });
});
