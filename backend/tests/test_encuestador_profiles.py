from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.schemas.encuestador_profile import EncuestadorProfileCreate
from app.services.encuestador_profiles import (
    create_profile_for_user,
    delete_profile_for_user,
    list_profile_reads,
    validate_profile_is_assignable,
)


@pytest.mark.asyncio
async def test_delete_profile_for_user_blocked_when_profile_in_use(monkeypatch):
    profile = SimpleNamespace(id=12, habilitado=True)
    monkeypatch.setattr(
        "app.services.encuestador_profiles.get_profile_for_user",
        AsyncMock(return_value=profile),
    )
    monkeypatch.setattr(
        "app.services.encuestador_profiles.count_forms_using_profile",
        AsyncMock(return_value=2),
    )

    deleted, reason = await delete_profile_for_user(AsyncMock(), "encuestador", 12)

    assert deleted is False
    assert reason == "profile_in_use"


@pytest.mark.asyncio
async def test_validate_profile_is_assignable_rejects_disabled(monkeypatch):
    profile = SimpleNamespace(id=7, habilitado=False)
    monkeypatch.setattr(
        "app.services.encuestador_profiles.get_profile_for_user",
        AsyncMock(return_value=profile),
    )

    ok, reason = await validate_profile_is_assignable(AsyncMock(), "encuestador", 7)

    assert ok is False
    assert reason == "encuestador_profile_disabled"


@pytest.mark.asyncio
async def test_list_profile_reads_includes_form_counts(monkeypatch):
    profiles = [
        SimpleNamespace(
            id=1,
            username_owner="encuestador",
            nombres_apellidos_encuestador="Ana",
            tipo_documento_encuestador="CC",
            numero_documento_encuestador="1",
            telefono_encuestador="300",
            cargo_encuestador="Enc",
            empresa_entidad_encuestador="CENS",
            firma_encuestador="firma",
            habilitado=True,
            created_at=None,
            updated_at=None,
        ),
        SimpleNamespace(
            id=2,
            username_owner="encuestador",
            nombres_apellidos_encuestador="Luis",
            tipo_documento_encuestador="CC",
            numero_documento_encuestador="2",
            telefono_encuestador="301",
            cargo_encuestador="Enc",
            empresa_entidad_encuestador="CENS",
            firma_encuestador="firma",
            habilitado=True,
            created_at=None,
            updated_at=None,
        ),
    ]
    monkeypatch.setattr(
        "app.services.encuestador_profiles.list_profiles_for_user",
        AsyncMock(return_value=profiles),
    )
    monkeypatch.setattr(
        "app.services.encuestador_profiles.count_forms_grouped_by_profile_ids",
        AsyncMock(return_value={1: 3}),
    )

    items = await list_profile_reads(AsyncMock(), "encuestador")

    assert len(items) == 2
    assert items[0].formularios_asociados == 3
    assert items[1].formularios_asociados == 0


@pytest.mark.asyncio
async def test_create_profile_for_user_ok(monkeypatch):
    created = SimpleNamespace(
        id=1,
        username_owner="encuestador",
        nombres_apellidos_encuestador="Juan Perez",
        tipo_documento_encuestador="CÉDULA DE CIUDADANÍA",
        numero_documento_encuestador="1010",
        telefono_encuestador="3000000000",
        cargo_encuestador="Encuestador",
        empresa_entidad_encuestador="NoSignal",
        firma_encuestador="Juan Perez",
        habilitado=True,
        created_at=None,
        updated_at=None,
    )
    monkeypatch.setattr(
        "app.services.encuestador_profiles.create_profile",
        AsyncMock(return_value=created),
    )

    payload = EncuestadorProfileCreate(
        nombres_apellidos_encuestador="Juan Perez",
        tipo_documento_encuestador="CÉDULA DE CIUDADANÍA",
        numero_documento_encuestador="1010",
        telefono_encuestador="3000000000",
        cargo_encuestador="Encuestador",
        empresa_entidad_encuestador="NoSignal",
        firma_encuestador="Juan Perez",
        habilitado=True,
    )

    result = await create_profile_for_user(AsyncMock(), "encuestador", payload)

    assert result.id == 1
    assert result.username_owner == "encuestador"
    assert result.nombres_apellidos_encuestador == "Juan Perez"
