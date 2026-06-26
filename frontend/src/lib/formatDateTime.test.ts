import { describe, expect, it } from "vitest";

import { earliestIso, formatIsoCalendarDate } from "./formatDateTime";

describe("formatIsoCalendarDate", () => {
  it("formatea YYYY-MM-DD sin hora", () => {
    expect(formatIsoCalendarDate("2026-03-15")).toMatch(/15/);
    expect(formatIsoCalendarDate("2026-03-15")).not.toMatch(/:/);
  });

  it("devuelve guión si la fecha no es válida", () => {
    expect(formatIsoCalendarDate("")).toBe("—");
    expect(formatIsoCalendarDate("invalid")).toBe("—");
  });
});

describe("earliestIso", () => {
  it("elige la fecha más temprana", () => {
    expect(
      earliestIso("2026-01-10T08:00:00.000Z", "2026-06-15T18:00:00.000Z"),
    ).toBe("2026-01-10T08:00:00.000Z");
  });

  it("devuelve la única válida", () => {
    expect(earliestIso(undefined, "2026-05-01T12:00:00Z")).toBe("2026-05-01T12:00:00Z");
    expect(earliestIso("2026-05-01T12:00:00Z", "")).toBe("2026-05-01T12:00:00Z");
  });
});
