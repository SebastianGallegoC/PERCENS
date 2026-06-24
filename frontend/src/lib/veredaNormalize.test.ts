import { describe, expect, it } from "vitest";

import { normalizeVeredaForStorage } from "./veredaNormalize";

describe("normalizeVeredaForStorage", () => {
  it("convierte a mayúsculas y quita tildes", () => {
    expect(normalizeVeredaForStorage("la esperanza")).toBe("LA ESPERANZA");
    expect(normalizeVeredaForStorage("  El Cañón  ")).toBe("EL CANON");
    expect(normalizeVeredaForStorage("Peñas Blancas")).toBe("PENAS BLANCAS");
  });

  it("devuelve cadena vacía si no hay contenido", () => {
    expect(normalizeVeredaForStorage("")).toBe("");
    expect(normalizeVeredaForStorage("   ")).toBe("");
  });
});
