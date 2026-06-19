import { fetchFormFromApi, fetchFormPhotoDataUrl } from '@/services/api';
import type { FotoForm, HistorialForm, PrecargaForm } from '@/services/db';
import { mapServerFotos, type DisplayRow } from '@/services/formHistory';
import {
  fotosConSlotDesdeDetalle,
  normalizeFotosToSlots,
} from '@/lib/registroFotoUtils';

export type FotoSnapshotLike = {
  nombre_archivo: string;
  data?: string;
  slot?: unknown;
  visita?: unknown;
};

export type DetailSourceKind = 'server' | 'precarga' | 'historial' | 'live';

export const estadoClass: Record<HistorialForm['estado'], string> = {
  PENDIENTE: 'text-amber-700',
  ERROR: 'text-rose-700',
  ENVIADO: 'text-emerald-700',
};

export const DETAIL_SOURCE_COLOR: Record<DetailSourceKind, string> = {
  server: 'bg-emerald-100 text-emerald-800',
  precarga: 'bg-indigo-100 text-indigo-800',
  historial: 'bg-amber-100 text-amber-800',
  live: 'bg-slate-100 text-slate-700',
};

export const DETAIL_SOURCE_LABEL: Record<DetailSourceKind, string> = {
  server: 'Servidor',
  precarga: 'Precarga',
  historial: 'Historial local',
  live: 'Local en edicion',
};

/** Preserva slot 1–6; normaliza visita legacy al cargar detalle. */
export function fotosConSlotDesdeDetalleExport(source: FotoSnapshotLike[]): FotoForm[] {
  return fotosConSlotDesdeDetalle(source);
}

/** Si no hay fotos en base64 local, descarga desde el API usando metadatos del servidor. */
export async function hydrateFotosFromServerIfNeeded(
  row: DisplayRow,
  existing: FotoForm[],
): Promise<FotoForm[]> {
  if (existing.length > 0) {
    return normalizeFotosToSlots(existing);
  }
  const serverRow = row.server;
  if (!serverRow) {
    return existing;
  }

  let rawFotos = serverRow.fotos ?? [];
  if (rawFotos.length === 0) {
    if (serverRow.missing_photo_count === 0) {
      return existing;
    }
    try {
      const detail = await fetchFormFromApi(serverRow.id_formulario);
      rawFotos = detail.fotos ?? [];
    } catch {
      return existing;
    }
  }
  if (rawFotos.length === 0) {
    return existing;
  }

  const serverFotos = mapServerFotos(serverRow.id_formulario, rawFotos);
  const fetched: FotoForm[] = [];
  for (const foto of serverFotos) {
    if (foto.serverFormId == null || foto.serverIndex == null) {
      continue;
    }
    try {
      const data = await fetchFormPhotoDataUrl(
        foto.serverFormId,
        foto.serverIndex,
      );
      fetched.push(
        ...fotosConSlotDesdeDetalle([
          {
            nombre_archivo: foto.nombre_archivo,
            data,
            slot: foto.slot,
            visita: foto.visita,
          },
        ]),
      );
    } catch {
      // Si una foto falla, continuamos con las demas.
    }
  }
  return normalizeFotosToSlots(fetched);
}

/** Misma prioridad que al armar el detalle: servidor → precarga → historial → cola local. */
export function previewDetailSourceForRow(
  row: DisplayRow,
  precarga: PrecargaForm | null,
): DetailSourceKind {
  if (row.server) {
    return 'server';
  }
  if (precarga) {
    return 'precarga';
  }
  if (row.historial) {
    return 'historial';
  }
  return 'live';
}

/** @deprecated Usar fotosConSlotDesdeDetalleExport */
export const fotosConVisitaDesdeDetalle = fotosConSlotDesdeDetalleExport;
