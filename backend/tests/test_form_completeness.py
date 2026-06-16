"""Tests de conteo de completitud (alineados con frontend formCompleteness.test.ts)."""

from app.services.form_completeness import (
    compute_missing_pending_summary,
    count_missing_form_fields,
    count_missing_photo_slots,
)


def _full_datos() -> dict:
    return {
        "latitud": "7.5",
        "longitud": "-72.25",
        "metros_sobre_nivel_mar": "1200",
        "autoriza_tratamiento_datos": "Si",
        "fecha_visita": "2026-06-01",
        "municipio": "Bucaramanga",
        "vereda": "La Esperanza",
        "nombre_predio": "Finca 1",
        "datos_encuestado": "Propietario",
        "nombres_apellidos_encuestado": "Ana Pérez",
        "tipo_documento_encuestado": "CC",
        "numero_documento_encuestado": "123",
        "telefono_encuestado": "3001234567",
        "edad_encuestado": "35",
        "informacion_vivienda": "Casa",
        "cumple_distancia_seguridad": "Si",
        "cuenta_con_cocina": "Si",
        "resultado_validacion": "CUMPLE",
        "observaciones": "Ninguna",
        "tiempo_desplazamiento_horas": "1",
        "tiempo_desplazamiento_minutos": "30",
        "medio_transporte": "Moto",
        "comentarios_desplazamiento": "Ruta estable",
        "id_perfil_encuestador": "2",
    }


def test_empty_datos_counts_most_required_fields():
    missing = count_missing_form_fields(
        {},
        latitud=0.0,
        longitud=0.0,
        id_perfil_encuestador=None,
    )
    # 24 campos en loop (26 totales menos *_otro auxiliares)
    assert missing == 24


def test_full_datos_zero_missing_fields():
    assert (
        count_missing_form_fields(
            _full_datos(),
            latitud=7.5,
            longitud=-72.25,
            id_perfil_encuestador=2,
        )
        == 0
    )


def test_datos_encuestado_otro_sin_texto_cuenta_como_faltante():
    datos = _full_datos()
    datos["datos_encuestado"] = "OTRO"
    datos["datos_encuestado_otro"] = ""
    assert (
        count_missing_form_fields(
            datos,
            latitud=7.5,
            longitud=-72.25,
            id_perfil_encuestador=2,
        )
        == 1
    )


def test_desplazamiento_cuatro_campos_vacios():
    datos = _full_datos()
    datos["tiempo_desplazamiento_horas"] = ""
    datos["tiempo_desplazamiento_minutos"] = ""
    datos["medio_transporte"] = ""
    datos["comentarios_desplazamiento"] = ""
    fields, photos = compute_missing_pending_summary(
        datos,
        latitud=7.5,
        longitud=-72.25,
        id_perfil_encuestador=2,
        fotos_raw=[],
    )
    assert fields == 4
    assert photos == 6


def test_fotos_por_indice_en_lista():
    fotos = [{"path": f"/uploads/f{i}.jpg"} for i in range(4)]
    assert count_missing_photo_slots(fotos) == 2


def test_fotos_con_slot_explicito():
    fotos = [
        {"path": "/a.jpg", "slot": 1},
        {"path": "/b.jpg", "slot": 3},
    ]
    assert count_missing_photo_slots(fotos) == 4
