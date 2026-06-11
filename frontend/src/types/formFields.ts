/** Todas las claves del formulario (persistencia y payload). */
export const REQUIRED_FIELDS = [
  'latitud',
  'longitud',
  'metros_sobre_nivel_mar',
  'autoriza_tratamiento_datos',
  'fecha_visita',
  'municipio',
  'vereda',
  'nombre_predio',
  'datos_encuestado',
  'nombres_apellidos_encuestado',
  'tipo_documento_encuestado',
  'numero_documento_encuestado',
  'telefono_encuestado',
  'edad_encuestado',
  'informacion_vivienda',
  'cumple_distancia_seguridad',
  'cuenta_con_cocina',
  'cuenta_con_cocina_otro',
  'resultado_validacion',
  'observaciones',
  'tiempo_desplazamiento_horas',
  'tiempo_desplazamiento_minutos',
  'medio_transporte',
  'comentarios_desplazamiento',
  'id_perfil_encuestador',
] as const;

export type FormFieldKey = (typeof REQUIRED_FIELDS)[number];

import { SURVEY_TESTING_RELAXED_SUBMIT } from "@/config/submitRequirements";

/** Únicos campos de datos que deben estar completos para guardar / enviar a cola. */
export const FIELDS_REQUIRED_TO_SUBMIT = (
  SURVEY_TESTING_RELAXED_SUBMIT
    ? (["nombres_apellidos_encuestado", "fecha_visita"] as const)
    : (["nombres_apellidos_encuestado", "fecha_visita", "id_perfil_encuestador"] as const)
) satisfies readonly FormFieldKey[];

export type FormValues = Record<FormFieldKey, string>;
