import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";

import {
  FormEnvioResultModal,
  type FormEnvioResultState,
} from "@/components/form/FormEnvioResultModal";
import {
  ImagePreviewModal,
  type ImagePreview,
} from "@/components/form/ImagePreviewModal";
import {
  RegistroFotograficoSection,
  useRegistroFotoPickerRefs,
} from "@/components/form/RegistroFotograficoSection";
import { FormularioOverviewPanel } from "@/components/form/FormularioOverviewPanel";
import { FormFieldRow } from "@/components/form/FormFieldRow";
import { Button } from "@/components/ui/button";
import { FORM_SECTIONS } from "@/config/formSections";
import {
  hasFormularioEditChanges,
  type FormularioEditBaseline,
} from "@/lib/formEditDirty";
import { getFormSubmitButtonState } from "@/lib/formSubmitUi";
import { handleDiligenciadoFormEnterKey } from "@/lib/formKeyboard";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { useGPS } from "@/hooks/useGPS";
import { useFormularioSubmit } from "@/hooks/useFormularioSubmit";
import type { RegistroFotoSlot } from "@/config/registroFotografico";
import { getTodayIsoDateLocal } from "@/lib/isoDateLocal";
import {
  clearFormDraft,
  isEditFormDraft,
  loadFormDraft,
  resolveInitialFormDraft,
  shouldPersistFormDraft,
  type FormularioDraftNavigation,
} from "@/services/formDraftStorage";
import { isNetworkLikeError, syncPendingForms } from "@/services/sync";
import type { FotoForm } from "@/services/db";
import { randomUuid } from "@/lib/randomUuid";
import { useAuthStore } from "@/store/useAuthStore";
import { REQUIRED_FIELDS, type FormFieldKey, type FormValues } from "@/types/formFields";
import { buildExternalMapUrl, buildMapUrl } from "@/pages/formulario/mapUtils";
import { applyCuentaConCocinaToFormValues, isCuentaConCocinaOtroSelection } from "@/lib/cuentaConCocina";
import {
  distanciaSeguridadImpideCumplir,
  RESULTADO_NO_CUMPLE,
} from "@/lib/distanciaSeguridadValidacion";
import { fieldSelectOptions } from "@/config/formSelectOptions";
import { normalizeFotosToSlots } from "@/lib/registroFotoUtils";
import { useGpsFormFields } from "@/pages/formulario/useGpsFormFields";
import { useFormDraftPersistence } from "@/pages/formulario/useFormDraftPersistence";
import { usePhotoCapture } from "@/pages/formulario/usePhotoCapture";
import { FormClearModal } from "@/pages/formulario/FormClearModal";
import {
  listEncuestadorProfilesForFormSelect,
  syncEnabledEncuestadorProfiles,
  type EncuestadorProfileSelectOption,
} from "@/services/encuestadorProfiles";

export const FormularioPage = () => {
  const authUsername = useAuthStore((s) => s.username);
  const isOnline = useConnectivityStatus();
  const draftUserKey = authUsername ?? "";
  const location = useLocation();
  const draftNavigation = (location.state ?? null) as FormularioDraftNavigation | null;
  const skipDraftPersistRef = useRef(false);

  const loadedDraft = useMemo(() => {
    const raw = loadFormDraft(draftUserKey);
    const resolved = resolveInitialFormDraft(raw, draftNavigation);
    if (draftNavigation?.freshForm || (raw && resolved === null && raw.originalFechaHora)) {
      clearFormDraft(draftUserKey);
    }
    return resolved;
  }, [draftUserKey, draftNavigation]);

  const defaults = useMemo((): FormValues => {
    const values = Object.fromEntries(
      REQUIRED_FIELDS.map((k) => [k, ""]),
    ) as FormValues;
    values.fecha_visita = getTodayIsoDateLocal();
    return values;
  }, []);

  const initialFormValues = useMemo(() => {
    if (!loadedDraft?.formValues) {
      return defaults;
    }
    const merged = applyCuentaConCocinaToFormValues({
      ...defaults,
      ...loadedDraft.formValues,
    } as FormValues);
    if (!isEditFormDraft(loadedDraft) && !merged.fecha_visita.trim()) {
      merged.fecha_visita = getTodayIsoDateLocal();
    }
    return merged;
  }, [defaults, loadedDraft]);

  const {
    gps,
    cargando,
    error,
    estado,
    progreso,
    solicitarGPS,
    limpiarUbicacion,
  } = useGPS({
    restoredPosition: loadedDraft?.gps ?? null,
  });
  const [fotos, setFotos] = useState<FotoForm[]>(() =>
    normalizeFotosToSlots(loadedDraft?.fotos ?? []),
  );
  const [activeFotoSlot, setActiveFotoSlot] =
    useState<RegistroFotoSlot | null>(null);
  const [previewFoto, setPreviewFoto] = useState<ImagePreview | null>(null);
  const [formId, setFormId] = useState(
    () => loadedDraft?.formId ?? randomUuid(),
  );
  const [originalFechaHora, setOriginalFechaHora] = useState<string | null>(
    () => loadedDraft?.originalFechaHora ?? null,
  );
  const [sincronizando, setSincronizando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [envioModal, setEnvioModal] = useState<FormEnvioResultState | null>(
    null,
  );
  const [modoCoordenadas, setModoCoordenadas] = useState<
    "automatico" | "manual"
  >(() => loadedDraft?.modoCoordenadas ?? "automatico");
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["coordenadas"]),
  );
  const [modalLimpiarAbierto, setModalLimpiarAbierto] = useState(false);
  const [encuestadorProfiles, setEncuestadorProfiles] = useState<
    EncuestadorProfileSelectOption[]
  >([]);
  const pickerInputRefs = useRegistroFotoPickerRefs();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: initialFormValues,
  });

  const formValues = watch();
  const showCocinaOtro = isCuentaConCocinaOtroSelection(formValues.cuenta_con_cocina);
  const distanciaSeguridadBloqueaCumplir = distanciaSeguridadImpideCumplir(
    formValues.cumple_distancia_seguridad,
  );

  useEffect(() => {
    if (!showCocinaOtro && formValues.cuenta_con_cocina_otro.trim() !== "") {
      setValue("cuenta_con_cocina_otro", "");
    }
  }, [showCocinaOtro, formValues.cuenta_con_cocina_otro, setValue]);

  useEffect(() => {
    if (
      distanciaSeguridadBloqueaCumplir &&
      formValues.resultado_validacion.trim().toUpperCase() !== RESULTADO_NO_CUMPLE
    ) {
      setValue("resultado_validacion", RESULTADO_NO_CUMPLE);
    }
  }, [
    distanciaSeguridadBloqueaCumplir,
    formValues.resultado_validacion,
    setValue,
  ]);

  const resultadoValidacionSelectOptions = useMemo(() => {
    const base = fieldSelectOptions.resultado_validacion ?? [{ value: "", label: "" }];
    if (!distanciaSeguridadBloqueaCumplir) {
      return base;
    }
    return base.filter(
      (option) => option.value === "" || option.value === RESULTADO_NO_CUMPLE,
    );
  }, [distanciaSeguridadBloqueaCumplir]);

  const visibleSectionFields = useCallback(
    (fields: readonly FormFieldKey[]) =>
      fields.filter(
        (field) => field !== "cuenta_con_cocina_otro" || showCocinaOtro,
      ),
    [showCocinaOtro],
  );

  const selectedEncuestadorProfileId =
    Number.parseInt(formValues.id_perfil_encuestador || "0", 10) || null;

  useEffect(() => {
    if (!draftUserKey) {
      setEncuestadorProfiles([]);
      return;
    }
    let cancelled = false;
    const loadProfiles = async () => {
      const refreshOptions = async () => {
        const options = await listEncuestadorProfilesForFormSelect(
          draftUserKey,
          selectedEncuestadorProfileId,
        );
        if (!cancelled) {
          setEncuestadorProfiles(options);
        }
      };
      await refreshOptions();
      if (isOnline) {
        try {
          await syncEnabledEncuestadorProfiles(draftUserKey);
          await refreshOptions();
        } catch {
          // En offline o error de red mantenemos el catálogo local.
        }
      }
    };
    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [draftUserKey, isOnline, selectedEncuestadorProfileId]);

  useEffect(() => {
    if (selectedEncuestadorProfileId == null || selectedEncuestadorProfileId <= 0) {
      return;
    }
    const expected = String(selectedEncuestadorProfileId);
    if (getValues("id_perfil_encuestador") !== expected) {
      setValue("id_perfil_encuestador", expected, { shouldDirty: false });
    }
  }, [
    encuestadorProfiles,
    getValues,
    selectedEncuestadorProfileId,
    setValue,
  ]);

  const isEditMode = originalFechaHora != null;

  const editBaselineRef = useRef<FormularioEditBaseline | null>(null);
  const [editBaselineReady, setEditBaselineReady] = useState(false);

  const fotosRef = useRef(fotos);
  const modoCoordenadasRef = useRef(modoCoordenadas);
  fotosRef.current = fotos;
  modoCoordenadasRef.current = modoCoordenadas;

  useEffect(() => {
    if (!isEditMode) {
      editBaselineRef.current = null;
      setEditBaselineReady(false);
      return;
    }
    editBaselineRef.current = null;
    setEditBaselineReady(false);
    const timer = window.setTimeout(() => {
      editBaselineRef.current = {
        formValues: getValues(),
        fotos: fotosRef.current.map((f) => ({ ...f })),
        modoCoordenadas: modoCoordenadasRef.current,
      };
      setEditBaselineReady(true);
    }, 150);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isEditMode, formId, getValues]);

  const hasEditChanges = useMemo(() => {
    if (!isEditMode) {
      return true;
    }
    if (!editBaselineReady || !editBaselineRef.current) {
      return false;
    }
    const current: FormularioEditBaseline = {
      formValues,
      fotos,
      modoCoordenadas,
    };
    return hasFormularioEditChanges(editBaselineRef.current, current);
  }, [
    editBaselineReady,
    formValues,
    fotos,
    isEditMode,
    modoCoordenadas,
  ]);

  const submitButton = getFormSubmitButtonState(
    isEditMode,
    hasEditChanges,
    enviando,
  );

  const hayContenidoDiligenciado = useMemo(
    () =>
      shouldPersistFormDraft(
        formValues,
        defaults,
        fotos.length,
        gps !== null,
      ),
    [formValues, defaults, fotos.length, gps],
  );

  const gpsFormulario = useMemo(() => {
    if (modoCoordenadas !== "manual") {
      return gps;
    }
    const latitud = Number.parseFloat(formValues.latitud);
    const longitud = Number.parseFloat(formValues.longitud);
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return null;
    }
    return {
      latitud,
      longitud,
      precision: gps?.precision ?? 5,
    };
  }, [formValues.latitud, formValues.longitud, gps, modoCoordenadas]);

  useFormDraftPersistence({
    draftUserKey,
    defaults,
    formValues,
    fotos,
    formId,
    originalFechaHora,
    gps,
    modoCoordenadas,
    getValues,
    skipPersistRef: skipDraftPersistRef,
  });

  const refreshPendientes = useCallback(async () => {
    // Contadores viven en Inicio; el hook de envío sigue esperando esta firma.
  }, []);

  const {
    cameraOpen,
    captureFlash,
    captureBadge,
    cameraVideoRef,
    openCameraForSlot,
    stopCamera,
    captureFromCamera,
    onFotoFileForSlot,
    quitarFotoSlot,
  } = usePhotoCapture({
    fotos,
    setFotos,
    activeSlot: activeFotoSlot,
    setActiveSlot: setActiveFotoSlot,
    setBanner,
  });

  const restablecerFormularioAVacio = useCallback(() => {
    stopCamera();
    limpiarUbicacion();
    reset(defaults);
    setFotos([]);
    setFormId(randomUuid());
    setOriginalFechaHora(null);
    setModoCoordenadas("automatico");
    clearFormDraft(draftUserKey);
    setBanner(null);
    setActiveFotoSlot(null);
    setPreviewFoto(null);
    setOpenSections(new Set(["coordenadas"]));
  }, [limpiarUbicacion, reset, defaults, draftUserKey, stopCamera]);

  const confirmarLimpiarFormulario = useCallback(() => {
    restablecerFormularioAVacio();
    setModalLimpiarAbierto(false);
  }, [restablecerFormularioAVacio]);

  const salirDelFormulario = useCallback(() => {
    if (isEditMode) {
      skipDraftPersistRef.current = true;
      clearFormDraft(draftUserKey);
    }
    navigate("/inicio");
  }, [draftUserKey, isEditMode, navigate]);

  useEffect(() => {
    if (!modalLimpiarAbierto) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalLimpiarAbierto(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalLimpiarAbierto]);

  const sincronizarAhora = async () => {
    setSincronizando(true);
    setBanner("Sincronizando formularios pendientes…");
    const result = await syncPendingForms();
    await refreshPendientes();
    if (
      result.skipped > 0 ||
      (result.failed > 0 && isNetworkLikeError(result.first_error ?? ""))
    ) {
      setBanner(null);
      setEnvioModal({
        tone: "warning",
        title: "Sin conexión estable",
        message:
          "El formulario quedó guardado localmente y la sincronización se reintentará automáticamente cuando vuelva internet.",
      });
    } else if (result.failed > 0) {
      const detail = result.first_error?.trim();
      setBanner(null);
      setEnvioModal({
        tone: "danger",
        title: "Error al sincronizar",
        message:
          detail && detail.length > 0
            ? `No se pudo sincronizar ${result.failed} formulario(s). Detalle: ${detail}`
            : `No se pudo sincronizar ${result.failed} formulario(s). Revisá el contador de errores en Inicio y reintentá cuando tengas conexión estable.`,
      });
    } else if (result.sent > 0) {
      setBanner(null);
      setEnvioModal({
        tone: "success",
        title: "Sincronización completada",
        message: `Se enviaron correctamente ${result.sent} formulario(s) al servidor.`,
      });
    } else {
      setBanner(null);
      setEnvioModal({
        tone: "warning",
        title: "Sin formularios para enviar",
        message:
          "No había registros pendientes de sincronizar en este momento, o aún aplican tiempos de espera entre reintentos.",
      });
    }
    setSincronizando(false);
  };

  useGpsFormFields({
    gps,
    modoCoordenadas,
    latitud: formValues.latitud,
    longitud: formValues.longitud,
    setValue,
  });

  const { onValid, onInvalid } = useFormularioSubmit({
    gps: gpsFormulario,
    fotos,
    formId,
    originalFechaHora,
    draftUserKey,
    modoCoordenadas,
    setBanner,
    setEnvioModal,
    setEnviando,
    refreshPendientes,
    setOpenSections,
    setFocus,
    requiredFields: REQUIRED_FIELDS,
  });
  const coordenadasSection = useMemo(
    () => FORM_SECTIONS.find((section) => section.id === "coordenadas") ?? null,
    [],
  );
  const formSectionsWithoutCoordinates = useMemo(
    () => FORM_SECTIONS.filter((section) => section.id !== "coordenadas"),
    [],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2f2ee_0,_#f6f7f5_45%,_#f6f7f5_100%)] px-4 py-8 text-slate-900 sm:px-6">
      {envioModal ? (
        <FormEnvioResultModal
          open
          tone={envioModal.tone}
          title={envioModal.title}
          message={envioModal.message}
          submittedForm={envioModal.submittedForm}
          onClose={() => {
            const modal = envioModal;
            const shouldGo = modal?.isEdit;
            const limpiarTrasEnvio = modal?.submittedForm != null;
            setEnvioModal(null);
            if (shouldGo) {
              navigate("/formularios-diligenciados");
              return;
            }
            if (limpiarTrasEnvio) {
              restablecerFormularioAVacio();
              requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              });
            }
          }}
        />
      ) : null}
      <FormClearModal
        open={modalLimpiarAbierto}
        onCancel={() => setModalLimpiarAbierto(false)}
        onConfirm={confirmarLimpiarFormulario}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-teal-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-700">
              NoSignal
            </p>
            <h1 className="text-3xl font-semibold">Formulario de visita</h1>
            <p className="text-sm text-slate-600">
              {isEditMode ? "Editando formulario existente · " : null}
              Sesión: {authUsername ?? "—"} · Red:{" "}
              {isOnline ? "online" : "offline"}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2 sm:gap-6">
            <div className="flex min-w-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200"
                onClick={salirDelFormulario}
              >
                Regresar
              </Button>
              <Button
                type="button"
                onClick={() => void sincronizarAhora()}
                disabled={sincronizando}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
              </Button>
            </div>
            {hayContenidoDiligenciado ? (
              <div className="flex shrink-0 border-l border-slate-200 pl-3 sm:pl-6">
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-200 text-amber-950 hover:bg-amber-50"
                  onClick={() => setModalLimpiarAbierto(true)}
                >
                  Limpiar
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <FormularioOverviewPanel
          estado={estado}
          progreso={progreso}
          gps={gpsFormulario}
          error={error}
          cargando={cargando}
          onSolicitarGps={() => {
            setModoCoordenadas("automatico");
            solicitarGPS();
          }}
          modoCoordenadas={modoCoordenadas}
          onChangeModoCoordenadas={(m) => {
            if (m === "manual") {
              setValue("latitud", "");
              setValue("longitud", "");
              setValue("metros_sobre_nivel_mar", "");
            }
            setModoCoordenadas(m);
          }}
          buildMapUrl={buildMapUrl}
          buildExternalMapUrl={buildExternalMapUrl}
        />

        {banner ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
            {banner}
          </div>
        ) : null}

        <form
          className="flex min-w-0 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
          onKeyDown={handleDiligenciadoFormEnterKey}
        >
          {coordenadasSection ? (
            <details
              key={coordenadasSection.id}
              open={openSections.has(coordenadasSection.id)}
              onToggle={(e) => {
                const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                setOpenSections((prev) => {
                  const next = new Set(prev);
                  if (isOpen) {
                    next.add(coordenadasSection.id);
                  } else {
                    next.delete(coordenadasSection.id);
                  }
                  return next;
                });
              }}
              className="form-section-panel group"
            >
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                {coordenadasSection.title}
              </summary>
              <div className="form-fields-grid">
                {visibleSectionFields(coordenadasSection.fields).map((field) => (
                  <FormFieldRow
                    key={field}
                    name={field}
                    register={register}
                    control={control}
                    error={errors[field]?.message as string | undefined}
                    editableGpsFields={modoCoordenadas === "manual"}
                  />
                ))}
              </div>
            </details>
          ) : null}

          <ImagePreviewModal
            image={previewFoto}
            onClose={() => setPreviewFoto(null)}
          />

          {formSectionsWithoutCoordinates.map((section) => (
            <Fragment key={section.id}>
              <details
                open={openSections.has(section.id)}
                onToggle={(e) => {
                  const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                  setOpenSections((prev) => {
                    const next = new Set(prev);
                    if (isOpen) {
                      next.add(section.id);
                    } else {
                      next.delete(section.id);
                    }
                    return next;
                  });
                }}
                className="form-section-panel group"
              >
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  {section.title}
                </summary>
                {section.id === "encuestador" ? (
                  <div className="form-fields-grid">
                    <label className="flex min-w-0 max-w-full flex-col text-sm font-medium text-slate-800">
                      Perfil de encuestador
                      <select
                        className="mt-1 block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm form-control-focus"
                        {...register("id_perfil_encuestador")}
                      >
                        <option value="">Seleccioná un perfil habilitado</option>
                        {encuestadorProfiles.map((profile) => {
                          const isSelected =
                            String(profile.id) ===
                            String(formValues.id_perfil_encuestador || "");
                          return (
                            <option
                              key={profile.id}
                              value={String(profile.id)}
                              disabled={
                                profile.assignedDisabled === true && !isSelected
                              }
                            >
                              {profile.nombre}
                            </option>
                          );
                        })}
                      </select>
                      <span className="mt-1 text-xs text-slate-500">
                        Los perfiles habilitados se guardan en el dispositivo al iniciar sesión con
                        internet; sin red se usa la última copia guardada.
                      </span>
                      {errors.id_perfil_encuestador?.message ? (
                        <span className="mt-1 text-xs text-red-600">
                          {String(errors.id_perfil_encuestador.message)}
                        </span>
                      ) : null}
                    </label>
                  </div>
                ) : (
                  <div className="form-fields-grid">
                    {visibleSectionFields(section.fields).map((field) => (
                      <FormFieldRow
                        key={field}
                        name={field}
                        register={register}
                        control={control}
                        error={errors[field]?.message as string | undefined}
                        editableGpsFields={modoCoordenadas === "manual"}
                        selectDisabled={
                          field === "resultado_validacion" && distanciaSeguridadBloqueaCumplir
                        }
                        selectHelperText={
                          field === "resultado_validacion" && distanciaSeguridadBloqueaCumplir
                            ? "No puede cumplir: no cumple la distancia de seguridad."
                            : undefined
                        }
                        selectOptions={
                          field === "resultado_validacion"
                            ? resultadoValidacionSelectOptions
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </details>
              {section.id === "desplazamiento" ? (
                <RegistroFotograficoSection
                  fotos={fotos}
                  activeSlot={activeFotoSlot}
                  onActiveSlotChange={setActiveFotoSlot}
                  pickerInputRefs={pickerInputRefs}
                  cameraOpen={cameraOpen}
                  cameraVideoRef={cameraVideoRef}
                  captureFlash={captureFlash}
                  captureBadge={captureBadge}
                  onOpenCameraForSlot={openCameraForSlot}
                  onStopCamera={stopCamera}
                  onCaptureFromCamera={() => void captureFromCamera()}
                  onFotoFileForSlot={(slot, event) => void onFotoFileForSlot(slot, event)}
                  onQuitarFotoSlot={quitarFotoSlot}
                  onPreviewFoto={setPreviewFoto}
                  cameraNotice={cameraOpen ? banner : null}
                  open={openSections.has("registro-fotografico")}
                  onToggle={(isOpen) => {
                    setOpenSections((prev) => {
                      const next = new Set(prev);
                      if (isOpen) {
                        next.add("registro-fotografico");
                      } else {
                        next.delete("registro-fotografico");
                      }
                      return next;
                    });
                  }}
                />
              ) : null}
            </Fragment>
          ))}

          <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            {submitButton.showNoChangesHint ? (
              <p className="text-center text-xs text-slate-500">
                No hay cambios para actualizar.
              </p>
            ) : null}
            <Button
              type="button"
              disabled={submitButton.disabled}
              className="bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
              onClick={() => void handleSubmit(onValid, onInvalid)()}
            >
              {submitButton.label}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
