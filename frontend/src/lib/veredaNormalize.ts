/** Formato de almacenamiento: mayúsculas sin tildes (solo al enviar/guardar). */
export function normalizeVeredaForStorage(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }
  return trimmed
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}
