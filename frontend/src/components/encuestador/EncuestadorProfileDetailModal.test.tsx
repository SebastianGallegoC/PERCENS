import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EncuestadorProfileDetailModal } from "@/components/encuestador/EncuestadorProfileDetailModal";
import type { EncuestadorProfileRead } from "@/services/api";

const sampleProfile: EncuestadorProfileRead = {
  id: 7,
  username_owner: "demo",
  formularios_asociados: 2,
  nombres_apellidos_encuestador: "Ana Gómez",
  tipo_documento_encuestador: "Cédula de ciudadanía",
  numero_documento_encuestador: "123456",
  telefono_encuestador: "3001234567",
  cargo_encuestador: "Encuestador",
  empresa_entidad_encuestador: "CENS",
  firma_encuestador: "data:image/png;base64,AA==",
  habilitado: true,
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-06-01T12:00:00Z",
};

describe("EncuestadorProfileDetailModal", () => {
  it("no renderiza cuando profile es null", () => {
    const { container } = render(
      <EncuestadorProfileDetailModal profile={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("muestra todos los campos del perfil", () => {
    render(
      <EncuestadorProfileDetailModal profile={sampleProfile} onClose={vi.fn()} />,
    );
    const dialog = screen.getByRole("dialog");
    const w = within(dialog);
    expect(w.getByText("123456")).toBeInTheDocument();
    expect(w.getByText("CENS")).toBeInTheDocument();
    expect(w.getByText("2 formulario(s)")).toBeInTheDocument();
    expect(w.getByText("Habilitado")).toBeInTheDocument();
    expect(w.getByAltText(/Firma de Ana/i)).toBeInTheDocument();
  });

  it("llama onClose al pulsar Cerrar", () => {
    const onClose = vi.fn();
    render(
      <EncuestadorProfileDetailModal profile={sampleProfile} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
