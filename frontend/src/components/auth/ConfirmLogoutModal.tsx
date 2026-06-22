import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmLogoutModal({
  open,
  confirming = false,
  onCancel,
  onConfirm,
}: Props) {
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
    if (!open || confirming) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Cerrar"
        disabled={confirming}
        onClick={() => {
          if (!confirming) {
            onCancel();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-logout-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-logout-title" className="text-lg font-semibold text-slate-900">
          ¿Cerrar sesión?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Vas a salir de tu cuenta en este equipo. Podrás volver a iniciar sesión cuando tengas
          conexión.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={confirming} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" disabled={confirming} onClick={onConfirm}>
            {confirming ? "Cerrando sesión…" : "Cerrar sesión"}
          </Button>
        </div>
      </div>
    </div>
  );
}
