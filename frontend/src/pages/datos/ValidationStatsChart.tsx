import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { FormStatsResponse } from "@/services/api";

const COLORS = {
  cumple: "#0d9488",
  no_cumple: "#e11d48",
  sin_resultado: "#94a3b8",
} as const;

interface ValidationStatsChartProps {
  stats: FormStatsResponse;
}

export const ValidationStatsChart = ({ stats }: ValidationStatsChartProps) => {
  const chartData = [
    { name: "Cumple", value: stats.cumple, key: "cumple" as const },
    { name: "No cumple", value: stats.no_cumple, key: "no_cumple" as const },
    {
      name: "Sin resultado",
      value: stats.sin_resultado,
      key: "sin_resultado" as const,
    },
  ].filter((d) => d.value > 0);

  if (stats.total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
        No hay formularios sincronizados que coincidan con los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_minmax(12rem,16rem)] lg:items-center">
      <div
        className="h-64 w-full min-w-0"
        role="img"
        aria-label={`Gráfico de validación: ${stats.cumple} cumple, ${stats.no_cumple} no cumple, ${stats.sin_resultado} sin resultado`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={chartData.length > 1 ? 2 : 0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value ?? 0);
                const pct =
                  stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;
                return [`${n} (${pct}%)`, String(name ?? "")];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1">
        <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-teal-800">
            Cumple
          </dt>
          <dd className="text-2xl font-semibold text-teal-900">{stats.cumple}</dd>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-rose-800">
            No cumple
          </dt>
          <dd className="text-2xl font-semibold text-rose-900">{stats.no_cumple}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Sin resultado
          </dt>
          <dd className="text-2xl font-semibold text-slate-900">
            {stats.sin_resultado}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Total
          </dt>
          <dd className="text-2xl font-semibold text-slate-900">{stats.total}</dd>
        </div>
      </dl>
    </div>
  );
};
