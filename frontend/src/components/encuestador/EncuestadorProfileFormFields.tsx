import { useRef, useState } from "react";

import { TIPO_DOCUMENTO_OPTIONS } from "@/config/formSelectOptions";
import { readSignatureImageAsDataUrl } from "@/services/imageCompression";

const inputClass =
  "mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm form-control-focus";

export type EncuestadorProfileFormState = {
  nombres_apellidos_encuestador: string;
  tipo_documento_encuestador: string;
  numero_documento_encuestador: string;
  telefono_encuestador: string;
  cargo_encuestador: string;
  empresa_entidad_encuestador: string;
  firma_encuestador: string;
  habilitado: boolean;
};

type Props = {
  values: EncuestadorProfileFormState;
  onChange: (values: EncuestadorProfileFormState) => void;
  fieldError?: string | null;
};

const isFirmaPreview = (value: string): boolean =>
  /^data:image\//i.test(value.trim());

export const EncuestadorProfileFormFields = ({
  values,
  onChange,
  fieldError,
}: Props) => {
  const firmaInputRef = useRef<HTMLInputElement>(null);
  const [firmaLoading, setFirmaLoading] = useState(false);
  const [firmaLocalError, setFirmaLocalError] = useState<string | null>(null);

  const patch = (partial: Partial<EncuestadorProfileFormState>) => {
    onChange({ ...values, ...partial });
  };

  const onFirmaFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setFirmaLocalError(null);
    setFirmaLoading(true);
    try {
      const dataUrl = await readSignatureImageAsDataUrl(file);
      patch({ firma_encuestador: dataUrl });
    } catch {
      setFirmaLocalError("No se pudo cargar la imagen. Usá JPG o PNG.");
    } finally {
      setFirmaLoading(false);
      if (firmaInputRef.current) {
        firmaInputRef.current.value = "";
      }
    }
  };

  const firmaError = firmaLocalError ?? fieldError;

  return (
    <div className="space-y-3">
      <label className="block text-sm text-slate-700">
        Nombres y apellidos
        <input
          className={inputClass}
          value={values.nombres_apellidos_encuestador}
          onChange={(e) => patch({ nombres_apellidos_encuestador: e.target.value })}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Tipo de identificación
        <select
          className={inputClass}
          value={values.tipo_documento_encuestador}
          onChange={(e) => patch({ tipo_documento_encuestador: e.target.value })}
        >
          <option value="">Seleccioná el tipo</option>
          {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        N° documento
        <input
          className={inputClass}
          value={values.numero_documento_encuestador}
          onChange={(e) => patch({ numero_documento_encuestador: e.target.value })}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Teléfono
        <input
          type="tel"
          className={inputClass}
          value={values.telefono_encuestador}
          onChange={(e) => patch({ telefono_encuestador: e.target.value })}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Cargo
        <input
          className={inputClass}
          value={values.cargo_encuestador}
          onChange={(e) => patch({ cargo_encuestador: e.target.value })}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Empresa y/o entidad
        <input
          className={inputClass}
          value={values.empresa_entidad_encuestador}
          onChange={(e) => patch({ empresa_entidad_encuestador: e.target.value })}
        />
      </label>

      <div className="block text-sm text-slate-700">
        <span className="font-medium">Firma</span>
        <p className="mt-0.5 text-xs text-slate-500">
          Subí una foto o escaneo de la firma (JPG o PNG).
        </p>
        <input
          ref={firmaInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-800"
          disabled={firmaLoading}
          onChange={(e) => void onFirmaFile(e.target.files?.[0])}
        />
        {firmaLoading ? (
          <p className="mt-2 text-xs text-slate-600">Procesando imagen…</p>
        ) : null}
        {isFirmaPreview(values.firma_encuestador) ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <img
              src={values.firma_encuestador}
              alt="Vista previa de la firma"
              className="mx-auto max-h-32 w-auto max-w-full object-contain"
            />
            <button
              type="button"
              className="mt-2 text-xs font-medium text-rose-700 hover:underline"
              onClick={() => patch({ firma_encuestador: "" })}
            >
              Quitar firma
            </button>
          </div>
        ) : values.firma_encuestador.trim() ? (
          <p className="mt-2 text-xs text-amber-800">
            La firma guardada no se puede previsualizar; volvé a subir una imagen.
          </p>
        ) : null}
        {firmaError ? (
          <p className="mt-1 text-xs font-medium text-rose-700">{firmaError}</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={values.habilitado}
          onChange={(e) => patch({ habilitado: e.target.checked })}
        />
        Perfil habilitado
      </label>
    </div>
  );
};
