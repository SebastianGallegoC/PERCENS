import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";

import type { FormFieldKey, FormValues } from "@/types/formFields";

import type { SelectOption } from "./SearchableSelect";

const selectClass =
  "mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm [overflow-wrap:anywhere] form-control-focus appearance-none bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9";

const selectErrorClass = "border-red-600 ring-1 ring-red-500/40";

const CHEVRON_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E\")";

type PlainSelectProps = {
  name: FormFieldKey;
  control: Control<FormValues>;
  options: SelectOption[];
  error?: string;
  label: string;
  disabled?: boolean;
  helperText?: string;
};

export const PlainSelect = ({
  name,
  control,
  options,
  error,
  label,
  disabled = false,
  helperText,
}: PlainSelectProps) => {
  const allowedValues = new Set(options.map((option) => option.value));

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        validate: (value: string) => {
          const trimmed = String(value ?? "").trim();
          if (trimmed === "") {
            return true;
          }
          return allowedValues.has(value) ? true : "Elegí una opción de la lista";
        },
      }}
      render={({ field }) => (
        <label className="flex min-w-0 max-w-full flex-col text-sm font-medium text-slate-800 md:col-span-2">
          {label}
          <select
            {...field}
            value={String(field.value ?? "")}
            disabled={disabled}
            className={`${selectClass} ${error ? selectErrorClass : ""} ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`.trim()}
            style={{ backgroundImage: CHEVRON_BG }}
          >
            {options.map((option) => (
              <option
                key={option.value === "" ? "__empty__" : option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
          {helperText ? (
            <span className="mt-1 text-xs text-slate-500">{helperText}</span>
          ) : null}
          {error ? (
            <span className="mt-1 text-xs text-red-600">{error}</span>
          ) : null}
        </label>
      )}
    />
  );
};
