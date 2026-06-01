import { describe, expect, it, vi } from "vitest";

import { buildHealthUrl, checkConnectivity } from "@/hooks/useConnectivityStatus";

describe("useConnectivityStatus helpers", () => {
  it("buildHealthUrl usa la base del API cuando existe", () => {
    expect(buildHealthUrl("https://api.survey.nosignal.site")).toBe(
      "https://api.survey.nosignal.site/health",
    );
  });

  it("buildHealthUrl cae al origen actual cuando no hay base de API", () => {
    expect(buildHealthUrl("" )).toBe(
      new URL("/health", window.location.origin).toString(),
    );
  });

  it("checkConnectivity devuelve true cuando /health responde ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    await expect(
      checkConnectivity("https://api.survey.nosignal.site/health", fetchImpl as typeof fetch),
    ).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.survey.nosignal.site/health",
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("checkConnectivity devuelve false cuando falla el fetch", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(
      checkConnectivity("https://api.survey.nosignal.site/health", fetchImpl as typeof fetch),
    ).resolves.toBe(false);
  });
});
