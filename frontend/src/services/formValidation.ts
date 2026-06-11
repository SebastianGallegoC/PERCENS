import {
  normalizeTelefonoStoredValue,
  TELEFONO_NO_TIENE_VALUE,
} from "@/lib/telefonoNormalize";
import {
  fieldLabel,
  inputKindForField,
} from "@/config/formFieldMeta";
import {
  COORD_DECIMAL_COMMA_MSG,
  COORD_LAT_LON_FIELD_KEYS,
  COORD_NUMERIC_FIELD_KEYS,
  coordDecimalInputHasComma,
  normalizeCoordNumericCell,
} from "@/lib/coordNumericToken";
import { resultadoValidacionPermitido } from "@/lib/distanciaSeguridadValidacion";
import type { OfflineForm } from "@/services/db";
import { REQUIRED_FIELDS, type FormFieldKey, type FormValues } from "@/types/formFields";
const TRI_ALLOWED = new Set(["Si", "No", "NR"]);
const PHONE_RE = /^[0-9+\-()\s]{6,20}$/;

export interface ValidationIssue {
  code: string;
  message: string;
}

/** Mensaje unificado para fechas en Excel/importación y validación de valores. */
export const FECHA_FORMATO_MSG =
  "Fecha no válida. Ejemplos: 15/03/2026 (día/mes/año) o 2026-03-15.";

export type FormValueFieldIssue = {
  field: FormFieldKey;
  code: string;
  message: string;
};

export type FormValueRowIssue = {
  code: string;
  message: string;
};

function isBlank(value: unknown): boolean {
  return value == null || String(value).trim() === "";
}

function parseDateSafe(value: unknown): number | null {
  if (isBlank(value)) {
    return null;
  }
  const ts = Date.parse(String(value));
  return Number.isNaN(ts) ? null : ts;
}

/**
 * Validación por campo (y mensajes de fila) para mostrar errores en UI de importación.
 * El envío a cola exige nombre del encuestado y fecha de visita (vía `validateOfflineFormPayload`);
 * el resto de campos puede ir vacío.
 */
export const validateFormValuesWithFieldDetails = (
  values: FormValues,
): { fieldIssues: FormValueFieldIssue[]; rowIssues: FormValueRowIssue[] } => {
  const fieldIssues: FormValueFieldIssue[] = [];
  const rowIssues: FormValueRowIssue[] = [];

  if (!isBlank(values.edad_encuestado)) {
    const edad = Number(values.edad_encuestado);
    if (!Number.isFinite(edad) || edad < 0 || edad > 120) {
      fieldIssues.push({
        field: "edad_encuestado",
        code: "edad_range",
        message: "Edad fuera de rango (0-120).",
      });
    }
  }

  for (const key of ["telefono_encuestado"] as const) {
    if (!isBlank(values[key])) {
      const tel = normalizeTelefonoStoredValue(String(values[key]));
      if (
        tel !== TELEFONO_NO_TIENE_VALUE &&
        !PHONE_RE.test(tel.trim())
      ) {
        fieldIssues.push({
          field: key,
          code: "telefono_format",
          message:
            "Teléfono inválido. Usá 6–20 caracteres (dígitos, +, -, espacios, paréntesis) o la opción «No tiene».",
        });
      }
    }
  }

  for (const key of COORD_LAT_LON_FIELD_KEYS) {
    if (isBlank(values[key])) {
      continue;
    }
    const raw = String(values[key]);
    if (coordDecimalInputHasComma(raw)) {
      fieldIssues.push({
        field: key,
        code: "coord_decimal_comma",
        message: COORD_DECIMAL_COMMA_MSG,
      });
      continue;
    }
    const norm = normalizeCoordNumericCell(raw);
    if (norm === "" || !Number.isFinite(Number(norm))) {
      fieldIssues.push({
        field: key,
        code: "coord_decimal_invalid",
        message:
          key === "latitud"
            ? "LATITUD debe ser un número decimal con punto (.) como separador."
            : "LONGITUD debe ser un número decimal con punto (.) como separador.",
      });
      continue;
    }
    const n = Number(norm);
    if (key === "latitud" && (n < -90 || n > 90)) {
      fieldIssues.push({
        field: key,
        code: "latitud_range",
        message: "LATITUD debe estar entre -90 y 90.",
      });
    }
    if (key === "longitud" && (n < -180 || n > 180)) {
      fieldIssues.push({
        field: key,
        code: "longitud_range",
        message: "LONGITUD debe estar entre -180 y 180.",
      });
    }
  }

  if (!isBlank(values.metros_sobre_nivel_mar)) {
    const msnmRaw = String(values.metros_sobre_nivel_mar);
    if (coordDecimalInputHasComma(msnmRaw)) {
      fieldIssues.push({
        field: "metros_sobre_nivel_mar",
        code: "coord_decimal_comma",
        message: COORD_DECIMAL_COMMA_MSG,
      });
    } else {
      const msnm = Number(normalizeCoordNumericCell(msnmRaw));
      if (!Number.isFinite(msnm) || msnm < -500 || msnm > 9000) {
        fieldIssues.push({
          field: "metros_sobre_nivel_mar",
          code: "metros_sobre_nivel_mar_range",
          message:
            "Metros sobre el nivel del mar deben estar entre -500 y 9000 (usá punto decimal).",
        });
      }
    }
  }

  for (const key of REQUIRED_FIELDS) {
    const fk = key as FormFieldKey;
    if (
      inputKindForField(fk) === "number" &&
      fk !== "edad_encuestado" &&
      !isBlank(values[key])
    ) {
      const raw = COORD_NUMERIC_FIELD_KEYS.has(fk)
        ? normalizeCoordNumericCell(String(values[key]))
        : String(values[key]).replace(/\s/g, "").replace(",", ".");
      if (raw === "" || !Number.isFinite(Number(raw))) {
        fieldIssues.push({
          field: fk,
          code: "number_invalid",
          message: `«${fieldLabel(fk)}» debe ser un número válido (podés usar punto o coma decimal).`,
        });
      }
    }
    if (inputKindForField(fk) === "select-tri" && !isBlank(values[key])) {
      if (!TRI_ALLOWED.has(String(values[key]).trim())) {
        fieldIssues.push({
          field: fk,
          code: `tri_${key}`,
          message: `En «${fieldLabel(fk)}» usá exactamente: Si, No o NR.`,
        });
      }
    }
  }

  if (!isBlank(values.fecha_visita) && parseDateSafe(values.fecha_visita) == null) {
    fieldIssues.push({
      field: "fecha_visita",
      code: "fecha_invalid",
      message: FECHA_FORMATO_MSG,
    });
  }

  if (
    !resultadoValidacionPermitido(
      String(values.cumple_distancia_seguridad ?? ""),
      String(values.resultado_validacion ?? ""),
    )
  ) {
    fieldIssues.push({
      field: "resultado_validacion",
      code: "distancia_seguridad_no_cumple",
      message:
        "No puede cumplir: la vivienda no cumple la distancia de seguridad.",
    });
  }

  return { fieldIssues, rowIssues };
};

export const validateFormValues = (values: FormValues): ValidationIssue[] => {
  const { fieldIssues, rowIssues } = validateFormValuesWithFieldDetails(values);
  return [
    ...fieldIssues.map((i) => ({ code: i.code, message: i.message })),
    ...rowIssues.map((i) => ({ code: i.code, message: i.message })),
  ];
};

const toFormValuesFromPayload = (payload: OfflineForm): FormValues => {
  const out = {} as FormValues;
  for (const key of REQUIRED_FIELDS) {
    const v = payload.datos_formulario[key];
    out[key] = typeof v === "string" ? v : v == null ? "" : String(v);
  }
  return out;
};

export const validateOfflineFormPayload = (form: OfflineForm): ValidationIssue[] => {
  const issues = validateFormValues(toFormValuesFromPayload(form));

  const datos = form.datos_formulario as Record<string, unknown>;
  if (isBlank(datos.nombres_apellidos_encuestado)) {
    issues.push({
      code: "encuestado_required",
      message: "El nombre del encuestado es obligatorio para enviar.",
    });
  }
  if (isBlank(datos.fecha_visita)) {
    issues.push({
      code: "fecha_visita_required",
      message: "La fecha de la visita es obligatoria para enviar.",
    });
  }
  const tsEnvio = parseDateSafe(form.fecha_hora);
  if (tsEnvio == null) {
    issues.push({
      code: "fecha_hora_invalid",
      message: "La fecha del formulario no es válida.",
    });
  }
  if (form.fecha_actualizacion != null && String(form.fecha_actualizacion).trim() !== "") {
    const tsAct = parseDateSafe(form.fecha_actualizacion);
    if (tsAct == null) {
      issues.push({
        code: "fecha_actualizacion_invalid",
        message: "La fecha de actualización no es válida.",
      });
    } else if (tsEnvio != null && tsAct < tsEnvio) {
      issues.push({
        code: "fecha_actualizacion_before_envio",
        message: "La fecha de actualización no puede ser anterior al primer guardado.",
      });
    }
  }

  return issues;
};

export const joinValidationMessages = (issues: ValidationIssue[]): string =>
  issues.map((i) => i.message).join(" ");

/** Títulos y textos del modal al bloquear guardar o actualizar. */
export function getSubmitGuardCopy(isEdit: boolean): {
  blockedTitle: string;
  encuestadoRequired: string;
  fechaVisitaRequired: string;
} {
  if (isEdit) {
    return {
      blockedTitle: "No se puede actualizar",
      encuestadoRequired:
        "Completá el nombre del encuestado antes de actualizar el formulario.",
      fechaVisitaRequired:
        "Completá la fecha de la visita antes de actualizar el formulario.",
    };
  }
  return {
    blockedTitle: "No se puede enviar",
    encuestadoRequired:
      "Completá el nombre del encuestado antes de guardar o enviar el formulario.",
    fechaVisitaRequired:
      "Completá la fecha de la visita antes de guardar o enviar el formulario.",
  };
}

const FECHA_VISITA_ISSUE_CODES = new Set([
  "fecha_visita_required",
  "fecha_invalid",
]);

/** Secciones a abrir cuando falla la validación previa al envío. */
export function sectionsToOpenForValidationIssues(
  issues: ValidationIssue[],
): string[] {
  const codes = new Set(issues.map((i) => i.code));
  const sections: string[] = [];
  if (codes.has("encuestado_required")) {
    sections.push("encuestado");
  }
  if ([...codes].some((c) => FECHA_VISITA_ISSUE_CODES.has(c))) {
    sections.push("visita");
  }
  return sections;
}
