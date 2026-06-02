interface MonthlyDiligenciasFiltersProps {
  anio: number;
  anioOptions: number[];
  aniosLoading?: boolean;
  municipiosSeleccionados: string[];
  municipioOptions: string[];
  municipiosLoading?: boolean;
  onChangeAnio: (anio: number) => void;
  onToggleMunicipio: (municipio: string) => void;
  onSelectAllMunicipios: () => void;
  onClearMunicipios: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const MonthlyDiligenciasFilters = ({
  anio,
  anioOptions,
  aniosLoading = false,
  municipiosSeleccionados,
  municipioOptions,
  municipiosLoading = false,
  onChangeAnio,
  onToggleMunicipio,
  onSelectAllMunicipios,
  onClearMunicipios,
  onClear,
  disabled = false,
}: MonthlyDiligenciasFiltersProps) => {
  const filtersDisabled = disabled || municipiosLoading || aniosLoading;
  const hasActive =
    municipiosSeleccionados.length > 0 ||
    (anioOptions.length > 0 && anio !== anioOptions[0]);

  const effectiveAnios =
    anioOptions.length > 0
      ? anioOptions
      : [new Date().getFullYear()];

  return (
    <div className="mb-4 min-w-0 overflow-x-clip rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>
      <p className="mt-1 text-xs text-slate-600">
        Fecha de referencia: fecha de la visita registrada en cada formulario.
      </p>

      <div className="mt-4">
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
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Municipios
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filtersDisabled || municipioOptions.length === 0}
              onClick={onSelectAllMunicipios}
              className="text-xs font-medium text-teal-800 underline disabled:opacity-50"
            >
              Todos
            </button>
            <button
              type="button"
              disabled={filtersDisabled || municipiosSeleccionados.length === 0}
              onClick={onClearMunicipios}
              className="text-xs font-medium text-slate-600 underline disabled:opacity-50"
            >
              Ninguno
            </button>
          </div>
        </div>

        {municipioOptions.length === 0 && !municipiosLoading ? (
          <p className="mt-2 text-xs text-slate-500">
            No hay municipios en formularios sincronizados.
          </p>
        ) : (
          <ul
            className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2"
            aria-label="Selección de municipios"
          >
            {municipioOptions.map((name) => {
              const checked = municipiosSeleccionados.includes(name);
              return (
                <li key={name}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-800 hover:bg-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={filtersDisabled}
                      onChange={() => onToggleMunicipio(name)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-700"
                    />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {municipiosSeleccionados.length === 0 ? (
          <p className="mt-2 text-xs text-amber-800">
            Seleccioná al menos un municipio para ver el gráfico.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-600">
            {municipiosSeleccionados.length} municipio
            {municipiosSeleccionados.length === 1 ? "" : "s"} seleccionado
            {municipiosSeleccionados.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>

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
