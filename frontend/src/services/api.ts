import { ACCESS_TOKEN_KEY } from '@/lib/authStorage';
import type { UserRole } from '@/lib/permissions';
import {
  LEGACY_API_MAX_GPS_ACCURACY_METERS,
  MIN_GPS_PRECISION_METERS,
} from '@/constants/gpsConfig';
import {
  agentSessionLog,
  beneficiaryFieldProbe,
  idSuffix,
} from '@/debug/agentSessionLog';

import { isRegistroFotoSlot } from '@/config/registroFotografico';

import type { OfflineForm } from './db';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
type ApiFormPayload = {
  id_formulario: string;
  id_perfil_encuestador?: number;
  fecha_hora: string;
  fecha_actualizacion?: string;
  gps: {
    latitud: number;
    longitud: number;
    precision: number;
  };
  datos_formulario: Record<string, unknown>;
  fotos: Array<{ nombre_archivo: string; data: string; slot: 1 | 2 | 3 | 4 | 5 | 6 }>;
};

/** Normaliza imágenes para el validador del API (prefijo data:image/…). */
function ensureFotoDataUrl(data: string): string {
  const s = typeof data === 'string' ? data : '';
  const t = s.trim();
  if (/^data:image\//i.test(t)) {
    return t;
  }
  const compact = t.replace(/\s+/g, '');
  if (compact.length >= 64 && /^[A-Za-z0-9+/]+=*$/.test(compact)) {
    return `data:image/jpeg;base64,${compact}`;
  }
  return s;
}

function payloadForApi(form: OfflineForm): ApiFormPayload {
  const fechaAct = form.fecha_actualizacion?.trim() || form.fecha_hora;
  const perfilId = form.id_perfil_encuestador;
  const out: ApiFormPayload = {
    id_formulario: form.id_formulario,
    fecha_hora: form.fecha_hora,
    gps: {
      ...form.gps,
      // Tope de precisión enviada al API (alineado con validación servidor y cliente).
      precision: Math.max(
        MIN_GPS_PRECISION_METERS,
        Math.min(form.gps.precision, LEGACY_API_MAX_GPS_ACCURACY_METERS),
      ),
    },
    datos_formulario: form.datos_formulario,
    fotos: form.fotos.map((f) => ({
      nombre_archivo: f.nombre_archivo,
      data: ensureFotoDataUrl(f.data),
      slot: isRegistroFotoSlot(f.slot) ? f.slot : 1,
    })),
  };
  if (
    typeof perfilId === "number" &&
    Number.isFinite(perfilId) &&
    perfilId > 0
  ) {
    out.id_perfil_encuestador = perfilId;
  }
  if (fechaAct !== form.fecha_hora) {
    out.fecha_actualizacion = fechaAct;
  }
  return out;
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('blob_read_failed'));
    reader.readAsDataURL(blob);
  });

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
  role: UserRole;
}

export interface UserRead {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  username: string;
  password: string;
  role: UserRole;
}

export interface UserUpdatePayload {
  role?: UserRole;
  is_active?: boolean;
  password?: string;
}

export class LoginApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail || `login_${status}`);
    this.name = "LoginApiError";
    this.status = status;
    this.detail = detail || `login_${status}`;
  }
}

export class EncuestadorProfileApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail || `encuestador_profile_${status}`);
    this.name = "EncuestadorProfileApiError";
    this.status = status;
    this.detail = detail || `encuestador_profile_${status}`;
  }
}

function parseApiErrorDetail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
  } catch {
    // texto plano del servidor
  }
  return trimmed;
}

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new LoginApiError(response.status, detail || `login_${response.status}`);
  }
  return response.json() as Promise<LoginResponse>;
};

export const fetchMeApi = async (): Promise<UserRead> => {
  const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `auth_me_${response.status}`);
  }
  return (await response.json()) as UserRead;
};

/** Respuesta de `GET /api/v1/forms/` (datos en servidor; fotos = rutas de archivo). */
export interface FormReadItem {
  id_formulario: string;
  id_perfil_encuestador?: number | null;
  fecha_hora: string;
  fecha_actualizacion: string;
  latitud: number;
  longitud: number;
  precision: number | null;
  datos_formulario: Record<string, unknown>;
  fotos: unknown[];
  missing_field_count?: number;
  missing_photo_count?: number;
}

export interface FormSummaryItem {
  id_formulario: string;
  id_perfil_encuestador?: number | null;
  fecha_hora: string;
  fecha_actualizacion: string;
  latitud: number;
  longitud: number;
  precision: number | null;
  nombres_apellidos_encuestado: string;
  municipio: string;
  fecha_visita: string;
  resultado_validacion: string;
  /** Conteo calculado en servidor (search); evita GET detalle solo para el badge. */
  missing_field_count?: number;
  missing_photo_count?: number;
}

export interface FormSearchQuery {
  limit?: number;
  offset?: number;
  q?: string;
  municipio?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface FormSearchResponse {
  items: FormSummaryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface EncuestadorProfileRead {
  id: number;
  username_owner: string;
  formularios_asociados?: number;
  nombres_apellidos_encuestador: string;
  tipo_documento_encuestador: string;
  numero_documento_encuestador: string;
  telefono_encuestador: string;
  cargo_encuestador: string;
  empresa_entidad_encuestador: string;
  firma_encuestador: string;
  habilitado: boolean;
  created_at: string;
  updated_at: string;
}

export interface EncuestadorProfileLite {
  id: number;
  nombre: string;
}

export interface FormStatsFiltersApplied {
  municipio: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  resultado_validacion: "CUMPLE" | "NO CUMPLE" | null;
}

export interface FormStatsCumpleDetalle {
  sin_servicio_energia: number;
  servicio_irregular_directo: number;
  servicio_irregular_indirecto: number;
  sin_clasificar: number;
}

export type FormStatsVista = "resumen" | "cumple_detalle" | "no_cumple";

export interface FormStatsResponse {
  total: number;
  cumple: number;
  no_cumple: number;
  sin_resultado: number;
  vista: FormStatsVista;
  cumple_detalle: FormStatsCumpleDetalle | null;
  filtros_aplicados: FormStatsFiltersApplied;
}

export interface FormStatsQuery {
  municipio?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  resultado_validacion?: "CUMPLE" | "NO CUMPLE";
}

export interface FormStatsMunicipiosResponse {
  municipios: string[];
}

export interface FormStatsMonthlyMunicipioSerie {
  municipio: string;
  totales: number[];
}

export interface FormStatsMonthlyResponse {
  anio: number;
  municipios: string[];
  etiquetas_mes: string[];
  series: FormStatsMonthlyMunicipioSerie[];
  total: number;
}

export interface FormStatsMonthlyQuery {
  anio: number;
  municipios: string[];
}

export interface FormMapPointItem {
  id_formulario: string;
  latitud: number;
  longitud: number;
  municipio: string;
  fecha_visita: string;
  nombres_apellidos_encuestado: string;
  resultado_validacion: string;
  informacion_vivienda: string;
}

export interface FormMapPointsFiltersApplied {
  municipios: string[];
  fecha_desde: string | null;
  fecha_hasta: string | null;
  resultado_validacion: "CUMPLE" | "NO CUMPLE" | null;
}

export interface FormMapPointsResponse {
  items: FormMapPointItem[];
  total: number;
  filtros_aplicados: FormMapPointsFiltersApplied;
}

export interface FormMapPointsQuery {
  municipios?: string[];
  fecha_desde?: string;
  fecha_hasta?: string;
  resultado_validacion?: "CUMPLE" | "NO CUMPLE";
}

/** Elimina el formulario en el servidor (requiere JWT). */
export const deleteFormFromApi = async (formId: string): Promise<void> => {
  const url = `${API_BASE}/api/v1/forms/${encodeURIComponent(formId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (response.status === 404) {
    const t = await response.text();
    throw new Error(t || 'form_not_found');
  }
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_delete_${response.status}`);
  }
};

export const listFormsFromApi = async (limit = 200): Promise<FormReadItem[]> => {
  const response = await fetch(`${API_BASE}/api/v1/forms/?limit=${limit}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_list_${response.status}`);
  }
  const body = (await response.json()) as { items?: FormReadItem[] };
  return Array.isArray(body.items) ? body.items : [];
};

export const searchFormsFromApi = async (
  params: FormSearchQuery = {},
): Promise<FormSearchResponse> => {
  const search = new URLSearchParams();
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  search.set("limit", String(limit));
  search.set("offset", String(offset));
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.municipio?.trim()) {
    search.set("municipio", params.municipio.trim());
  }
  if (params.fecha_desde?.trim()) {
    search.set("fecha_desde", params.fecha_desde.trim());
  }
  if (params.fecha_hasta?.trim()) {
    search.set("fecha_hasta", params.fecha_hasta.trim());
  }
  const response = await fetch(`${API_BASE}/api/v1/forms/search?${search.toString()}`, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_search_${response.status}`);
  }
  const body = (await response.json()) as Partial<FormSearchResponse>;
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    items,
    total: typeof body.total === "number" ? body.total : items.length,
    limit: typeof body.limit === "number" ? body.limit : limit,
    offset: typeof body.offset === "number" ? body.offset : offset,
  };
};

/** Agregados de validación en servidor (`GET /api/v1/forms/stats`). */
export const fetchFormStatsFromApi = async (
  params: FormStatsQuery = {},
): Promise<FormStatsResponse> => {
  const search = new URLSearchParams();
  if (params.municipio?.trim()) {
    search.set("municipio", params.municipio.trim());
  }
  if (params.fecha_desde?.trim()) {
    search.set("fecha_desde", params.fecha_desde.trim());
  }
  if (params.fecha_hasta?.trim()) {
    search.set("fecha_hasta", params.fecha_hasta.trim());
  }
  if (params.resultado_validacion) {
    search.set("resultado_validacion", params.resultado_validacion);
  }
  const qs = search.toString();
  const url = `${API_BASE}/api/v1/forms/stats${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_stats_${response.status}`);
  }
  return (await response.json()) as FormStatsResponse;
};

/** Años con fecha de visita en formularios (`GET /api/v1/forms/stats/anios`). */
export const fetchFormStatsAniosFromApi = async (): Promise<number[]> => {
  const url = `${API_BASE}/api/v1/forms/stats/anios`;
  const response = await fetch(url, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_stats_anios_${response.status}`);
  }
  const body = (await response.json()) as { anios?: number[] };
  return Array.isArray(body.anios) ? body.anios : [];
};

/** Diligencias por mes y municipio (`GET /api/v1/forms/stats/diligencias-mensuales`). */
export const fetchFormStatsMonthlyFromApi = async (
  params: FormStatsMonthlyQuery,
): Promise<FormStatsMonthlyResponse> => {
  const search = new URLSearchParams();
  search.set("anio", String(params.anio));
  for (const m of params.municipios) {
    const trimmed = m.trim();
    if (trimmed) {
      search.append("municipios", trimmed);
    }
  }
  const url = `${API_BASE}/api/v1/forms/stats/diligencias-mensuales?${search.toString()}`;
  const response = await fetch(url, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_stats_monthly_${response.status}`);
  }
  return (await response.json()) as FormStatsMonthlyResponse;
};

/** Municipios distintos en formularios del servidor (`GET /api/v1/forms/stats/municipios`). */
export const fetchFormStatsMunicipiosFromApi = async (): Promise<string[]> => {
  const url = `${API_BASE}/api/v1/forms/stats/municipios`;
  const response = await fetch(url, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_stats_municipios_${response.status}`);
  }
  const body = (await response.json()) as FormStatsMunicipiosResponse;
  return Array.isArray(body.municipios) ? body.municipios : [];
};

/** Puntos para visor de mapa en Datos (`GET /api/v1/forms/map-points`). */
export const fetchFormMapPointsFromApi = async (
  params: FormMapPointsQuery = {},
): Promise<FormMapPointsResponse> => {
  const search = new URLSearchParams();
  for (const municipio of params.municipios ?? []) {
    const trimmed = municipio.trim();
    if (trimmed) {
      search.append("municipios", trimmed);
    }
  }
  if (params.fecha_desde?.trim()) {
    search.set("fecha_desde", params.fecha_desde.trim());
  }
  if (params.fecha_hasta?.trim()) {
    search.set("fecha_hasta", params.fecha_hasta.trim());
  }
  if (params.resultado_validacion) {
    search.set("resultado_validacion", params.resultado_validacion);
  }
  const qs = search.toString();
  const url = `${API_BASE}/api/v1/forms/map-points${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `forms_map_points_${response.status}`);
  }
  return (await response.json()) as FormMapPointsResponse;
};

/** Devuelve detalle de un formulario por id (incluye fotos como rutas en `fotos`). */
export const fetchFormFromApi = async (formId: string): Promise<FormReadItem> => {
  const url = `${API_BASE}/api/v1/forms/${encodeURIComponent(formId)}`;
  const response = await fetch(url, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    const t = await response.text();
    // Compatibilidad temporal: servidores antiguos no exponen GET /forms/{id} (405/404).
    // Intentamos recuperar por listado para no bloquear la edición/precarga.
    if (response.status === 404 || response.status === 405) {
      try {
        const items = await listFormsFromApi(500);
        const fallback = items.find((it) => it.id_formulario === formId);
        if (fallback) {
          return fallback;
        }
      } catch {
        // Si también falla el listado, preservamos error original abajo.
      }
    }
    throw new Error(t || `forms_get_${response.status}`);
  }
  return (await response.json()) as FormReadItem;
};

export const postForm = async (payload: OfflineForm): Promise<Response> => {
  const body = payloadForApi(payload);
  // #region agent log
  agentSessionLog({
    hypothesisId: "H1",
    location: "api.ts:postForm",
    message: "forms_post_payload",
    data: {
      idSuf: idSuffix(body.id_formulario),
      ben: beneficiaryFieldProbe(body.datos_formulario),
      datosJsonLen: JSON.stringify(body.datos_formulario ?? {}).length,
      datosKeysSample: Object.keys(body.datos_formulario ?? {}).slice(0, 40),
    },
  });
  // #endregion
  // FastAPI suele redirigir /forms -> /forms/ (307). En algunos despliegues ese redirect
  // no incluye cabeceras CORS y el navegador lo bloquea; por eso usamos la ruta final.
  const res = await fetch(`${API_BASE}/api/v1/forms/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': body.id_formulario,
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  // #region agent log
  agentSessionLog({
    hypothesisId: "H1",
    location: "api.ts:postForm",
    message: "forms_post_response",
    data: {
      idSuf: idSuffix(body.id_formulario),
      ok: res.ok,
      status: res.status,
    },
  });
  // #endregion
  return res;
};

export const fetchFormPhotoDataUrl = async (
  formId: string,
  photoIndex: number,
): Promise<string> => {
  const url = `${API_BASE}/api/v1/forms/${encodeURIComponent(formId)}/fotos/${photoIndex}`;
  const res = await fetch(url, {
    headers: { ...authHeaders() },
    cache: 'default',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `foto_${res.status}`);
  }
  const blob = await res.blob();
  return blobToDataUrl(blob);
};

export const listEncuestadorProfilesApi = async (): Promise<EncuestadorProfileRead[]> => {
  const response = await fetch(`${API_BASE}/api/v1/encuestador-profiles/`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `encuestador_profiles_list_${response.status}`);
  }
  const body = (await response.json()) as { items?: EncuestadorProfileRead[] };
  return Array.isArray(body.items) ? body.items : [];
};

export const listEnabledEncuestadorProfilesApi = async (): Promise<EncuestadorProfileLite[]> => {
  const response = await fetch(`${API_BASE}/api/v1/encuestador-profiles/enabled`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `encuestador_profiles_enabled_${response.status}`);
  }
  const body = (await response.json()) as { items?: EncuestadorProfileLite[] };
  return Array.isArray(body.items) ? body.items : [];
};

export const createEncuestadorProfileApi = async (
  payload: Omit<EncuestadorProfileRead, "id" | "username_owner" | "created_at" | "updated_at">,
): Promise<EncuestadorProfileRead> => {
  const response = await fetch(`${API_BASE}/api/v1/encuestador-profiles/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `encuestador_profiles_create_${response.status}`);
  }
  return (await response.json()) as EncuestadorProfileRead;
};

export const updateEncuestadorProfileApi = async (
  profileId: number,
  payload: Omit<EncuestadorProfileRead, "id" | "username_owner" | "created_at" | "updated_at">,
): Promise<EncuestadorProfileRead> => {
  const response = await fetch(`${API_BASE}/api/v1/encuestador-profiles/${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `encuestador_profiles_update_${response.status}`);
  }
  return (await response.json()) as EncuestadorProfileRead;
};

export const setEncuestadorProfileEnabledApi = async (
  profileId: number,
  habilitado: boolean,
): Promise<EncuestadorProfileRead> => {
  const response = await fetch(`${API_BASE}/api/v1/encuestador-profiles/${profileId}/enabled`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ habilitado }),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `encuestador_profiles_enabled_update_${response.status}`);
  }
  return (await response.json()) as EncuestadorProfileRead;
};

export const deleteEncuestadorProfileApi = async (profileId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/v1/encuestador-profiles/${profileId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    const t = await response.text();
    const detail = parseApiErrorDetail(t) || `encuestador_profiles_delete_${response.status}`;
    throw new EncuestadorProfileApiError(response.status, detail);
  }
};

export const listUsersApi = async (): Promise<UserRead[]> => {
  const response = await fetch(`${API_BASE}/api/v1/users/`, {
    headers: { ...authHeaders() },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(parseApiErrorDetail(detail) || `users_list_${response.status}`);
  }
  const body = (await response.json()) as { items?: UserRead[] };
  return Array.isArray(body.items) ? body.items : [];
};

export const createUserApi = async (payload: UserCreatePayload): Promise<UserRead> => {
  const response = await fetch(`${API_BASE}/api/v1/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(parseApiErrorDetail(detail) || `users_create_${response.status}`);
  }
  return (await response.json()) as UserRead;
};

export const updateUserApi = async (
  userId: number,
  payload: UserUpdatePayload,
): Promise<UserRead> => {
  const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(parseApiErrorDetail(detail) || `users_update_${response.status}`);
  }
  return (await response.json()) as UserRead;
};

export const deleteUserApi = async (userId: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/v1/users/${userId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(parseApiErrorDetail(detail) || `users_delete_${response.status}`);
  }
};
