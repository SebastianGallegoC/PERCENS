import { useCallback, useLayoutEffect, useRef } from "react";
import { Controller, type Control, type UseFormRegister } from "react-hook-form";

import {
  fieldLabel,
  inputKindForField,
  triOptions,
} from "@/config/formFieldMeta";
import { fieldSelectOptions } from "@/config/formSelectOptions";
import {
  sanitizeCoordManualInput,
  validateCoordLatLonField,
} from "@/lib/coordNumericToken";
import {
  normalizeTelefonoStoredValue,
  TELEFONO_NO_TIENE_VALUE,
} from "@/lib/telefonoNormalize";
import type { FormFieldKey, FormValues } from "@/types/formFields";

import { SearchableSelect, type SelectOption } from "./SearchableSelect";

const inputClass =
  "mt-1 block w-full min-w-0 max-w-full box-border rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm [overflow-wrap:anywhere] form-control-focus";

const dateInputClass = `${inputClass} form-date-input`;

const textareaClass = `${inputClass} max-h-48 resize-none overflow-y-auto`;

const syncTextareaHeight = (el: HTMLTextAreaElement | null) => {
  if (!el) {
    return;
  }
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

interface AutoGrowTextareaProps {
  name: FormFieldKey;
  label: string;
  register: UseFormRegister<FormValues>;
  error?: string;
}

const AutoGrowTextarea = ({
  name,
  label,
  register,
  error,
}: AutoGrowTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: registerRef, onChange, ...registerRest } = register(name);

  const resize = useCallback((el: HTMLTextAreaElement | null) => {
    syncTextareaHeight(el);
  }, []);

  useLayoutEffect(() => {
    resize(textareaRef.current);
  }, [resize]);

  return (
    <label className="flex min-w-0 flex-col text-sm font-medium text-slate-800 md:col-span-2">
      {label}
      <textarea
        {...registerRest}
        rows={3}
        className={textareaClass}
        ref={(el) => {
          registerRef(el);
          textareaRef.current = el;
          resize(el);
        }}
        onChange={(event) => {
          onChange(event);
          resize(event.currentTarget);
        }}
      />
      {error ? (
        <span className="mt-1 text-xs text-red-600">{error}</span>
      ) : null}
    </label>
  );
};

const SELECT_FALLBACK: SelectOption[] = [{ value: "", label: "" }];

const TRIO_OPTIONS_LIST: SelectOption[] = triOptions.map((o) => ({
  value: o.value,
  label: o.label,
}));

interface FormFieldRowProps {
  name: FormFieldKey;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  error?: string;
  editableGpsFields?: boolean;
}

export const FormFieldRow = ({
  name,
  register,
  control,
  error,
  editableGpsFields = false,
}: FormFieldRowProps) => {
  const kind = inputKindForField(name);
  const label = fieldLabel(name);

  if (name === "telefono_encuestado" || name === "telefono_encuestador") {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const { onBlur: fieldOnBlur, ref, ...fieldRest } = field;
          return (
            <label className="flex min-w-0 flex-col text-sm font-medium text-slate-800 md:col-span-2">
              {label}
              <input
                {...fieldRest}
                ref={ref}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={inputClass}
                onBlur={(e) => {
                  fieldOnBlur();
                  const n = normalizeTelefonoStoredValue(e.target.value);
                  if (n !== String(field.value ?? "")) {
                    field.onChange(n);
                  }
                }}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Atajo:</span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900"
                  onClick={() => field.onChange(TELEFONO_NO_TIENE_VALUE)}
                >
                  No tiene
                </button>
              </div>
              {error ? (
                <span className="mt-1 text-xs text-red-600">{error}</span>
              ) : null}
            </label>
          );
        }}
      />
    );
  }

  if (kind === "textarea") {
    return (
      <AutoGrowTextarea
        name={name}
        label={label}
        register={register}
        error={error}
      />
    );
  }

  if (kind === "select-tri") {
    return (
      <SearchableSelect
        name={name}
        control={control}
        options={TRIO_OPTIONS_LIST}
        label={label}
        error={error}
      />
    );
  }

  if (kind === "select") {
    const options = fieldSelectOptions[name] ?? SELECT_FALLBACK;
    return (
      <SearchableSelect
        name={name}
        control={control}
        options={options}
        label={label}
        error={error}
      />
    );
  }

  const type = kind === "date" ? "date" : kind === "number" ? "number" : "text";

  const isPositiveInt =
    name === "edad_encuestado" ||
    name === "tiempo_desplazamiento_horas" ||
    name === "tiempo_desplazamiento_minutos";
  const isGpsDerivedField = name === "latitud" || name === "longitud";
  const isManualCoordField = isGpsDerivedField && editableGpsFields;
  const isReadOnly = isGpsDerivedField && !editableGpsFields;
  const gpsReadOnlyClass = isReadOnly ? " bg-slate-100 text-slate-600" : "";
  const inputType = isManualCoordField ? "text" : type;
  const fieldInputClass =
    inputType === "date" ? dateInputClass : inputClass;

  if (isManualCoordField) {
    const coordKey = name as "latitud" | "longitud";
    return (
      <Controller
        name={name}
        control={control}
        rules={{
          validate: (v) => validateCoordLatLonField(String(v ?? ""), coordKey),
        }}
        render={({ field }) => {
          const { onBlur: fieldOnBlur, ref, ...fieldRest } = field;
          return (
            <label className="flex min-w-0 max-w-full flex-col text-sm font-medium text-slate-800">
              {label}
              <input
                {...fieldRest}
                ref={ref}
                type="text"
                inputMode="text"
                lang="en"
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                className={fieldInputClass}
                placeholder={
                  coordKey === "latitud" ? "ej: 4.609710" : "ej: -74.081750"
                }
                title="Usá el punto (.) como separador decimal."
                onChange={(e) => {
                  field.onChange(sanitizeCoordManualInput(e.target.value));
                }}
                onBlur={(e) => {
                  fieldOnBlur();
                  const cleaned = sanitizeCoordManualInput(e.target.value);
                  if (cleaned !== String(field.value ?? "")) {
                    field.onChange(cleaned);
                  }
                }}
              />
              <span className="mt-1 text-xs font-normal text-slate-500">
                Separador decimal: punto (.). No uses coma (,).
              </span>
              {error ? (
                <span className="mt-1 text-xs font-normal text-red-600">
                  {error}
                </span>
              ) : null}
            </label>
          );
        }}
      />
    );
  }

  return (
    <label className="flex min-w-0 max-w-full flex-col text-sm font-medium text-slate-800">
      {label}
      <input
        className={`${fieldInputClass}${gpsReadOnlyClass}`}
        type={inputType}
        min={isPositiveInt ? 0 : undefined}
        step={
          type === "number" && !isManualCoordField
            ? isPositiveInt
              ? 1
              : "any"
            : undefined
        }
        readOnly={isReadOnly}
        title={
          isGpsDerivedField
            ? "Este campo se actualiza al tomar ubicación GPS (6 decimales)."
            : undefined
        }
        {...register(name)}
      />
      {error ? (
        <span className="mt-1 text-xs text-red-600">{error}</span>
      ) : null}
    </label>
  );
};
