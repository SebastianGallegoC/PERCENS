import { describe, expect, it } from "vitest";

import { GPS_PLACEHOLDER_WHEN_NOT_CAPTURED } from "@/constants/gpsConfig";
import type { OfflineForm } from "@/services/db";
import { REQUIRED_FIELDS } from "@/types/formFields";

import {
  MATRIZ_COLUMN_COUNT,
  MATRIZ_F_PSA_HEADERS,
  MATRIZ_ROW_CELL_SOURCES,
  MATRIZ_FIRST_DATA_ROW,
  MATRIZ_SHEET_NAME,
  buildMatrizCaracterizacionRow,
  buildMatrizCaracterizacionWorkbook,
  buildMatrizCaracterizacionWorkbookBulk,
  formatFechaMatriz,
  matrizCaracterizacionBulkFilename,
  matrizCaracterizacionFilename,
} from "./matrizCaracterizacionExport";

const minimalForm = (): OfflineForm => ({
  id_formulario: "test-id",
  fecha_hora: "2026-05-05T12:00:00.000Z",
  gps: { latitud: 7.5, longitud: -72.25, precision: 4 },
  datos_formulario: {},
  fotos: [],
  estado_sincronizacion: "PENDIENTE",
});

describe("matrizCaracterizacionExport — Survey", () => {
  it("define 29 encabezados y 29 fuentes de celda", () => {
    expect(MATRIZ_SHEET_NAME).toBe("Plantilla");
    expect(MATRIZ_F_PSA_HEADERS.length).toBe(MATRIZ_COLUMN_COUNT);
    expect(MATRIZ_ROW_CELL_SOURCES.length).toBe(MATRIZ_COLUMN_COUNT);
    expect(MATRIZ_F_PSA_HEADERS[0]).toBe("LATITUD");
    expect(MATRIZ_F_PSA_HEADERS[9]).toBe("NOMBRES Y APELLIDOS");
    expect(MATRIZ_F_PSA_HEADERS[28]).toBe("FIRMA");
  });

  it("cada campo exportable aparece en la definición, salvo ID interno y auxiliar cocina", () => {
    const keysInSources = new Set<string>();
    for (const src of MATRIZ_ROW_CELL_SOURCES) {
      if (src.kind === "field" || src.kind === "fecha") {
        keysInSources.add(src.key);
      }
    }
    for (const k of REQUIRED_FIELDS) {
      if (["longitud", "latitud", "cuenta_con_cocina", "cuenta_con_cocina_otro", "id_perfil_encuestador"].includes(k)) {
        continue;
      }
      expect(keysInSources.has(k), `falta en plantilla Survey: ${k}`).toBe(true);
    }
  });

  it("produce fila A-AC y usa GPS si faltan coordenadas en datos", () => {
    const f = minimalForm();
    f.datos_formulario = {
      nombres_apellidos_encuestado: "María López",
      municipio: "Cúcuta",
      fecha_visita: "2026-03-15",
    };
    const row = buildMatrizCaracterizacionRow(f);
    expect(row).toHaveLength(MATRIZ_COLUMN_COUNT);
    expect(row[0]).toBe("7.5");
    expect(row[1]).toBe("-72.25");
    expect(row[4]).toBe("15/03/2026");
    expect(row[5]).toBe("Cúcuta");
    expect(row[9]).toBe("María López");
  });

  it("no exporta coordenadas placeholder 0,0", () => {
    const f = minimalForm();
    f.gps = { ...GPS_PLACEHOLDER_WHEN_NOT_CAPTURED };
    const row = buildMatrizCaracterizacionRow(f);
    expect(row[0]).toBe("");
    expect(row[1]).toBe("");
  });

  it("exporta texto libre de cocina cuando se eligió otro", () => {
    const f = minimalForm();
    f.datos_formulario = {
      cuenta_con_cocina: "OTRO - Cocina comunitaria",
      cuenta_con_cocina_otro: "",
    };
    expect(buildMatrizCaracterizacionRow(f)[15]).toBe("Cocina comunitaria");
  });
});

describe("formatFechaMatriz", () => {
  it("convierte ISO o YYYY-MM-DD a DD/MM/AAAA", () => {
    expect(formatFechaMatriz("2026-03-15T00:00:00.000Z")).toBe("15/03/2026");
    expect(formatFechaMatriz("2026-03-15")).toBe("15/03/2026");
  });

  it("deja DD/MM/AAAA o texto no parseable sin cambios", () => {
    expect(formatFechaMatriz("05/04/2026")).toBe("05/04/2026");
    expect(formatFechaMatriz("pronto")).toBe("pronto");
  });
});

describe("workbooks Survey", () => {
  it("construye workbook individual con datos en la primera fila de datos", async () => {
    const f = minimalForm();
    f.datos_formulario = { nombres_apellidos_encuestado: "Ana", municipio: "Cali" };
    const wb = await buildMatrizCaracterizacionWorkbook(f);
    const ws = wb.getWorksheet(MATRIZ_SHEET_NAME) ?? wb.worksheets[0];
    expect(ws?.getCell(MATRIZ_FIRST_DATA_ROW, 6).value).toBe("Cali");
    expect(ws?.getCell(MATRIZ_FIRST_DATA_ROW, 10).value).toBe("Ana");
  });

  it("construye workbook masivo agregando filas desde la primera fila de datos", async () => {
    const f1 = minimalForm();
    f1.datos_formulario = { nombres_apellidos_encuestado: "Ana Uno" };
    const f2 = minimalForm();
    f2.datos_formulario = { nombres_apellidos_encuestado: "Beto Dos" };
    const wb = await buildMatrizCaracterizacionWorkbookBulk([f1, f2]);
    const ws = wb.getWorksheet(MATRIZ_SHEET_NAME) ?? wb.worksheets[0];
    expect(ws?.getCell(MATRIZ_FIRST_DATA_ROW, 10).value).toBe("Ana Uno");
    expect(ws?.getCell(MATRIZ_FIRST_DATA_ROW + 1, 10).value).toBe("Beto Dos");
  });
});

describe("nombres de archivo", () => {
  it("usa encuestado y fecha de visita", () => {
    const f = minimalForm();
    f.datos_formulario = {
      nombres_apellidos_encuestado: "María José Pérez",
      fecha_visita: "2026-06-20",
    };
    expect(matrizCaracterizacionFilename(f)).toBe("Maria_Jose_Perez-20-06-2026.xlsx");
  });

  it("nombre masivo incluye fecha local", () => {
    expect(matrizCaracterizacionBulkFilename(new Date(2026, 4, 5))).toBe(
      "Encuestas_diligenciadas_2026-05-05.xlsx",
    );
  });
});
