import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Download, FileSpreadsheet, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { countErrorForms, countPendingForms } from "@/services/sync";
import {
  createEncuestadorProfileApi,
  deleteEncuestadorProfileApi,
  listEncuestadorProfilesApi,
  setEncuestadorProfileEnabledApi,
  updateEncuestadorProfileApi,
  type EncuestadorProfileRead,
} from "@/services/api";
import {
  EncuestadorProfileFormFields,
  type EncuestadorProfileFormState,
} from "@/components/encuestador/EncuestadorProfileFormFields";
import { syncEnabledEncuestadorProfiles } from "@/services/encuestadorProfiles";
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

export const InicioPage = () => {
  const authUsername = useAuthStore((s) => s.username);
  const [pendientes, setPendientes] = useState(0);
  const [erroresSync, setErroresSync] = useState(0);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [profiles, setProfiles] = useState<EncuestadorProfileRead[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<EncuestadorProfileFormState>(emptyProfileForm);

  const refreshCounts = useCallback(async () => {
    const [pendingCount, errorCount] = await Promise.all([
      countPendingForms(),
      countErrorForms(),
    ]);
    setPendientes(pendingCount);
    setErroresSync(errorCount);
  }, []);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  const resetProfileForm = useCallback(() => {
    setEditingProfileId(null);
    setFormValues(emptyProfileForm());
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
    if (!profilesOpen) {
      return;
    }
    void refreshProfiles();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [profilesOpen, refreshProfiles]);

  const submitProfile = useCallback(async () => {
    setProfilesError(null);
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
  }, [editingProfileId, formValues, refreshProfiles, resetProfileForm]);

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

  const deleteProfile = useCallback(
    async (profileId: number) => {
      setProfilesError(null);
      try {
        await deleteEncuestadorProfileApi(profileId);
        if (editingProfileId === profileId) {
          resetProfileForm();
        }
        await refreshProfiles();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "No se pudo eliminar el perfil.";
        setProfilesError(msg);
      }
    },
    [editingProfileId, refreshProfiles, resetProfileForm],
  );

  useEffect(() => {
    const onOnline = () => {
      void refreshCounts();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshCounts();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshCounts]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ee_0,_#f6f7f5_45%,_#f6f7f5_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-4 sm:mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-700 sm:text-xs sm:tracking-[0.35em]">
            NoSignal Survey
          </p>
          <h1 className="mt-1 text-xl font-semibold leading-tight text-foreground sm:mt-2 sm:text-3xl sm:leading-normal">
            Selecciona una opción
          </h1>
          <p className="mt-1 text-xs leading-snug text-muted-foreground sm:mt-2 sm:text-sm sm:leading-normal">
            Puedes diligenciar una nueva encuesta o revisar las ya registradas.
          </p>
        </header>

        <section
          data-testid="inicio-acciones"
          aria-label="Acciones principales"
          className="grid gap-2 sm:gap-4 md:grid-cols-3"
        >
          <Link
            to="/formulario"
            state={{ freshForm: true }}
            className="group block h-full rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl"
          >
            <Card className="h-full border-teal-100 bg-white/90 shadow-[0_18px_40px_-35px_rgba(15,118,110,0.6)] transition group-hover:-translate-y-0.5">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-11 sm:w-11">
                    <ClipboardList className="h-5 w-5 sm:h-5 sm:w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <CardTitle className="leading-snug text-teal-800 sm:leading-normal">
                      Completar encuesta
                    </CardTitle>
                    <CardDescription className="text-xs leading-snug text-slate-600 sm:text-sm sm:leading-normal">
                      Captura nuevos registros de visita con GPS, fotos y sincronización
                      offline-first.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link
            to="/formularios-diligenciados"
            className="group block h-full rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl"
          >
            <Card className="h-full border-slate-200 bg-white/90 shadow-[0_18px_40px_-35px_rgba(30,41,59,0.45)] transition group-hover:-translate-y-0.5">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 sm:h-11 sm:w-11">
                    <FileSpreadsheet className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <CardTitle className="leading-snug text-slate-900 sm:leading-normal">
                      Ver encuestas diligenciadas
                    </CardTitle>
                    <CardDescription className="text-xs leading-snug text-slate-600 sm:text-sm sm:leading-normal">
                      Historial de este equipo y, si hay sesión, formularios ya
                      guardados en el servidor.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <button
            type="button"
            onClick={() => {
              setProfilesOpen(true);
              setProfilesError(null);
            }}
            className="group block h-full rounded-xl text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl"
          >
            <Card className="h-full border-indigo-100 bg-white/90 shadow-[0_18px_40px_-35px_rgba(79,70,229,0.6)] transition group-hover:-translate-y-0.5">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 sm:h-11 sm:w-11">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <CardTitle className="leading-snug text-indigo-800 sm:leading-normal">
                      Perfil encuestador
                    </CardTitle>
                    <CardDescription className="text-xs leading-snug text-slate-600 sm:text-sm sm:leading-normal">
                      Crea, edita, deshabilita o elimina perfiles para diligenciar más rápido.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </button>

        </section>

        <div className="mt-4">
          <a
            href="/PLANTILLA.xlsx"
            download
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Descargar plantilla vacía
          </a>
        </div>

        <Separator className="my-4 sm:my-6" />

        <section
          data-testid="inicio-stats"
          aria-label="Estado de sincronización en este equipo"
          className="grid gap-2 sm:gap-3 sm:grid-cols-2"
        >
          <Card className="border-amber-200/80 bg-white/95 shadow-sm ring-1 ring-amber-100/60">
            <CardHeader className="gap-2 sm:gap-3">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 sm:text-[11px] sm:tracking-[0.16em]">
                    Pendientes
                  </p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-slate-900 sm:mt-2 sm:text-4xl">
                    {pendientes}
                  </p>
                </div>
                <Badge variant="pending">Cola local</Badge>
              </div>
              <CardDescription className="text-xs leading-snug text-slate-600 sm:text-sm sm:leading-normal">
                Encuestas guardadas en este equipo y pendientes por
                sincronizar.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-rose-200/80 bg-white/95 shadow-sm ring-1 ring-rose-100/60">
            <CardHeader className="gap-2 sm:gap-3">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700 sm:text-[11px] sm:tracking-[0.16em]">
                    Errores sync
                  </p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-slate-900 sm:mt-2 sm:text-4xl">
                    {erroresSync}
                  </p>
                </div>
                <Badge variant="destructiveSync">Requiere revisión</Badge>
              </div>
              <CardDescription className="text-xs leading-snug text-slate-600 sm:text-sm sm:leading-normal">
                Registros que fallaron al enviar y necesitan reintento.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </div>

      {profilesOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => {
              setProfilesOpen(false);
              resetProfileForm();
            }}
            aria-label="Cerrar gestión de perfiles"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Perfil encuestador</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProfilesOpen(false);
                  resetProfileForm();
                }}
              >
                Cerrar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {editingProfileId == null ? "Crear perfil" : `Editando perfil #${editingProfileId}`}
                </p>
                <EncuestadorProfileFormFields
                  values={formValues}
                  onChange={setFormValues}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void submitProfile()}>
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
                        {profile.nombres_apellidos_encuestador} (ID {profile.id})
                      </p>
                      <p className="text-xs text-slate-600">
                        {profile.tipo_documento_encuestador} · {profile.numero_documento_encuestador}
                      </p>
                      <p className="text-xs text-slate-600">
                        Estado: {profile.habilitado ? "Habilitado" : "Deshabilitado"}
                      </p>
                      {/^data:image\//i.test(profile.firma_encuestador) ? (
                        <img
                          src={profile.firma_encuestador}
                          alt={`Firma de ${profile.nombres_apellidos_encuestador}`}
                          className="mt-2 max-h-16 w-auto rounded border border-slate-200 bg-white object-contain"
                        />
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingProfileId(profile.id);
                            setFormValues({
                              nombres_apellidos_encuestador: profile.nombres_apellidos_encuestador,
                              tipo_documento_encuestador: profile.tipo_documento_encuestador,
                              numero_documento_encuestador: profile.numero_documento_encuestador,
                              telefono_encuestador: profile.telefono_encuestador,
                              cargo_encuestador: profile.cargo_encuestador,
                              empresa_entidad_encuestador: profile.empresa_entidad_encuestador,
                              firma_encuestador: profile.firma_encuestador,
                              habilitado: profile.habilitado,
                            });
                          }}
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
                          onClick={() => void deleteProfile(profile.id)}
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
        </div>
      ) : null}
    </div>
  );
};
