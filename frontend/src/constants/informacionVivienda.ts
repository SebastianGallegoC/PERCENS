export const INFORMACION_VIVIENDA = {
  SIN_SERVICIO_ENERGIA: "SIN SERVICIO DE ENERGIA",
  SERVICIO_IRREGULAR_DIRECTO: "CON SERVICIO IRREGULAR DIRECTO",
  SERVICIO_IRREGULAR_INDIRECTO: "CON SERVICIO IRREGULAR INDIRECTO",
  SERVICIO_LEGAL: "CON SERVICIO LEGAL",
} as const;

const INFORMACION_VIVIENDA_LABELS: Record<string, string> = {
  [INFORMACION_VIVIENDA.SIN_SERVICIO_ENERGIA]: "Sin servicio de energía",
  [INFORMACION_VIVIENDA.SERVICIO_IRREGULAR_DIRECTO]: "Servicio irregular directo",
  [INFORMACION_VIVIENDA.SERVICIO_IRREGULAR_INDIRECTO]: "Servicio irregular indirecto",
  [INFORMACION_VIVIENDA.SERVICIO_LEGAL]: "Con servicio legal",
};

export function formatInformacionVivienda(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Sin información registrada";
  }
  return INFORMACION_VIVIENDA_LABELS[trimmed] ?? trimmed;
}
