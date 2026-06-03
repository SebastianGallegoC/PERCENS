import { municipioFilterLabel } from "@/constants/formStatsMunicipio";
import { getCurrentMonthIsoDateRange } from "@/pages/datos/datosDateDefaults";

interface DatosFiltersProps {
  municipio: string;
  municipioOptions: string[];
  municipiosLoading?: boolean;
  fechaDesde: string;
  fechaHasta: string;
  onChangeMunicipio: (value: string) => void;
  onChangeFechaDesde: (value: string) => void;
  onChangeFechaHasta: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const DatosFilters = ({
  municipio,
  municipioOptions,
  municipiosLoading = false,
  fechaDesde,
  fechaHasta,
  onChangeMunicipio,
  onChangeFechaDesde,
  onChangeFechaHasta,
  onClear,
  disabled = false,
}: DatosFiltersProps) => {
  const defaultDates = getCurrentMonthIsoDateRange();
  const hasActive =
    municipio !== "" ||
    fechaDesde !== defaultDates.desde ||
    fechaHasta !== defaultDates.hasta;

  const selectDisabled = disabled || municipiosLoading;
  const noMunicipios =
    !municipiosLoading && municipioOptions.length === 0 && !disabled;

  return (
    <div className="min-w-0 overflow-x-clip">
      <div>
        <label className="flex min-w-0 max-w-md flex-col text-xs font-medium text-slate-700">
          Municipio
          <select
            value={municipio}
            disabled={selectDisabled || noMunicipios}
            onChange={(e) => onChangeMunicipio(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">
              {municipiosLoading
                ? "Cargando municipios…"
                : noMunicipios
                  ? "Sin municipios en formularios"
                  : "Todos los municipios"}
            </option>
            {municipioOptions.map((name) => (
              <option key={name} value={name}>
                {municipioFilterLabel(name)}
              </option>
            ))}
          </select>
        </label>
        {noMunicipios ? (
          <p className="mt-1 text-xs text-slate-500">
            Aún no hay formularios sincronizados con municipio registrado.
          </p>
        ) : null}
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
