import { REQUIRED_FIELDS, type FormFieldKey } from '@/types/formFields';

export interface FormSectionDef {
  id: string;
  title: string;
  fields: readonly FormFieldKey[];
}

export const FORM_SECTIONS: readonly FormSectionDef[] = [
  {
    id: 'coordenadas',
    title: 'Coordenadas WGS84 grados decimales',
    fields: ['latitud', 'longitud', 'metros_sobre_nivel_mar'],
  },
  {
    id: 'tratamiento',
    title: 'Tratamiento de datos',
    fields: ['autoriza_tratamiento_datos'],
  },
  {
    id: 'visita',
    title: 'Fecha de la visita',
    fields: ['fecha_visita'],
  },
  {
    id: 'ubicacion',
    title: 'Ubicación',
    fields: ['municipio', 'vereda', 'nombre_predio'],
  },
  {
    id: 'encuestado',
    title: 'Encuestado',
    fields: [
      'datos_encuestado',
      'nombres_apellidos_encuestado',
      'tipo_documento_encuestado',
      'numero_documento_encuestado',
      'telefono_encuestado',
      'edad_encuestado',
    ],
  },
  {
    id: 'vivienda',
    title: 'Vivienda',
    fields: [
      'informacion_vivienda',
      'cumple_distancia_seguridad',
      'cuenta_con_cocina',
      'cuenta_con_cocina_otro',
    ],
  },
  {
    id: 'desplazamiento',
    title: 'Desplazamiento',
    fields: [
      'tiempo_desplazamiento_horas',
      'tiempo_desplazamiento_minutos',
      'medio_transporte',
      'comentarios_desplazamiento',
    ],
  },
  {
    id: 'validacion',
    title: 'Validación',
    fields: ['resultado_validacion', 'observaciones'],
  },
  {
    id: 'encuestador',
    title: 'Encuestador',
    fields: ['id_perfil_encuestador'],
  },
] as const;

const covered = new Set<FormFieldKey>(FORM_SECTIONS.flatMap((s) => [...s.fields]));
const missing = REQUIRED_FIELDS.filter((f) => !covered.has(f));
const extra = [...covered].filter((f) => !(REQUIRED_FIELDS as readonly string[]).includes(f));

if (import.meta.env.DEV && (missing.length > 0 || extra.length > 0)) {
  console.error('FORM_SECTIONS desalineado con REQUIRED_FIELDS', { missing, extra });
}
