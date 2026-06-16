import { describe, expect, it } from "vitest";

import {
  countMissingFormFields,
  countMissingFormFieldsFromSnapshot,
  countMissingPhotoSlots,
  formatMissingPendingListBadge,
  getMissingBadgeFromSnapshot,
  getMissingFormFieldKeysFromSnapshot,
  getMissingPendingSummary,
} from "@/lib/formCompleteness";
import { REQUIRED_FIELDS, type FormValues } from "@/types/formFields";

const emptyValues = (): FormValues =>
  Object.fromEntries(REQUIRED_FIELDS.map((k) => [k, ""])) as FormValues;

const fillAllFields = (values: FormValues): void => {
  for (const key of REQUIRED_FIELDS) {
    if (key === "latitud") {
      values.latitud = "4.5";
      continue;
    }
    if (key === "longitud") {
      values.longitud = "-72.5";
      continue;
    }
    if (key === "edad_encuestado") {
      values.edad_encuestado = "30";
      continue;
    }
    if (key === "id_perfil_encuestador") {
      values.id_perfil_encuestador = "1";
      continue;
    }
    values[key] = `valor-${key}`;
  }
};

describe("formCompleteness", () => {
  it("cuenta todos los campos vacíos en un formulario nuevo", () => {
    expect(countMissingFormFields(emptyValues())).toBe(REQUIRED_FIELDS.length - 2);
  });

  it("no exige cuenta_con_cocina_otro si no eligió OTRO", () => {
    const values = emptyValues();
    values.cuenta_con_cocina = "SI";
    const missing = countMissingFormFields(values);
    expect(missing).toBeLessThan(REQUIRED_FIELDS.length - 2);
  });

  it("exige texto si datos_encuestado es OTRO", () => {
    const values = emptyValues();
    values.datos_encuestado = "OTRO";
    values.nombres_apellidos_encuestado = "Ana";
    values.fecha_visita = "2026-05-01";
    const withOtro = countMissingFormFields(values);
    values.datos_encuestado_otro = "Familiar";
    const completeOtro = countMissingFormFields(values);
    expect(completeOtro).toBeLessThan(withOtro);
  });

  it("exige texto si cuenta_con_cocina es OTRO", () => {
    const values = emptyValues();
    fillAllFields(values);
    values.cuenta_con_cocina = "OTRO";
    values.cuenta_con_cocina_otro = "";
    const withOtro = countMissingFormFields(values);
    values.cuenta_con_cocina_otro = "Cocina de leña";
    const completeOtro = countMissingFormFields(values);
    expect(withOtro).toBe(1);
    expect(completeOtro).toBe(0);
  });

  it("exige comentarios si medio_transporte es OTRO", () => {
    const values = emptyValues();
    fillAllFields(values);
    values.medio_transporte = "OTRO";
    values.comentarios_desplazamiento = "";
    expect(countMissingFormFields(values)).toBe(1);
    values.comentarios_desplazamiento = "Bicicleta";
    expect(countMissingFormFields(values)).toBe(0);
  });

  it("exige comentarios aunque medio_transporte no sea OTRO", () => {
    const values = emptyValues();
    fillAllFields(values);
    values.medio_transporte = "CAMINANDO";
    values.comentarios_desplazamiento = "";
    expect(countMissingFormFields(values)).toBe(1);
    values.comentarios_desplazamiento = "Sin observaciones";
    expect(countMissingFormFields(values)).toBe(0);
  });

  it("cuenta los 4 campos de desplazamiento vacíos", () => {
    const values = emptyValues();
    fillAllFields(values);
    values.tiempo_desplazamiento_horas = "";
    values.tiempo_desplazamiento_minutos = "";
    values.medio_transporte = "";
    values.comentarios_desplazamiento = "";
    const missing = getMissingFormFieldKeysFromSnapshot({
      datos_formulario: values,
      gps: { latitud: 7.5, longitud: -72.25, precision: 4 },
      fotos: [],
    });
    expect(missing.has("tiempo_desplazamiento_horas")).toBe(true);
    expect(missing.has("tiempo_desplazamiento_minutos")).toBe(true);
    expect(missing.has("medio_transporte")).toBe(true);
    expect(missing.has("comentarios_desplazamiento")).toBe(true);
  });

  it("resume campos y fotos por separado en el listado", () => {
    const values = emptyValues();
    fillAllFields(values);
    values.tiempo_desplazamiento_horas = "";
    values.tiempo_desplazamiento_minutos = "";
    values.medio_transporte = "";
    values.comentarios_desplazamiento = "";
    const summary = getMissingPendingSummary({
      datos_formulario: values,
      gps: { latitud: 7.5, longitud: -72.25, precision: 4 },
      fotos: [],
    });
    expect(summary.missingFieldCount).toBe(4);
    expect(summary.missingPhotoCount).toBe(6);
    expect(formatMissingPendingListBadge(summary)).toBe(
      "Faltan 4 campos y 6 fotos",
    );
  });

  it("omite fotos del resumen cuando includePhotos es false", () => {
    const values = emptyValues();
    fillAllFields(values);
    const summary = getMissingPendingSummary(
      { datos_formulario: values, gps: null, fotos: [] },
      { includePhotos: false },
    );
    expect(summary.missingFieldCount).toBe(0);
    expect(summary.missingPhotoCount).toBe(0);
    expect(getMissingBadgeFromSnapshot(
      { datos_formulario: values, gps: null, fotos: [] },
      { includePhotos: false },
    )).toBeNull();
  });

  it("cuenta fotos faltantes desde snapshot", () => {
    expect(countMissingPhotoSlots([])).toBe(6);
    expect(
      countMissingPhotoSlots([
        { nombre_archivo: "f1.jpg", data: "data:image/jpeg;base64,abc", slot: 1 },
        { nombre_archivo: "f2.jpg", path: "/uploads/f2.jpg", slot: 2 },
      ]),
    ).toBe(4);
  });

  it("reconoce fotos del servidor por serverIndex aunque falte slot", () => {
    const fotos = Array.from({ length: 6 }, (_, index) => ({
      nombre_archivo: `foto_${index + 1}.jpg`,
      path: `uploads/2026/foto_${index + 1}.jpg`,
      serverFormId: "form-1",
      serverIndex: index,
    }));
    expect(countMissingPhotoSlots(fotos)).toBe(0);
  });

  it("suma fotos faltantes al conteo del listado", () => {
    const values = emptyValues();
    fillAllFields(values);
    const missing = countMissingFormFieldsFromSnapshot({
      datos_formulario: values,
      gps: { latitud: 7.5, longitud: -72.25, precision: 4 },
      fotos: [],
    });
    expect(missing).toBe(6);
  });

  it("cuenta desde snapshot con datos parciales", () => {
    const missing = countMissingFormFieldsFromSnapshot({
      datos_formulario: {
        nombres_apellidos_encuestado: "Ana Pérez",
        fecha_visita: "2026-05-01",
        municipio: "Cúcuta",
      },
      gps: { latitud: 7.5, longitud: -72.25, precision: 4 },
    });
    expect(missing).toBeGreaterThan(0);
    expect(missing).toBeLessThan(REQUIRED_FIELDS.length + 6);
  });
});
