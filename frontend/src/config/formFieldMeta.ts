import type { FormFieldKey } from '@/types/formFields';
import { fieldSelectOptions } from '@/config/formSelectOptions';

const TRI_FIELDS = new Set<FormFieldKey>([
]);

const TEXTAREA_FIELDS = new Set<FormFieldKey>([
  'observaciones',
  'comentarios_desplazamiento',
  'cuenta_con_cocina_otro',
]);

const NUMBER_FIELDS = new Set<FormFieldKey>([
  'edad_encuestado',
  'tiempo_desplazamiento_horas',
  'tiempo_desplazamiento_minutos',
  'metros_sobre_nivel_mar',
]);

export type InputKind = 'date' | 'number' | 'select' | 'select-tri' | 'textarea' | 'text';

export const inputKindForField = (field: FormFieldKey): InputKind => {
  if (TEXTAREA_FIELDS.has(field)) {
    return 'textarea';
  }
  if (field === 'fecha_visita') {
    return 'date';
  }
  if (TRI_FIELDS.has(field)) {
    return 'select-tri';
  }
  if (fieldSelectOptions[field]) {
    return 'select';
  }
  if (NUMBER_FIELDS.has(field)) {
    return 'number';
  }
  if (
    field === 'latitud' ||
    field === 'longitud' ||
    field === 'metros_sobre_nivel_mar'
  ) {
    return 'number';
  }
  return 'text';
};

/** Campos tipo select solo Si/No: en importación se normalizan variantes (tildes, NO APLICA, etc.). */
export const SI_NO_IMPORT_NORMALIZE_FIELDS = new Set<FormFieldKey>([
]);

export const triOptions = [
  { value: '', label: '' },
  { value: 'Si', label: 'Sí' },
  { value: 'No', label: 'No' },
  { value: 'NR', label: 'NR' },
] as const;

export const fieldLabel = (field: FormFieldKey): string =>
  (
    {
      autoriza_tratamiento_datos: 'Tratamiento de datos',
      fecha_visita: 'Fecha de la visita',
      datos_encuestado: 'Datos del encuestado',
      nombres_apellidos_encuestado: 'Nombres y apellidos',
      tipo_documento_encuestado: 'Identificación',
      numero_documento_encuestado: 'N°',
      telefono_encuestado: 'Número telefónico',
      edad_encuestado: 'Edad',
      informacion_vivienda: 'Información de la vivienda',
      cuenta_con_cocina: '¿Cuenta con cocina?',
      cuenta_con_cocina_otro: 'Especifique cuál',
      resultado_validacion: 'Resultado de validación',
      tiempo_desplazamiento_horas: 'Tiempo de desplazamiento - horas',
      tiempo_desplazamiento_minutos: 'Tiempo de desplazamiento - minutos',
      comentarios_desplazamiento: 'Comentarios',
      nombres_apellidos_encuestador: 'Nombres y apellidos',
      tipo_documento_encuestador: 'Identificación',
      numero_documento_encuestador: 'N°',
      telefono_encuestador: 'Número telefónico',
      cargo_encuestador: 'Cargo',
      empresa_entidad_encuestador: 'Empresa y/o entidad',
      firma_encuestador: 'Firma',
      metros_sobre_nivel_mar: 'Metros sobre el nivel del mar',
    } as Partial<Record<FormFieldKey, string>>
  )[field] ??
  field
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
