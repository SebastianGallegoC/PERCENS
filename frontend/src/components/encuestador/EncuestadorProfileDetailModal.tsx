import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatISODateTimeForDisplay } from "@/lib/formatDateTime";
import type { EncuestadorProfileRead } from "@/services/api";

const isFirmaPreview = (value: string): boolean => /^data:image\//i.test(value.trim());

type DetailRowProps = {
  label: string;
  value: ReactNode;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100 py-2.5 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

type Props = {
  profile: EncuestadorProfileRead | null;
  onClose: () => void;
};

export function EncuestadorProfileDetailModal({ profile, onClose }: Props) {
  const open = profile != null;

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
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!profile) {
    return null;
  }

  const asociados = profile.formularios_asociados ?? 0;

  return (
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
        aria-labelledby="encuestador-profile-detail-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2
            id="encuestador-profile-detail-title"
            className="text-lg font-semibold text-slate-900"
          >
            Perfil del encuestador
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {profile.nombres_apellidos_encuestador}
          </p>
        </div>

        <dl className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
          <DetailRow label="ID" value={String(profile.id)} />
          <DetailRow
            label="Estado"
            value={
              <span
                className={
                  profile.habilitado
                    ? "font-medium text-emerald-800"
                    : "font-medium text-slate-600"
                }
              >
                {profile.habilitado ? "Habilitado" : "Deshabilitado"}
              </span>
            }
          />
          <DetailRow
            label="Nombres y apellidos"
            value={profile.nombres_apellidos_encuestador || "—"}
          />
          <DetailRow
            label="Tipo de documento"
            value={profile.tipo_documento_encuestador || "—"}
          />
          <DetailRow
            label="N° documento"
            value={profile.numero_documento_encuestador || "—"}
          />
          <DetailRow label="Teléfono" value={profile.telefono_encuestador || "—"} />
          <DetailRow label="Cargo" value={profile.cargo_encuestador || "—"} />
          <DetailRow
            label="Empresa / entidad"
            value={profile.empresa_entidad_encuestador || "—"}
          />
          <DetailRow
            label="Formularios asociados"
            value={
              asociados > 0
                ? `${asociados} formulario(s)`
                : "Ninguno registrado en servidor"
            }
          />
          <DetailRow
            label="Creado"
            value={formatISODateTimeForDisplay(profile.created_at)}
          />
          <DetailRow
            label="Última actualización"
            value={formatISODateTimeForDisplay(profile.updated_at)}
          />
          <div className="py-2.5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Firma
            </dt>
            <dd className="mt-2">
              {isFirmaPreview(profile.firma_encuestador) ? (
                <img
                  src={profile.firma_encuestador}
                  alt={`Firma de ${profile.nombres_apellidos_encuestador}`}
                  className="mx-auto max-h-40 w-auto max-w-full rounded-lg border border-slate-200 bg-slate-50 object-contain p-2"
                />
              ) : profile.firma_encuestador.trim() ? (
                <p className="text-sm text-amber-800">
                  La firma está guardada pero no se puede previsualizar en este
                  dispositivo.
                </p>
              ) : (
                <p className="text-sm text-slate-600">Sin firma registrada.</p>
              )}
            </dd>
          </div>
        </dl>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
