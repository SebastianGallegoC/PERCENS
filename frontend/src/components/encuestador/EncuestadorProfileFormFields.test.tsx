import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  EncuestadorProfileFormFields,
  type EncuestadorProfileFormState,
} from "@/components/encuestador/EncuestadorProfileFormFields";

vi.mock("@/services/imageCompression", () => ({
  readSignatureImageAsDataUrl: vi.fn().mockResolvedValue("data:image/jpeg;base64,abc"),
}));

const baseValues = (): EncuestadorProfileFormState => ({
  nombres_apellidos_encuestador: "",
  tipo_documento_encuestador: "",
  numero_documento_encuestador: "",
  telefono_encuestador: "",
  cargo_encuestador: "",
  empresa_entidad_encuestador: "",
  firma_encuestador: "",
  habilitado: true,
});

describe("EncuestadorProfileFormFields", () => {
  it("muestra select de tipo de identificación y carga de firma", () => {
    render(
      <EncuestadorProfileFormFields values={baseValues()} onChange={() => {}} />,
    );

    expect(screen.getByLabelText(/Tipo de identificación/i)).toBeInstanceOf(
      HTMLSelectElement,
    );
    expect(screen.getByText(/CÉDULA DE CIUDADANÍA/i)).toBeInTheDocument();
    expect(screen.getByText(/Subí una foto o escaneo de la firma/i)).toBeInTheDocument();
  });

  it("muestra vista previa cuando hay data URL de firma", () => {
    const values = baseValues();
    values.firma_encuestador = "data:image/jpeg;base64,xyz";
    render(<EncuestadorProfileFormFields values={values} onChange={() => {}} />);

    expect(screen.getByAltText(/Vista previa de la firma/i)).toBeInTheDocument();
  });

  it("actualiza tipo de documento al elegir opción", () => {
    let latest = baseValues();
    render(
      <EncuestadorProfileFormFields
        values={latest}
        onChange={(next) => {
          latest = next;
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Tipo de identificación/i), {
      target: { value: "PASAPORTE" },
    });

    expect(latest.tipo_documento_encuestador).toBe("PASAPORTE");
  });
});
