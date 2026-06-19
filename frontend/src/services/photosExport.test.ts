import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import type { OfflineForm } from "@/services/db";

import {
  buildPhotosBulkZip,
  buildPhotosZip,
  dataUrlToUint8Array,
  fotoExportFileName,
  photosExportEncuestadoFolderName,
  photosExportRootFolderName,
  photosZipFilename,
} from "@/services/photosExport";

/** JPEG mínimo válido (1×1 px) en data URL. */
const JPEG_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBkNDRkYGBk1KysrNTY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

const EXPORT_DATE = new Date(2026, 5, 19, 14, 30, 0);

function baseForm(overrides: Partial<OfflineForm> = {}): OfflineForm {
  return {
    id_formulario: "id-1",
    fecha_hora: "2024-06-10T15:30:00.000Z",
    gps: { latitud: 4.5, longitud: -74.2, precision: 4 },
    datos_formulario: {
      nombres_apellidos_encuestado: "María Pérez",
    },
    fotos: [],
    estado_sincronizacion: "PENDIENTE",
    ...overrides,
  };
}

describe("photosExportEncuestadoFolderName", () => {
  it("conserva tildes y espacios del encuestado", () => {
    const f = baseForm({
      datos_formulario: { nombres_apellidos_encuestado: "José  García" },
    });
    expect(photosExportEncuestadoFolderName(f)).toBe("José García");
  });

  it("elimina caracteres ilegales en Windows", () => {
    const f = baseForm({
      datos_formulario: {
        nombres_apellidos_encuestado: 'Ana<>:|?*"\\',
      },
    });
    expect(photosExportEncuestadoFolderName(f)).toBe("Ana");
  });

  it("usa sin encuestado si queda vacío", () => {
    const f = baseForm({
      datos_formulario: { nombres_apellidos_encuestado: "   <>   " },
    });
    expect(photosExportEncuestadoFolderName(f)).toBe("sin encuestado");
  });
});

describe("photosZipFilename", () => {
  it("usa FotosFormulariosPercens con la fecha del día", () => {
    expect(photosZipFilename(EXPORT_DATE)).toBe(
      "FotosFormulariosPercens-2026-06-19.zip",
    );
  });
});

describe("fotoExportFileName", () => {
  it("nombra foto1..foto6 conservando extensión original", () => {
    expect(fotoExportFileName(1, "cualquier.jpg")).toBe("foto1.jpg");
    expect(fotoExportFileName(2, "otro.png")).toBe("foto2.png");
    expect(fotoExportFileName(3, "sin_ext")).toBe("foto3");
  });
});

describe("dataUrlToUint8Array", () => {
  it("decodifica JPEG base64", () => {
    const bytes = dataUrlToUint8Array(JPEG_DATA_URL);
    expect(bytes.length).toBeGreaterThan(10);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
  });

  it("rechaza URL sin data:", () => {
    expect(() => dataUrlToUint8Array("https://x")).toThrow("data URL");
  });
});

describe("buildPhotosZip", () => {
  it("lanza si no hay fotos", async () => {
    const f = baseForm({ fotos: [] });
    await expect(buildPhotosZip(f, EXPORT_DATE)).rejects.toThrow("No hay fotos");
  });

  it("crea FotosFormulariosPercens-[fecha]/[encuestado]/fotoN", async () => {
    const root = photosExportRootFolderName(EXPORT_DATE);
    const encuestado = photosExportEncuestadoFolderName(baseForm());
    const f = baseForm({
      fotos: [
        {
          nombre_archivo: "solo.jpg",
          data: JPEG_DATA_URL,
          slot: 2,
        },
      ],
    });
    const blob = await buildPhotosZip(f, EXPORT_DATE);
    const zip = await JSZip.loadAsync(blob);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
    expect(paths).toEqual([`${root}/${encuestado}/foto2.jpg`]);
  });

  it("exporta foto1..foto6 en la carpeta del encuestado", async () => {
    const root = photosExportRootFolderName(EXPORT_DATE);
    const encuestado = "B";
    const f = baseForm({
      datos_formulario: { nombres_apellidos_encuestado: encuestado },
      fotos: [
        { nombre_archivo: "a.jpg", data: JPEG_DATA_URL, slot: 1 },
        { nombre_archivo: "b.jpg", data: JPEG_DATA_URL, slot: 2 },
        { nombre_archivo: "c.jpg", data: JPEG_DATA_URL, slot: 3 },
        { nombre_archivo: "d.jpg", data: JPEG_DATA_URL, slot: 4 },
        { nombre_archivo: "e.jpg", data: JPEG_DATA_URL, slot: 5 },
        { nombre_archivo: "f.jpg", data: JPEG_DATA_URL, slot: 6 },
      ],
    });
    const blob = await buildPhotosZip(f, EXPORT_DATE);
    const zip = await JSZip.loadAsync(blob);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
    expect(paths).toContain(`${root}/${encuestado}/foto1.jpg`);
    expect(paths).toContain(`${root}/${encuestado}/foto6.jpg`);
    expect(paths).toHaveLength(6);
  });

  it("acepta visita legacy como slot al exportar", async () => {
    const root = photosExportRootFolderName(EXPORT_DATE);
    const encuestado = photosExportEncuestadoFolderName(baseForm());
    const f = baseForm({
      fotos: [
        { nombre_archivo: "v1.jpg", data: JPEG_DATA_URL, slot: 1, visita: 1 },
      ],
    });
    const blob = await buildPhotosZip(f, EXPORT_DATE);
    const zip = await JSZip.loadAsync(blob);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
    expect(paths).toContain(`${root}/${encuestado}/foto1.jpg`);
  });
});

describe("buildPhotosBulkZip", () => {
  it("agrupa varios encuestados bajo la misma carpeta raíz con fecha", async () => {
    const root = photosExportRootFolderName(EXPORT_DATE);
    const forms = [
      baseForm({
        id_formulario: "a",
        datos_formulario: { nombres_apellidos_encuestado: "Ana López" },
        fotos: [{ nombre_archivo: "1.jpg", data: JPEG_DATA_URL, slot: 1 }],
      }),
      baseForm({
        id_formulario: "b",
        datos_formulario: { nombres_apellidos_encuestado: "Pedro Ruiz" },
        fotos: [{ nombre_archivo: "2.jpg", data: JPEG_DATA_URL, slot: 2 }],
      }),
    ];
    const blob = await buildPhotosBulkZip(forms, EXPORT_DATE);
    const zip = await JSZip.loadAsync(blob);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
    expect(paths).toContain(`${root}/Ana López/foto1.jpg`);
    expect(paths).toContain(`${root}/Pedro Ruiz/foto2.jpg`);
  });

  it("desambigua encuestados con el mismo nombre", async () => {
    const root = photosExportRootFolderName(EXPORT_DATE);
    const forms = [
      baseForm({
        id_formulario: "a",
        fotos: [{ nombre_archivo: "1.jpg", data: JPEG_DATA_URL, slot: 1 }],
      }),
      baseForm({
        id_formulario: "b",
        fotos: [{ nombre_archivo: "2.jpg", data: JPEG_DATA_URL, slot: 2 }],
      }),
    ];
    const blob = await buildPhotosBulkZip(forms, EXPORT_DATE);
    const zip = await JSZip.loadAsync(blob);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);
    expect(paths).toContain(`${root}/María Pérez/foto1.jpg`);
    expect(paths).toContain(`${root}/María Pérez-2/foto2.jpg`);
  });
});
