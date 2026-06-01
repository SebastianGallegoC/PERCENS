import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type SimpleDialogModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  onCancel: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirming?: boolean;
  tone?: "default" | "danger" | "warning";
  /** z-index del overlay; usar valor > 220 si se abre sobre el modal de perfiles. */
  overlayZIndexClass?: string;
};

export function SimpleDialogModal({
  open,
  title,
  description,
  onCancel,
  cancelLabel = "Cancelar",
  confirmLabel = "Aceptar",
  onConfirm,
  confirming = false,
  tone = "default",
  overlayZIndexClass = "z-[60]",
}: SimpleDialogModalProps) {
  const isAlert = onConfirm == null;

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

  const confirmClass =
    tone === "danger"
      ? "border-rose-200 text-rose-800 hover:bg-rose-50"
      : tone === "warning"
        ? "bg-amber-700 text-white hover:bg-amber-800"
        : undefined;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${overlayZIndexClass}`}
      role="presentation"
    >
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
        aria-labelledby="simple-dialog-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="simple-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{description}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {!isAlert ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={tone === "danger" ? "outline" : "default"}
            className={confirmClass}
            onClick={isAlert ? onCancel : onConfirm}
            disabled={confirming}
          >
            {confirming ? "Eliminando…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
