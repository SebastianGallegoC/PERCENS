import { useEffect, useMemo, useState } from "react";

import { PasswordField } from "@/components/users/PasswordField";
import { Button } from "@/components/ui/button";
import { type UserRole } from "@/lib/permissions";
import type { UserRead } from "@/services/usersApi";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  editor: "Edición",
  encuestador: "Encuestador",
};

const EDIT_ROLE_OPTIONS: Array<{ value: Exclude<UserRole, "admin">; label: string }> = [
  { value: "editor", label: ROLE_LABELS.editor },
  { value: "encuestador", label: ROLE_LABELS.encuestador },
];

type EditDraft = {
  role: Exclude<UserRole, "admin">;
  is_active: boolean;
  password: string;
};

type Props = {
  user: UserRead | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (updates: { role: UserRole; is_active: boolean; password?: string }) => void;
};

function draftFromUser(user: UserRead): EditDraft {
  return {
    role: user.role === "admin" ? "encuestador" : user.role,
    is_active: user.is_active,
    password: "",
  };
}

function hasDraftChanges(user: UserRead, draft: EditDraft): boolean {
  const originalRole = user.role === "admin" ? "encuestador" : user.role;
  return (
    draft.role !== originalRole ||
    draft.is_active !== user.is_active ||
    draft.password.length > 0
  );
}

export function EditUserModal({
  user,
  saving = false,
  error = null,
  onClose,
  onSave,
}: Props) {
  const open = user != null;
  const [draft, setDraft] = useState<EditDraft | null>(null);

  useEffect(() => {
    if (!user) {
      setDraft(null);
      return;
    }
    setDraft(draftFromUser(user));
  }, [user]);

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
    if (!open || saving) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const hasChanges = useMemo(
    () => (user && draft ? hasDraftChanges(user, draft) : false),
    [user, draft],
  );

  if (!user || !draft) {
    return null;
  }

  const handleSave = () => {
    if (!hasChanges || (draft.password.length > 0 && draft.password.length < 8)) {
      return;
    }
    onSave({
      role: draft.role,
      is_active: draft.is_active,
      ...(draft.password.length > 0 ? { password: draft.password } : {}),
    });
  };

  const passwordInvalid = draft.password.length > 0 && draft.password.length < 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
          aria-label="Cerrar ventana"
          disabled={saving}
          onClick={() => {
            if (!saving) {
              onClose();
            }
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
          className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="edit-user-title" className="text-lg font-semibold text-slate-900">
            Editar usuario
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Modificá el rol, el estado o la contraseña de <strong>{user.username}</strong>.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              Usuario
              <input
                value={user.username}
                readOnly
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Rol
              <select
                value={draft.role}
                disabled={saving}
                onChange={(e) =>
                  setDraft((current) =>
                    current
                      ? { ...current, role: e.target.value as Exclude<UserRole, "admin"> }
                      : current,
                  )
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {EDIT_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_active}
                disabled={saving}
                onChange={(e) =>
                  setDraft((current) =>
                    current ? { ...current, is_active: e.target.checked } : current,
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              Usuario activo
            </label>

            <PasswordField
              id={`edit-user-password-${user.id}`}
              label="Nueva contraseña (opcional)"
              placeholder="Dejar vacío para no cambiar"
              value={draft.password}
              disabled={saving}
              onChange={(password) =>
                setDraft((current) => (current ? { ...current, password } : current))
              }
            />
            {passwordInvalid ? (
              <p className="text-xs text-rose-700">La contraseña debe tener al menos 8 caracteres.</p>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !hasChanges || passwordInvalid}
              onClick={handleSave}
            >
              {saving ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
        </div>
    </div>
  );
}
