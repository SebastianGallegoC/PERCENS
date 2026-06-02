/** Valor del dropdown cuando se muestran todos los municipios con datos. */
export const MUNICIPIO_MENSUAL_TODOS = "";

interface MonthlyDiligenciasFiltersProps {
  anio: number;
  anioOptions: number[];
  aniosLoading?: boolean;
  municipio: string;
  municipioOptions: string[];
  municipiosLoading?: boolean;
  onChangeAnio: (anio: number) => void;
  onChangeMunicipio: (municipio: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const MonthlyDiligenciasFilters = ({
  anio,
  anioOptions,
  aniosLoading = false,
  municipio,
  municipioOptions,
  municipiosLoading = false,
  onChangeAnio,
  onChangeMunicipio,
  onClear,
  disabled = false,
}: MonthlyDiligenciasFiltersProps) => {
  const filtersDisabled = disabled || municipiosLoading || aniosLoading;
  const defaultAnio = anioOptions[0] ?? new Date().getFullYear();
  const hasActive =
    municipio !== MUNICIPIO_MENSUAL_TODOS || anio !== defaultAnio;

  const effectiveAnios =
    anioOptions.length > 0 ? anioOptions : [new Date().getFullYear()];

  const noMunicipios =
    !municipiosLoading && municipioOptions.length === 0 && !disabled;

  return (
    <div className="min-w-0 overflow-x-clip">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex min-w-0 max-w-xs flex-col text-xs font-medium text-slate-700">
          Año
          <select
            value={anio}
            disabled={filtersDisabled}
            onChange={(e) => onChangeAnio(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {aniosLoading ? (
              <option value={anio}>Cargando años…</option>
            ) : (
              effectiveAnios.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="flex min-w-0 max-w-md flex-col text-xs font-medium text-slate-700">
          Municipio
          <select
            aria-label="Municipio para gráfico mensual"
            value={municipio}
            disabled={filtersDisabled || noMunicipios}
            onChange={(e) => onChangeMunicipio(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value={MUNICIPIO_MENSUAL_TODOS}>
              {municipiosLoading
                ? "Cargando municipios…"
                : noMunicipios
                  ? "Sin municipios en formularios"
                  : "Todos los municipios"}
            </option>
            {municipioOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {noMunicipios ? (
        <p className="mt-2 text-xs text-slate-500">
          No hay municipios en formularios sincronizados.
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">
          Por defecto se muestran todos los municipios. Elegí uno en la lista para
          ver solo ese municipio.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={filtersDisabled || !hasActive}
          onClick={onClear}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
};
