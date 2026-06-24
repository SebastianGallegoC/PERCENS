import { isRegistroFotoSlot } from "@/config/registroFotografico";
import { normalizeFotosToSlots } from "@/lib/registroFotoUtils";
import { fetchFormFromApi, fetchFormPhotoDataUrl } from "@/services/api";
import type { FotoForm } from "@/services/db";
import { mapServerFotos } from "@/services/formHistory";

export type MapPointFormDetail = {
  informacion_vivienda: string;
  fotos: FotoForm[];
};

export async function loadMapPointFormDetail(
  formId: string,
): Promise<MapPointFormDetail> {
  const detail = await fetchFormFromApi(formId);
  const datos = detail.datos_formulario ?? {};
  const informacion_vivienda = String(datos.informacion_vivienda ?? "").trim();

  const baseFotos = mapServerFotos(formId, detail.fotos ?? []);
  const fetched: FotoForm[] = [];

  for (const foto of baseFotos) {
    if (foto.data && isRegistroFotoSlot(foto.slot)) {
      fetched.push({
        nombre_archivo: foto.nombre_archivo,
        data: foto.data,
        slot: foto.slot,
      });
      continue;
    }
    if (foto.serverFormId == null || foto.serverIndex == null) {
      continue;
    }
    if (!isRegistroFotoSlot(foto.slot)) {
      continue;
    }
    try {
      const data = await fetchFormPhotoDataUrl(foto.serverFormId, foto.serverIndex);
      fetched.push({
        nombre_archivo: foto.nombre_archivo,
        data,
        slot: foto.slot,
      });
    } catch {
      // Si una foto falla, continuamos con las demás.
    }
  }

  return {
    informacion_vivienda,
    fotos: normalizeFotosToSlots(fetched),
  };
}
