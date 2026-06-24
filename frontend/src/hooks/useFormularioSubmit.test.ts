import { describe, expect, it, vi } from "vitest";

import {
  buildDatosFormulario,
  buildOfflinePayload,
  getSectionsWithErrors,
} from "@/hooks/useFormularioSubmit";
import { GPS_PLACEHOLDER_WHEN_NOT_CAPTURED } from "@/constants/gpsConfig";
import type { FotoForm } from "@/services/db";
import { REQUIRED_FIELDS, type FormValues } from "@/types/formFields";

const buildEmptyValues = (): FormValues => {
  return Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, ""])) as FormValues;
};

const basePayloadArgs = (overrides: Partial<Parameters<typeof buildOfflinePayload>[0]> = {}) => ({
  values: buildEmptyValues(),
  requiredFields: REQUIRED_FIELDS,
  formId: "form-123",
  originalFechaHora: null,
  gps: { latitud: 4.1, longitud: -74.1, precision: 9.9 } as const,
  fotos: [] as FotoForm[],
  ...overrides,
});

describe("useFormularioSubmit helpers", () => {
  it("buildDatosFormulario incluye solo campos requeridos", () => {
    const values = buildEmptyValues();
    values.municipio = "Cúcuta";
    values.fecha_visita = "2026-05-01";

    const data = buildDatosFormulario(values, REQUIRED_FIELDS);

    expect(data).toHaveProperty("municipio", "Cúcuta");
    expect(data).toHaveProperty("fecha_visita", "2026-05-01");
    expect(Object.keys(data)).toHaveLength(REQUIRED_FIELDS.length - 1);
  });

  it("buildDatosFormulario fuerza NO CUMPLE si distancia de seguridad es NO", () => {
    const values = buildEmptyValues();
    values.cumple_distancia_seguridad = "NO";
    values.resultado_validacion = "CUMPLE";

    const data = buildDatosFormulario(values, REQUIRED_FIELDS);

    expect(data.resultado_validacion).toBe("NO CUMPLE");
  });

  it("buildDatosFormulario combina OTRO con texto en datos_encuestado", () => {
    const values = buildEmptyValues();
    values.datos_encuestado = "OTRO";
    values.datos_encuestado_otro = "Familiar";

    const data = buildDatosFormulario(values, REQUIRED_FIELDS);

    expect(data.datos_encuestado).toBe("OTRO - Familiar");
    expect(data.datos_encuestado_otro).toBe("");
  });

  it("buildDatosFormulario combina OTRO con texto en cuenta_con_cocina", () => {
    const values = buildEmptyValues();
    values.cuenta_con_cocina = "OTRO";
    values.cuenta_con_cocina_otro = "Cocina comunitaria";

    const data = buildDatosFormulario(values, REQUIRED_FIELDS);

    expect(data.cuenta_con_cocina).toBe("OTRO - Cocina comunitaria");
    expect(data.cuenta_con_cocina_otro).toBe("");
  });

  it("buildDatosFormulario normaliza vereda al enviar", () => {
    const values = buildEmptyValues();
    values.vereda = "  El Cañón  ";

    const data = buildDatosFormulario(values, REQUIRED_FIELDS);

    expect(data.vereda).toBe("EL CANON");
  });

  it("buildOfflinePayload limita precision GPS", () => {
    const values = buildEmptyValues();
    values.fecha_visita = "2026-05-01";
    values.nombres_apellidos_encuestado = "Encuestado";
    values.id_perfil_encuestador = "1";

    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        fotos: [{ nombre_archivo: "f1.jpg", data: "data:image/jpg;base64,AA==", slot: 1 }],
      }),
    );

    expect(payload.id_formulario).toBe("form-123");
    expect(payload).not.toHaveProperty("id_usuario");
    expect(payload.gps.precision).toBe(5);
    expect(payload.estado_sincronizacion).toBe("PENDIENTE");
    expect(payload.modo_coordenadas).toBe("automatico");
  });

  it("modo manual conserva decimales en datos_formulario y gps", () => {
    const values = buildEmptyValues();
    values.nombres_apellidos_encuestado = "B";
    values.id_perfil_encuestador = "1";
    values.latitud = "4.6097";
    values.longitud = "-74.08";

    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-decimals",
        gps: { latitud: 4.6097123456, longitud: -74.081751234, precision: 1 },
        modoCoordenadas: "manual",
      }),
    );

    expect(payload.datos_formulario.latitud).toBe("4.6097");
    expect(payload.datos_formulario.longitud).toBe("-74.08");
    expect(payload.gps.latitud).toBe(4.6097);
    expect(payload.gps.longitud).toBe(-74.08);
  });

  it("modo automático redondea gps y datos a 6 decimales", () => {
    const values = buildEmptyValues();
    values.nombres_apellidos_encuestado = "B";
    values.id_perfil_encuestador = "1";
    values.latitud = "4.6097123456";
    values.longitud = "-74.081751234";

    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-gps-6",
        gps: { latitud: 4.6097123456, longitud: -74.081751234, precision: 1 },
        modoCoordenadas: "automatico",
      }),
    );

    expect(payload.datos_formulario.latitud).toBe("4.609712");
    expect(payload.datos_formulario.longitud).toBe("-74.081751");
    expect(payload.gps.latitud).toBe(4.609712);
    expect(payload.gps.longitud).toBe(-74.081751);
  });

  it("buildOfflinePayload persiste modo_coordenadas manual", () => {
    const values = buildEmptyValues();
    values.fecha_visita = "2026-05-01";
    values.nombres_apellidos_encuestado = "B";
    values.id_perfil_encuestador = "1";

    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-manual",
        gps: { latitud: 4.1, longitud: -74.1, precision: 1 },
        modoCoordenadas: "manual",
      }),
    );

    expect(payload.modo_coordenadas).toBe("manual");
  });

  it("buildOfflinePayload corrige precision GPS <= 0 a mínimo válido", () => {
    const values = buildEmptyValues();
    values.nombres_apellidos_encuestado = "B";
    values.id_perfil_encuestador = "1";
    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-precision-0",
        gps: { latitud: 4.1, longitud: -74.1, precision: 0 },
      }),
    );

    expect(payload.gps.precision).toBe(0.1);
  });

  it("buildOfflinePayload usa placeholder si no hay GPS", () => {
    const values = buildEmptyValues();
    values.nombres_apellidos_encuestado = "Solo nombre";
    values.id_perfil_encuestador = "1";
    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-sin-gps",
        gps: null,
      }),
    );
    expect(payload.gps).toEqual({
      latitud: GPS_PLACEHOLDER_WHEN_NOT_CAPTURED.latitud,
      longitud: GPS_PLACEHOLDER_WHEN_NOT_CAPTURED.longitud,
      precision: 5,
    });
  });

  it("getSectionsWithErrors ubica secciones afectadas", () => {
    const sections = getSectionsWithErrors([
      "municipio",
      "nombres_apellidos_encuestado",
    ]);

    expect(sections.has("ubicacion")).toBe(true);
    expect(sections.has("encuestado")).toBe(true);
    expect(sections.has("vivienda")).toBe(false);
  });

  it("formulario nuevo: fecha_hora y fecha_actualizacion coinciden", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T10:20:30.000Z"));
    const values = buildEmptyValues();
    values.nombres_apellidos_encuestado = "B";
    values.id_perfil_encuestador = "1";
    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-nuevo",
        gps: { latitud: 4.1, longitud: -74.1, precision: 1 },
      }),
    );
    expect(payload.fecha_hora).toBe("2026-05-01T10:20:30.000Z");
    expect(payload.fecha_actualizacion).toBe("2026-05-01T10:20:30.000Z");
    vi.useRealTimers();
  });

  it("reedición: conserva fecha_hora inicial y marca fecha_actualizacion al guardar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T18:00:00.000Z"));
    const values = buildEmptyValues();
    values.nombres_apellidos_encuestado = "B";
    values.id_perfil_encuestador = "1";
    const payload = buildOfflinePayload(
      basePayloadArgs({
        values,
        formId: "form-existente",
        originalFechaHora: "2026-01-10T08:00:00.000Z",
        gps: { latitud: 4.1, longitud: -74.1, precision: 1 },
      }),
    );
    expect(payload.fecha_hora).toBe("2026-01-10T08:00:00.000Z");
    expect(payload.fecha_actualizacion).toBe("2026-06-15T18:00:00.000Z");
    vi.useRealTimers();
  });
});
