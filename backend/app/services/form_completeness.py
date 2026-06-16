"""Conteo de campos y fotos faltantes (espejo de frontend/src/lib/formCompleteness.ts)."""

from __future__ import annotations

import re
from typing import Any

from app.services.storage import fotos_json_for_api_list

REQUIRED_FIELDS: tuple[str, ...] = (
    "latitud",
    "longitud",
    "metros_sobre_nivel_mar",
    "autoriza_tratamiento_datos",
    "fecha_visita",
    "municipio",
    "vereda",
    "nombre_predio",
    "datos_encuestado",
    "datos_encuestado_otro",
    "nombres_apellidos_encuestado",
    "tipo_documento_encuestado",
    "numero_documento_encuestado",
    "telefono_encuestado",
    "edad_encuestado",
    "informacion_vivienda",
    "cumple_distancia_seguridad",
    "cuenta_con_cocina",
    "cuenta_con_cocina_otro",
    "resultado_validacion",
    "observaciones",
    "tiempo_desplazamiento_horas",
    "tiempo_desplazamiento_minutos",
    "medio_transporte",
    "comentarios_desplazamiento",
    "id_perfil_encuestador",
)

SKIP_IN_COMPLETENESS_LOOP = frozenset({"cuenta_con_cocina_otro", "datos_encuestado_otro"})

REGISTRO_FOTO_SLOT_NUMBERS: tuple[int, ...] = (1, 2, 3, 4, 5, 6)

LEGACY_COCINA_OTRO_PLACEHOLDER = "OTRO - HABILITAR ESCRIBIR"

_COORD_NUMERIC_RE = re.compile(r"^-?\d+(?:\.\d+)?")


def _field_text(datos: dict[str, Any], key: str) -> str:
    value = datos.get(key)
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip()


def _is_blank(value: str) -> bool:
    return value.strip() == ""


def _normalize_coord_numeric_cell(raw: str) -> str:
    t = raw.strip().replace("\u2212", "-").replace(",", ".")
    t = re.sub(r"\s", "", t)
    if not t:
        return ""
    t = re.sub(r"^[^0-9.-]+", "", t)
    match = _COORD_NUMERIC_RE.match(t)
    return match.group(0) if match else ""


def _coord_field_filled(value: str, gps_coord: float | None) -> bool:
    token = _normalize_coord_numeric_cell(value)
    if token and token != "0":
        return True
    if gps_coord is not None and gps_coord != 0:
        return True
    return False


def _is_datos_encuestado_otro(value: str) -> bool:
    v = value.strip().upper()
    return v == "OTRO" or v.startswith("OTRO -")


def _is_cuenta_con_cocina_otro(value: str) -> bool:
    v = value.strip().upper()
    return (
        v == "OTRO"
        or v.startswith("OTRO -")
        or v == LEGACY_COCINA_OTRO_PLACEHOLDER
    )


def _parse_datos_encuestado(datos: str, otro: str) -> tuple[str, str]:
    stored = datos.strip()
    otro_text = otro.strip()
    match = re.match(r"^OTRO\s*-\s*(.*)$", stored, re.IGNORECASE)
    if match:
        detail = (match.group(1) or "").strip()
        return "OTRO", detail or otro_text
    if stored.upper() == "OTRO":
        return "OTRO", otro_text
    return stored, ""


def _parse_cuenta_con_cocina(cuenta: str, otro: str) -> tuple[str, str]:
    stored = cuenta.strip()
    otro_text = otro.strip()
    match = re.match(r"^OTRO\s*-\s*(.*)$", stored, re.IGNORECASE)
    if match:
        detail = (match.group(1) or "").strip()
        if detail.upper() == "HABILITAR ESCRIBIR":
            return "OTRO", otro_text
        return "OTRO", detail or otro_text
    upper = stored.upper()
    if upper == "OTRO" or upper == LEGACY_COCINA_OTRO_PLACEHOLDER:
        return "OTRO", otro_text
    return stored, ""


def _is_field_missing(
    key: str,
    datos: dict[str, Any],
    *,
    latitud: float,
    longitud: float,
    id_perfil_encuestador: int | None,
) -> bool:
    if key == "cuenta_con_cocina_otro":
        if not _is_cuenta_con_cocina_otro(_field_text(datos, "cuenta_con_cocina")):
            return False
    if key == "datos_encuestado_otro":
        if not _is_datos_encuestado_otro(_field_text(datos, "datos_encuestado")):
            return False

    if key == "latitud":
        return not _coord_field_filled(_field_text(datos, "latitud"), latitud)
    if key == "longitud":
        return not _coord_field_filled(_field_text(datos, "longitud"), longitud)

    if key == "cuenta_con_cocina":
        parsed_cuenta, parsed_otro = _parse_cuenta_con_cocina(
            _field_text(datos, "cuenta_con_cocina"),
            _field_text(datos, "cuenta_con_cocina_otro"),
        )
        if _is_cuenta_con_cocina_otro(parsed_cuenta):
            return _is_blank(parsed_otro)
        return _is_blank(parsed_cuenta)

    if key == "datos_encuestado":
        parsed_datos, parsed_otro = _parse_datos_encuestado(
            _field_text(datos, "datos_encuestado"),
            _field_text(datos, "datos_encuestado_otro"),
        )
        if _is_datos_encuestado_otro(parsed_datos):
            return _is_blank(parsed_otro)
        return _is_blank(parsed_datos)

    if key == "id_perfil_encuestador":
        raw = _field_text(datos, "id_perfil_encuestador")
        if not _is_blank(raw):
            return False
        return not (
            isinstance(id_perfil_encuestador, int)
            and id_perfil_encuestador > 0
        )

    return _is_blank(_field_text(datos, key))


def _foto_slot_has_content(item: Any) -> bool:
    if isinstance(item, str):
        return bool(item.strip())
    if isinstance(item, dict):
        path = item.get("path")
        return isinstance(path, str) and bool(path.strip())
    return False


def _resolve_foto_slot(item: Any, ordered_index: int | None) -> int | None:
    if isinstance(item, dict):
        slot = item.get("slot")
        if slot in REGISTRO_FOTO_SLOT_NUMBERS:
            return int(slot)
        legacy = item.get("visita")
        if legacy in (1, 2, 3, 4):
            return int(legacy)
    if (
        ordered_index is not None
        and 0 <= ordered_index < len(REGISTRO_FOTO_SLOT_NUMBERS)
    ):
        return REGISTRO_FOTO_SLOT_NUMBERS[ordered_index]
    return None


def count_missing_photo_slots(fotos_raw: object) -> int:
    fotos_list = fotos_json_for_api_list(fotos_raw)
    present: set[int] = set()

    for index, item in enumerate(fotos_list):
        if not _foto_slot_has_content(item):
            continue
        slot = _resolve_foto_slot(item, index)
        if slot is not None:
            present.add(slot)

    unresolved = [
        item
        for index, item in enumerate(fotos_list)
        if _foto_slot_has_content(item) and _resolve_foto_slot(item, index) is None
    ]
    missing_slots = [slot for slot in REGISTRO_FOTO_SLOT_NUMBERS if slot not in present]
    for i in range(min(len(unresolved), len(missing_slots))):
        present.add(missing_slots[i])

    return sum(1 for slot in REGISTRO_FOTO_SLOT_NUMBERS if slot not in present)


def count_missing_form_fields(
    datos_formulario: dict[str, Any] | None,
    *,
    latitud: float,
    longitud: float,
    id_perfil_encuestador: int | None,
) -> int:
    datos = datos_formulario if isinstance(datos_formulario, dict) else {}
    missing = 0
    for key in REQUIRED_FIELDS:
        if key in SKIP_IN_COMPLETENESS_LOOP:
            continue
        if _is_field_missing(
            key,
            datos,
            latitud=latitud,
            longitud=longitud,
            id_perfil_encuestador=id_perfil_encuestador,
        ):
            missing += 1
    return missing


def compute_missing_pending_summary(
    datos_formulario: dict[str, Any] | None,
    *,
    latitud: float,
    longitud: float,
    id_perfil_encuestador: int | None,
    fotos_raw: object,
) -> tuple[int, int]:
    """Devuelve (missing_field_count, missing_photo_count)."""
    field_count = count_missing_form_fields(
        datos_formulario,
        latitud=latitud,
        longitud=longitud,
        id_perfil_encuestador=id_perfil_encuestador,
    )
    photo_count = count_missing_photo_slots(fotos_raw)
    return field_count, photo_count
