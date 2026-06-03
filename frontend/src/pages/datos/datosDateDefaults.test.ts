import { describe, expect, it, vi } from "vitest";

import {
  getCurrentMonthIsoDateRange,
  getDefaultMonthlyAnio,
} from "@/pages/datos/datosDateDefaults";

describe("datosDateDefaults", () => {
  it("getCurrentMonthIsoDateRange devuelve primer y último día del mes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15)); // 15 jun 2026
    const { desde, hasta } = getCurrentMonthIsoDateRange();
    expect(desde).toBe("2026-06-01");
    expect(hasta).toBe("2026-06-30");
    vi.useRealTimers();
  });

  it("getDefaultMonthlyAnio prefiere el año actual si está en opciones", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
    expect(getDefaultMonthlyAnio([2025, 2026, 2024])).toBe(2026);
    expect(getDefaultMonthlyAnio([2025, 2024])).toBe(2025);
    vi.useRealTimers();
  });
});
