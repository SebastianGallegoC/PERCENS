import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUsersApi: vi.fn(async () => [
    {
      id: 1,
      username: "admin",
      role: "admin" as const,
      is_active: true,
      created_at: "2026-06-20T00:00:00",
      updated_at: "2026-06-20T00:00:00",
    },
    {
      id: 2,
      username: "encuestador1",
      role: "encuestador" as const,
      is_active: true,
      created_at: "2026-06-20T00:00:00",
      updated_at: "2026-06-20T00:00:00",
    },
  ]),
  createUserApi: vi.fn(),
  updateUserApi: vi.fn(),
}));

vi.mock("@/services/usersApi", () => mocks);

import { UsuariosPage } from "@/pages/UsuariosPage";

describe("UsuariosPage", () => {
  it("muestra el listado y el formulario de creación", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 1, name: /Usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear usuario/i })).toBeInTheDocument();
  });

  it("no permite crear usuarios admin ni editar el admin existente", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    expect(screen.queryByRole("option", { name: /Administrador/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirmar contraseña")).not.toBeInTheDocument();
    expect(screen.getByText(/Cuenta administrador protegida/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña (opcional)")).not.toBeInTheDocument();

    const createPassword = screen.getByLabelText("Contraseña");
    expect(createPassword).toHaveAttribute("type", "password");

    fireEvent.click(screen.getAllByRole("button", { name: /Mostrar contraseña/i })[0]!);
    expect(createPassword).toHaveAttribute("type", "text");
  });

  it("abre el modal de edición al pulsar Editar", async () => {
    render(
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("encuestador1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Editar$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Editar usuario/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Nueva contraseña (opcional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar cambios/i })).toBeInTheDocument();
  });
});
