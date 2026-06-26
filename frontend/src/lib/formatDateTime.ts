const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'America/Bogota',
});

const DATE_TIME_FORMATTER_NO_SECONDS = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Formatea `YYYY-MM-DD` como fecha calendario (sin hora). */
export function formatIsoCalendarDate(isoDay: string | null | undefined): string {
  if (isoDay == null || isoDay.trim() === "") {
    return "—";
  }
  const trimmed = isoDay.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "—";
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(utc);
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMATTER.format(date);
}

export function formatDateTimeNoSeconds(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') {
    return '—';
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_FORMATTER_NO_SECONDS.format(date);
}

/**
 * Parse ISO 8601 date strings robustly, handling timezone info correctly.
 * Returns timestamp in milliseconds, or NaN if parsing fails.
 * Handles strings with or without timezone (assumes UTC if not specified).
 */
export function parseISODate(dateString: string | null | undefined): number {
  if (!dateString || dateString === '') {
    return NaN;
  }

  const trimmed = dateString.trim();
  
  // If string ends with 'Z', it's already UTC - safe to parse
  if (trimmed.endsWith('Z')) {
    return new Date(trimmed).getTime();
  }
  
  // If no timezone indicator, assume UTC for consistency across devices
  if (!trimmed.match(/[+-]\d{2}:\d{2}$|[+-]\d{4}$/)) {
    return new Date(`${trimmed}Z`).getTime();
  }
  
  // Has timezone offset - parse as-is
  return new Date(trimmed).getTime();
}

/** El instante ISO más temprano (p. ej. conservar fecha de primer envío vs reenvíos). */
export function earliestIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | undefined {
  const sa = typeof a === 'string' && a.trim() !== '' ? a.trim() : '';
  const sb = typeof b === 'string' && b.trim() !== '' ? b.trim() : '';
  if (!sa && !sb) {
    return undefined;
  }
  if (!sa) {
    return sb;
  }
  if (!sb) {
    return sa;
  }
  const ta = parseISODate(sa);
  const tb = parseISODate(sb);
  if (Number.isNaN(ta)) {
    return sb;
  }
  if (Number.isNaN(tb)) {
    return sa;
  }
  return ta <= tb ? sa : sb;
}

/** Formatea un instante ISO (p. ej. desde PostgreSQL/FastAPI) para mostrar en UI. */
export function formatISODateTimeForDisplay(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') {
    return '—';
  }
  const ts = parseISODate(String(iso).trim());
  return Number.isNaN(ts) ? '—' : formatDateTimeNoSeconds(ts);
}