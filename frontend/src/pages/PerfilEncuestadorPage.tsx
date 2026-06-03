import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { EncuestadorProfileDetailModal } from "@/components/encuestador/EncuestadorProfileDetailModal";
import {
  EncuestadorProfileFormFields,
  type EncuestadorProfileFormState,
} from "@/components/encuestador/EncuestadorProfileFormFields";
import { SimpleDialogModal } from "@/components/ui/SimpleDialogModal";
import { Button } from "@/components/ui/button";
import {
  encuestadorProfileDeleteBlockedMessage,
  encuestadorProfileDeleteErrorMessage,
  isEncuestadorProfileInUseError,
} from "@/lib/encuestadorProfileDeleteMessages";
import {
  createEncuestadorProfileApi,
  deleteEncuestadorProfileApi,
  listEncuestadorProfilesApi,
  setEncuestadorProfileEnabledApi,
  updateEncuestadorProfileApi,
  type EncuestadorProfileRead,
} from "@/services/api";
import {
  hasEncuestadorProfileEditChanges,
  profileFormStateFromRead,
} from "@/lib/encuestadorProfileEditDirty";
import {
  encuestadorProfileCanBeDeleted,
  syncEnabledEncuestadorProfiles,
} from "@/services/encuestadorProfiles";
import { useAuthStore } from "@/store/useAuthStore";

const emptyProfileForm = (): EncuestadorProfileFormState => ({
  nombres_apellidos_encuestador: "",
  tipo_documento_encuestador: "",
  numero_documento_encuestador: "",
  telefono_encuestador: "",
  cargo_encuestador: "",
  empresa_entidad_encuestador: "",
  firma_encuestador: "",
  habilitado: true,
});

export const PerfilEncuestadorPage = () => {
  const authUsername = useAuthStore((s) => s.username);
  const [profiles, setProfiles] = useState<EncuestadorProfileRead[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editBaseline, setEditBaseline] = useState<EncuestadorProfileFormState | null>(
    null,
  );
  const [formValues, setFormValues] = useState<EncuestadorProfileFormState>(emptyProfileForm);
  const [profilePendingDelete, setProfilePendingDelete] =
    useState<EncuestadorProfileRead | null>(null);
  const [profileDeleteBlockedOpen, setProfileDeleteBlockedOpen] = useState(false);
  const [profileDeleteConfirming, setProfileDeleteConfirming] = useState(false);
  const [profileViewing, setProfileViewing] = useState<EncuestadorProfileRead | null>(
    null,
  );

  const isEditMode = editingProfileId != null;
  const hasProfileEditChanges = useMemo(
    () => hasEncuestadorProfileEditChanges(editBaseline, formValues),
    [editBaseline, formValues],
  );
  const updateDisabled = isEditMode && !hasProfileEditChanges;

  const resetProfileForm = useCallback(() => {
    setEditingProfileId(null);
    setEditBaseline(null);
    setFormValues(emptyProfileForm());
  }, []);

  const startEditingProfile = useCallback((profile: EncuestadorProfileRead) => {
    const values = profileFormStateFromRead(profile);
    setEditingProfileId(profile.id);
    setEditBaseline(values);
    setFormValues(values);
    setProfilesError(null);
  }, []);

  const refreshProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      const items = await listEncuestadorProfilesApi();
      setProfiles(items);
      if (authUsername) {
        await syncEnabledEncuestadorProfiles(authUsername);
      }
    } catch {
      setProfilesError("No se pudieron cargar los perfiles de encuestador.");
    } finally {
      setProfilesLoading(false);
    }
  }, [authUsername]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const submitProfile = useCallback(async () => {
    setProfilesError(null);
    if (editingProfileId != null && !hasEncuestadorProfileEditChanges(editBaseline, formValues)) {
      return;
    }
    if (!formValues.nombres_apellidos_encuestador.trim()) {
      setProfilesError("Completá el nombre del encuestador.");
      return;
    }
    if (!formValues.tipo_documento_encuestador.trim()) {
      setProfilesError("Seleccioná el tipo de identificación.");
      return;
    }
    if (!formValues.firma_encuestador.trim()) {
      setProfilesError("Subí una imagen con la firma del encuestador.");
      return;
    }
    try {
      if (editingProfileId == null) {
        await createEncuestadorProfileApi(formValues);
      } else {
        await updateEncuestadorProfileApi(editingProfileId, formValues);
      }
      resetProfileForm();
      await refreshProfiles();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al guardar perfil.";
      setProfilesError(msg);
    }
  }, [editBaseline, editingProfileId, formValues, refreshProfiles, resetProfileForm]);

  const toggleProfile = useCallback(
    async (profile: EncuestadorProfileRead) => {
      setProfilesError(null);
      try {
        await setEncuestadorProfileEnabledApi(profile.id, !profile.habilitado);
        await refreshProfiles();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "No se pudo actualizar el estado del perfil.";
        setProfilesError(msg);
      }
    },
    [refreshProfiles],
  );

  const requestDeleteProfile = useCallback(async (profile: EncuestadorProfileRead) => {
    setProfilesError(null);
    const canDelete = await encuestadorProfileCanBeDeleted(profile);
    if (!canDelete) {
      setProfileDeleteBlockedOpen(true);
      return;
    }
    setProfilePendingDelete(profile);
  }, []);

  const confirmDeleteProfile = useCallback(async () => {
    if (!profilePendingDelete) {
      return;
    }
    setProfilesError(null);
    setProfileDeleteConfirming(true);
    const profileId = profilePendingDelete.id;
    try {
      await deleteEncuestadorProfileApi(profileId);
      if (editingProfileId === profileId) {
        resetProfileForm();
      }
      setProfilePendingDelete(null);
      await refreshProfiles();
    } catch (error) {
      setProfilePendingDelete(null);
      if (isEncuestadorProfileInUseError(error)) {
        setProfileDeleteBlockedOpen(true);
      } else {
        setProfilesError(encuestadorProfileDeleteErrorMessage(error));
      }
    } finally {
      setProfileDeleteConfirming(false);
    }
  }, [editingProfileId, profilePendingDelete, refreshProfiles, resetProfileForm]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ee_0,_#f6f7f5_45%,_#f6f7f5_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-4 sm:mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/inicio">Regresar</Link>
            </Button>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-indigo-700 sm:text-xs sm:tracking-[0.35em]">
            NoSignal Survey
          </p>
          <h1 className="mt-1 text-xl font-semibold leading-tight text-slate-900 sm:mt-2 sm:text-3xl sm:leading-normal">
            Perfil encuestador
          </h1>
          <p className="mt-1 text-xs leading-snug text-muted-foreground sm:mt-2 sm:text-sm sm:leading-normal">
            Creá, editá, deshabilitá o eliminá perfiles para diligenciar encuestas más rápido.
          </p>
        </header>

        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm sm:p-6 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">
              {editingProfileId == null ? "Crear perfil" : `Editando perfil #${editingProfileId}`}
            </p>
            <EncuestadorProfileFormFields values={formValues} onChange={setFormValues} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={updateDisabled}
                className="disabled:pointer-events-none disabled:opacity-50"
                onClick={() => void submitProfile()}
              >
                {editingProfileId == null ? "Guardar perfil" : "Actualizar perfil"}
              </Button>
              {editingProfileId != null ? (
                <Button type="button" variant="outline" onClick={resetProfileForm}>
                  Cancelar edición
                </Button>
              ) : null}
            </div>
            {profilesError ? (
              <p className="text-xs font-medium text-rose-700">{profilesError}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">Perfiles registrados</p>
            {profilesLoading ? (
              <p className="text-sm text-slate-600">Cargando perfiles…</p>
            ) : profiles.length === 0 ? (
              <p className="text-sm text-slate-600">No hay perfiles guardados.</p>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {profile.nombres_apellidos_encuestador}
                  </p>
                  <p className="text-xs text-slate-600">
                    {profile.tipo_documento_encuestador} · {profile.numero_documento_encuestador}
                  </p>
                  <p className="text-xs text-slate-600">
                    Estado: {profile.habilitado ? "Habilitado" : "Deshabilitado"}
                    {(profile.formularios_asociados ?? 0) > 0
                      ? ` · ${profile.formularios_asociados} formulario(s) asociado(s)`
                      : null}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProfileViewing(profile)}
                    >
                      Ver perfil
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startEditingProfile(profile)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void toggleProfile(profile)}
                    >
                      {profile.habilitado ? "Deshabilitar" : "Habilitar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => void requestDeleteProfile(profile)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <EncuestadorProfileDetailModal
        profile={profileViewing}
        onClose={() => setProfileViewing(null)}
      />

      <SimpleDialogModal
        open={profilePendingDelete != null}
        title="¿Eliminar perfil de encuestador?"
        description={
          profilePendingDelete ? (
            <>
              Se eliminará el perfil{" "}
              <strong>{profilePendingDelete.nombres_apellidos_encuestador}</strong> (ID{" "}
              {profilePendingDelete.id}). Esta acción no se puede deshacer.
            </>
          ) : null
        }
        cancelLabel="Cancelar"
        confirmLabel="Eliminar perfil"
        tone="danger"
        confirming={profileDeleteConfirming}
        onCancel={() => {
          if (!profileDeleteConfirming) {
            setProfilePendingDelete(null);
          }
        }}
        onConfirm={() => void confirmDeleteProfile()}
      />

      <SimpleDialogModal
        open={profileDeleteBlockedOpen}
        title="No se puede eliminar el perfil"
        description={encuestadorProfileDeleteBlockedMessage()}
        confirmLabel="Entendido"
        onCancel={() => setProfileDeleteBlockedOpen(false)}
      />
    </div>
  );
};
