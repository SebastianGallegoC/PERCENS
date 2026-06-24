import { useEffect, useState } from "react";

import {
  ImagePreviewModal,
  type ImagePreview,
} from "@/components/form/ImagePreviewModal";
import { Button } from "@/components/ui/button";
import { registroFotoLabel } from "@/config/registroFotografico";
import { municipioFilterLabel } from "@/constants/formStatsMunicipio";
import { formatInformacionVivienda } from "@/constants/informacionVivienda";
import { useMapPointFormDetail } from "@/hooks/useMapPointFormDetail";
import type { FormMapPointItem } from "@/services/api";

type MapPointDetailModalProps = {
  point: FormMapPointItem | null;
  onClose: () => void;
};

export const MapPointDetailModal = ({ point, onClose }: MapPointDetailModalProps) => {
  const open = point != null;
  const { detail, loadState, error, reload } = useMapPointFormDetail(
    point?.id_formulario ?? null,
  );
  const [preview, setPreview] = useState<ImagePreview | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && preview == null) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, preview]);

  if (!point) {
    return null;
  }

  const informacionVivienda =
    detail?.informacion_vivienda?.trim() || point.informacion_vivienda?.trim() || "";

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
          aria-label="Cerrar ventana"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-point-detail-title"
          className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-slate-100 px-5 py-4">
            <h2
              id="map-point-detail-title"
              className="text-lg font-semibold text-slate-900"
            >
              {point.nombres_apellidos_encuestado || "Sin nombre registrado"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Municipio: {municipioFilterLabel(point.municipio)}
            </p>
            <p className="text-sm text-slate-600">
              Fecha visita: {point.fecha_visita || "Sin fecha"}
            </p>
            <p className="text-sm text-slate-600">
              Resultado: {point.resultado_validacion || "Sin resultado"}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Información de la vivienda
              </p>
              <p className="mt-1 text-sm font-medium text-teal-900">
                {formatInformacionVivienda(informacionVivienda)}
              </p>
            </div>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Registro fotográfico
            </h3>

            {loadState === "loading" ? (
              <p className="mt-3 text-sm text-slate-500">Cargando fotos…</p>
            ) : null}

            {loadState === "error" ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-sm text-rose-900">
                No se pudieron cargar las fotos: {error ?? "error desconocido"}.
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="ml-2 font-medium underline"
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {loadState === "ready" && (detail?.fotos.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Este formulario no tiene fotos registradas.
              </p>
            ) : null}

            {loadState === "ready" && detail && detail.fotos.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {detail.fotos.map((foto) => (
                  <button
                    key={`${foto.slot}-${foto.nombre_archivo}`}
                    type="button"
                    onClick={() => {
                      if (!foto.data) {
                        return;
                      }
                      setPreview({
                        nombre_archivo: foto.nombre_archivo,
                        src: foto.data,
                      });
                    }}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left"
                  >
                    <img
                      src={foto.data}
                      alt={registroFotoLabel(foto.slot)}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                    <p className="truncate px-1.5 py-1 text-center text-[10px] text-slate-600">
                      {registroFotoLabel(foto.slot)}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full">
              Cerrar
            </Button>
          </div>
        </div>
      </div>

      <ImagePreviewModal image={preview} onClose={() => setPreview(null)} />
    </>
  );
};
