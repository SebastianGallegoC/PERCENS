export type FormStatsVista = "resumen" | "cumple_detalle" | "no_cumple";

export type ResultadoValidacionFilter = "" | "CUMPLE" | "NO CUMPLE";

export const RESULTADO_VALIDACION_FILTER_OPTIONS: Array<{
  value: ResultadoValidacionFilter;
  label: string;
}> = [
  { value: "", label: "Todos" },
  { value: "CUMPLE", label: "Cumplen" },
  { value: "NO CUMPLE", label: "No cumplen" },
];

export const CUMPLE_DETALLE_LABELS = {
  sin_servicio_energia: "Sin servicio de energía",
  servicio_irregular_directo: "Con servicio irregular directo",
  servicio_irregular_indirecto: "Con servicio irregular indirecto",
  sin_clasificar: "Sin clasificar",
} as const;

export type CumpleDetalleKey = keyof typeof CUMPLE_DETALLE_LABELS;

/** Colores de alto contraste entre categorías (evitar varias tonalidades de verde). */
export const CUMPLE_DETALLE_THEME: Record<
  CumpleDetalleKey,
  { chart: string; bg: string; border: string; text: string }
> = {
  sin_servicio_energia: {
    chart: "#EAB308",
    bg: "rgba(234, 179, 8, 0.16)",
    border: "#CA8A04",
    text: "#713F12",
  },
  servicio_irregular_directo: {
    chart: "#2563EB",
    bg: "rgba(37, 99, 235, 0.12)",
    border: "#2563EB",
    text: "#1E3A8A",
  },
  servicio_irregular_indirecto: {
    chart: "#9333EA",
    bg: "rgba(147, 51, 234, 0.12)",
    border: "#9333EA",
    text: "#581C87",
  },
  sin_clasificar: {
    chart: "#64748B",
    bg: "rgba(100, 116, 139, 0.14)",
    border: "#94A3B8",
    text: "#334155",
  },
};

export const CUMPLE_DETALLE_COLORS: Record<CumpleDetalleKey, string> = {
  sin_servicio_energia: CUMPLE_DETALLE_THEME.sin_servicio_energia.chart,
  servicio_irregular_directo: CUMPLE_DETALLE_THEME.servicio_irregular_directo.chart,
  servicio_irregular_indirecto: CUMPLE_DETALLE_THEME.servicio_irregular_indirecto.chart,
  sin_clasificar: CUMPLE_DETALLE_THEME.sin_clasificar.chart,
};

export const CUMPLE_DETALLE_TOTAL_CARD_CLASS =
  "border-slate-300 bg-slate-100 text-slate-800";
