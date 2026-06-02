import type { FormStatsMonthlyResponse } from "@/services/api";

const SERIE_COLORS = [
  "#0d9488",
  "#6366f1",
  "#f59e0b",
  "#e11d48",
  "#8b5cf6",
  "#0891b2",
  "#84cc16",
  "#db2777",
] as const;

export function serieColor(index: number): string {
  return SERIE_COLORS[index % SERIE_COLORS.length];
}

export type MonthlyChartRow = {
  mes: string;
  mesIndex: number;
  [municipio: string]: string | number;
};

export function buildMonthlyChartRows(
  data: FormStatsMonthlyResponse,
): MonthlyChartRow[] {
  return data.etiquetas_mes.map((mes, index) => {
    const row: MonthlyChartRow = { mes, mesIndex: index + 1 };
    for (const serie of data.series) {
      row[serie.municipio] = serie.totales[index] ?? 0;
    }
    return row;
  });
}
