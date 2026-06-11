import { useCallback, useLayoutEffect, useRef } from "react";
import { Controller, type Control, type UseFormRegister } from "react-hook-form";

import {
  fieldLabel,
  inputKindForField,
  triOptions,
} from "@/config/formFieldMeta";
import { fieldSelectOptions, isSearchableSelectField } from "@/config/formSelectOptions";
import {
  sanitizeCoordManualInput,
  validateCoordLatLonField,
} from "@/lib/coordNumericToken";
import {
  normalizeTelefonoStoredValue,
  TELEFONO_NO_TIENE_VALUE,
} from "@/lib/telefonoNormalize";
import { FECHA_FORMATO_MSG } from "@/services/formValidation";
import {
  FIELDS_REQUIRED_TO_SUBMIT,
  type FormFieldKey,
  type FormValues,
} from "@/types/formFields";

import { PlainSelect } from "./PlainSelect";
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

const REQUIRED_SUBMIT_SET = new Set<string>(FIELDS_REQUIRED_TO_SUBMIT);

function registerRulesForField(name: FormFieldKey) {
  if (!REQUIRED_SUBMIT_SET.has(name)) {
    return undefined;
  }
  if (name === "fecha_visita") {
    return {
      required: "La fecha de la visita es obligatoria.",
      validate: (value: string) => {
        const trimmed = String(value ?? "").trim();
        if (!trimmed) {
          return "La fecha de la visita es obligatoria.";
        }
        const ts = Date.parse(trimmed);
        return Number.isNaN(ts) ? FECHA_FORMATO_MSG : true;
      },
    };
  }
  if (name === "nombres_apellidos_encuestado") {
    return {
      required: "El nombre del encuestado es obligatorio.",
      validate: (value: string) =>
        String(value ?? "").trim() ? true : "El nombre del encuestado es obligatorio.",
    };
  }
  return { required: "Este campo es obligatorio." };
}

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
  selectDisabled?: boolean;
  selectHelperText?: string;
  selectOptions?: SelectOption[];
}

export const FormFieldRow = ({
  name,
  register,
  control,
  error,
  editableGpsFields = false,
  selectDisabled = false,
  selectHelperText,
  selectOptions,
}: FormFieldRowProps) => {
  const kind = inputKindForField(name);
  const label = fieldLabel(name);

  if (name === "autoriza_tratamiento_datos") {
    const options = (fieldSelectOptions[name] ?? SELECT_FALLBACK).filter(
      (o) => o.value.trim() !== "",
    );
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <fieldset className="flex min-w-0 max-w-full flex-col text-sm font-medium text-slate-800">
            <legend className="mb-2">{label}</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const selected = String(field.value ?? "") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {error ? (
              <span className="mt-1 text-xs text-red-600">{error}</span>
            ) : null}
          </fieldset>
        )}
      />
    );
  }

  if (name === "telefono_encuestado") {
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
    const options = selectOptions ?? fieldSelectOptions[name] ?? SELECT_FALLBACK;
    if (isSearchableSelectField(name)) {
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
    return (
      <PlainSelect
        name={name}
        control={control}
        options={options}
        label={label}
        error={error}
        disabled={selectDisabled}
        helperText={selectHelperText}
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
        {...register(name, registerRulesForField(name))}
      />
      {error ? (
        <span className="mt-1 text-xs text-red-600">{error}</span>
      ) : null}
    </label>
  );
};
