import { Link } from "react-router-dom";

export const DatosOfflineBanner = () => {
  return (
    <div
      className="mb-4 rounded-xl border border-slate-200 bg-slate-50/95 px-4 py-3 text-sm text-slate-800"
      role="status"
    >
      <p className="font-medium text-slate-900">Requiere conexión a internet</p>
      <p className="mt-1 text-slate-700">
        Las estadísticas solo están disponibles cuando el aplicativo está en línea
        y puede consultar el servidor.
      </p>
      <Link
        to="/inicio"
        className="mt-3 inline-block text-sm font-medium text-teal-800 underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
};
