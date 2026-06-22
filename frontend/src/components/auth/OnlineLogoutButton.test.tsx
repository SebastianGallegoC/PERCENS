import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const mockUseConnectivity = vi.fn(() => true);
const mockLogout = vi.fn(async () => undefined);

vi.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => mockUseConnectivity(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: (selector: (state: { logout: () => Promise<void> }) => unknown) =>
    selector({ logout: mockLogout }),
}));

import { OnlineLogoutButton } from "@/components/auth/OnlineLogoutButton";

describe("OnlineLogoutButton", () => {
  it("no se muestra cuando está offline", () => {
    mockUseConnectivity.mockReturnValue(false);

    render(
      <MemoryRouter>
        <OnlineLogoutButton />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: /Cerrar sesión/i })).not.toBeInTheDocument();
    mockUseConnectivity.mockReturnValue(true);
  });

  it("muestra confirmación antes de cerrar sesión", async () => {
    mockUseConnectivity.mockReturnValue(true);
    mockLogout.mockClear();

    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <OnlineLogoutButton />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Cerrar sesión$/i }));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /¿Cerrar sesión\?/i })).toBeInTheDocument();

    const confirmDialog = screen
      .getByRole("heading", { name: /¿Cerrar sesión\?/i })
      .closest('[role="dialog"]');
    fireEvent.click(within(confirmDialog as HTMLElement).getByRole("button", { name: /^Cerrar sesión$/i }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
