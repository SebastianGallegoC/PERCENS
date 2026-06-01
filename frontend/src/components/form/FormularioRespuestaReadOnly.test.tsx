import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormularioRespuestaReadOnly } from "@/components/form/FormularioRespuestaReadOnly";

describe("FormularioRespuestaReadOnly — encuestador", () => {
  it("muestra nombre e id del perfil aunque no esté en datos_formulario", () => {
    render(
      <FormularioRespuestaReadOnly
        snapshot={{
          id_perfil_encuestador: 2,
          encuestador_perfil_nombre: "María López",
          datos_formulario: {
            nombres_apellidos_encuestado: "Juan Beneficiario",
          },
          gps: null,
          fotos: [],
        }}
      />,
    );

    expect(screen.getByText("Encuestador")).toBeInTheDocument();
    expect(screen.getByText("María López (ID 2)")).toBeInTheDocument();
    expect(screen.queryByText("ID de perfil relacionado: 2")).not.toBeInTheDocument();
  });

  it("muestra guión en encuestador sin perfil asignado", () => {
    render(
      <FormularioRespuestaReadOnly
        snapshot={{
          id_perfil_encuestador: null,
          datos_formulario: {
            nombres_apellidos_encuestado: "Juan Beneficiario",
          },
          gps: null,
          fotos: [],
        }}
      />,
    );

    const encuestadorSection = screen.getByText("Encuestador").closest("details");
    expect(encuestadorSection).toBeTruthy();
    expect(encuestadorSection?.textContent).toContain("—");
  });
});
