import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FormStatsMonthlyResponse } from "@/services/api";

import {
  buildMonthlyChartRows,
  serieColor,
} from "@/pages/datos/monthlyChartUtils";

interface MonthlyDiligenciasChartProps {
  data: FormStatsMonthlyResponse;
}

export const MonthlyDiligenciasChart = ({ data }: MonthlyDiligenciasChartProps) => {
  const chartRows = buildMonthlyChartRows(data);

  if (data.total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
        No hay formularios con fecha de visita en {data.anio} para los municipios
        seleccionados.
      </p>
    );
  }

  return (
    <div>
      <div
        className="h-72 w-full min-w-0 sm:h-80"
        role="img"
        aria-label={`Formularios diligenciados por mes en ${data.anio}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartRows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="mes"
              scale="band"
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value) => [
                typeof value === "number" ? value : Number(value ?? 0),
                "Formularios",
              ]}
            />
            <Legend />
            {data.series.map((serie, index) => (
              <Bar
                key={serie.municipio}
                dataKey={serie.municipio}
                name={serie.municipio}
                fill={serieColor(index)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-center text-sm text-slate-700">
        Total en {data.anio}:{" "}
        <strong className="text-slate-900">{data.total}</strong> formularios
      </p>
    </div>
  );
};
