import { fieldSelectOptions } from "@/config/formSelectOptions";

interface DatosFiltersProps {
  municipio: string;
  fechaDesde: string;
  fechaHasta: string;
  onChangeMunicipio: (value: string) => void;
  onChangeFechaDesde: (value: string) => void;
  onChangeFechaHasta: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

const municipioOptions = (fieldSelectOptions.municipio ?? []).filter(
  (o) => o.value !== "",
);

export const DatosFilters = ({
  municipio,
  fechaDesde,
  fechaHasta,
  onChangeMunicipio,
  onChangeFechaDesde,
  onChangeFechaHasta,
  onClear,
  disabled = false,
}: DatosFiltersProps) => {
  const hasActive =
    municipio !== "" || fechaDesde !== "" || fechaHasta !== "";

  return (
    <div className="mb-4 min-w-0 overflow-x-clip rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>

      <div className="mt-4">
        <label className="flex min-w-0 max-w-md flex-col text-xs font-medium text-slate-700">
          Municipio
          <select
            value={municipio}
            disabled={disabled}
            onChange={(e) => onChangeMunicipio(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Todos los municipios</option>
            {municipioOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Fecha de la visita
        </h3>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 max-w-full flex-col text-xs font-medium text-slate-700 sm:min-w-[10rem] sm:flex-1">
            Desde
            <input
              type="date"
              value={fechaDesde}
              disabled={disabled}
              onChange={(e) => onChangeFechaDesde(e.target.value)}
              className="form-date-input mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>
          <label className="flex min-w-0 max-w-full flex-col text-xs font-medium text-slate-700 sm:min-w-[10rem] sm:flex-1">
            Hasta
            <input
              type="date"
              value={fechaHasta}
              disabled={disabled}
              onChange={(e) => onChangeFechaHasta(e.target.value)}
              className="form-date-input mt-1 block w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>
          <button
            type="button"
            disabled={disabled || !hasActive}
            onClick={onClear}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
};
