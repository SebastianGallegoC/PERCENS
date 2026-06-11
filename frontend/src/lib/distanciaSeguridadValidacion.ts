import type { FormValues } from "@/types/formFields";

export const DISTANCIA_SEGURIDAD_NO = "NO";
export const RESULTADO_NO_CUMPLE = "NO CUMPLE";
export const RESULTADO_CUMPLE = "CUMPLE";

export function distanciaSeguridadImpideCumplir(value: string): boolean {
  return value.trim().toUpperCase() === DISTANCIA_SEGURIDAD_NO;
}

export function resultadoValidacionPermitido(
  distanciaSeguridad: string,
  resultadoValidacion: string,
): boolean {
  if (!distanciaSeguridadImpideCumplir(distanciaSeguridad)) {
    return true;
  }
  const resultado = resultadoValidacion.trim().toUpperCase();
  return resultado === "" || resultado === RESULTADO_NO_CUMPLE;
}

export function applyDistanciaSeguridadRule(
  values: Pick<FormValues, "cumple_distancia_seguridad" | "resultado_validacion">,
): Pick<FormValues, "resultado_validacion"> {
  if (!distanciaSeguridadImpideCumplir(values.cumple_distancia_seguridad)) {
    return { resultado_validacion: values.resultado_validacion };
  }
  return { resultado_validacion: RESULTADO_NO_CUMPLE };
}
