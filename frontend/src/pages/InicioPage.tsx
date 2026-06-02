import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ClipboardList, Download, FileSpreadsheet, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { countErrorForms, countPendingForms } from "@/services/sync";
import { MATRIZ_TEMPLATE_PUBLIC_PATH } from "@/services/matrizCaracterizacionExport";

export const InicioPage = () => {
  const online = useConnectivityStatus();
  const [pendientes, setPendientes] = useState(0);
  const [erroresSync, setErroresSync] = useState(0);

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
          className="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <Link
            to="/formulario"
            state={{ freshForm: true }}
            className="group block h-full rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl"
          >
            <Card className="h-full border-teal-100 bg-white/90 shadow-[0_18px_40px_-35px_rgba(15,118,110,0.6)] transition group-hover:-translate-y-0.5">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3 max-md:flex-row md:flex-col md:gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:h-11 md:w-11">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 md:space-y-1.5">
                    <CardTitle className="text-base leading-snug text-teal-800 md:text-sm md:leading-snug lg:text-base lg:leading-snug">
                      Completar encuesta
                    </CardTitle>
                    <CardDescription className="text-xs leading-snug text-slate-600 md:leading-snug lg:text-sm lg:leading-normal">
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
                <div className="flex items-start gap-3 max-md:flex-row md:flex-col md:gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 md:h-11 md:w-11">
                    <FileSpreadsheet className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 md:space-y-1.5">
                    <CardTitle className="text-base leading-snug text-slate-900 md:text-sm md:leading-snug lg:text-base lg:leading-snug">
                      Ver encuestas diligenciadas
                    </CardTitle>
                    <CardDescription className="text-xs leading-snug text-slate-600 md:leading-snug lg:text-sm lg:leading-normal">
                      Historial de este equipo y, si hay sesión, formularios ya
                      guardados en el servidor.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link
            to="/perfil-encuestador"
            className="group block h-full rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl"
          >
            <Card className="h-full border-indigo-100 bg-white/90 shadow-[0_18px_40px_-35px_rgba(79,70,229,0.6)] transition group-hover:-translate-y-0.5">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3 max-md:flex-row md:flex-col md:gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 md:h-11 md:w-11">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 md:space-y-1.5">
                    <CardTitle className="text-base leading-snug text-indigo-800 md:text-sm md:leading-snug lg:text-base lg:leading-snug">
                      Perfil encuestador
                    </CardTitle>
                    <CardDescription className="text-xs leading-snug text-slate-600 md:leading-snug lg:text-sm lg:leading-normal">
                      Crea, edita, deshabilita o elimina perfiles para diligenciar más rápido.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {online ? (
            <Link
              to="/datos"
              className="group block h-full rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:rounded-2xl"
            >
              <Card className="h-full border-emerald-100 bg-white/90 shadow-[0_18px_40px_-35px_rgba(16,185,129,0.45)] transition group-hover:-translate-y-0.5">
                <CardHeader className="gap-3">
                  <div className="flex items-start gap-3 max-md:flex-row md:flex-col md:gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 md:h-11 md:w-11">
                      <BarChart3 className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1 md:space-y-1.5">
                      <CardTitle className="text-base leading-snug text-emerald-900 md:text-sm md:leading-snug lg:text-base lg:leading-snug">
                        Datos
                      </CardTitle>
                      <CardDescription className="text-xs leading-snug text-slate-600 md:leading-snug lg:text-sm lg:leading-normal">
                        Gráficos de validación con filtros por municipio y fecha de visita.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
        </section>

        <div className="mt-4">
          <a
            href={MATRIZ_TEMPLATE_PUBLIC_PATH}
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
    </div>
  );
};
