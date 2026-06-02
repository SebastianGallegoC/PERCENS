from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.database import get_session
from app.main import app
from app.api.v1 import forms as forms_api
from app.schemas.form_stats import (
    FormStatsFiltersApplied,
    FormStatsMonthlyMunicipioSerie,
    FormStatsMonthlyResponse,
    FormStatsMunicipiosResponse,
    FormStatsResponse,
)


async def _fake_session():
    yield object()


async def _fake_user():
    return "tester"


def test_form_stats_requires_auth():
    client = TestClient(app)
    resp = client.get("/api/v1/forms/stats")
    assert resp.status_code == 401


def test_form_stats_municipios_requires_auth():
    client = TestClient(app)
    resp = client.get("/api/v1/forms/stats/municipios")
    assert resp.status_code == 401


def test_form_stats_municipios_ok(monkeypatch):
    monkeypatch.setattr(
        forms_api,
        "get_distinct_municipios",
        AsyncMock(
            return_value=FormStatsMunicipiosResponse(
                municipios=["Bogotá, D.C.", "Cúcuta"],
            ),
        ),
    )

    app.dependency_overrides[get_session] = _fake_session
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        client = TestClient(app)
        resp = client.get(
            "/api/v1/forms/stats/municipios",
            headers={"Authorization": "Bearer dummy"},
        )
        assert resp.status_code == 200
        assert resp.json()["municipios"] == ["Bogotá, D.C.", "Cúcuta"]
    finally:
        app.dependency_overrides.clear()


def test_form_stats_invalid_date_range():
    app.dependency_overrides[get_session] = _fake_session
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        client = TestClient(app)
        resp = client.get(
            "/api/v1/forms/stats",
            params={"fecha_desde": "2026-06-01", "fecha_hasta": "2026-01-01"},
        )
        assert resp.status_code == 422
        assert resp.json()["detail"] == "fecha_desde_must_be_lte_fecha_hasta"
    finally:
        app.dependency_overrides.clear()


def test_form_stats_monthly_requires_municipios():
    app.dependency_overrides[get_session] = _fake_session
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        client = TestClient(app)
        resp = client.get(
            "/api/v1/forms/stats/diligencias-mensuales",
            params={"anio": 2026},
            headers={"Authorization": "Bearer dummy"},
        )
        assert resp.status_code == 422
        assert resp.json()["detail"] == "municipios_required"
    finally:
        app.dependency_overrides.clear()


def test_form_stats_monthly_ok(monkeypatch):
    monkeypatch.setattr(
        forms_api,
        "get_monthly_diligencias",
        AsyncMock(
            return_value=FormStatsMonthlyResponse(
                anio=2026,
                municipios=["Cucuta"],
                etiquetas_mes=["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
                series=[
                    FormStatsMonthlyMunicipioSerie(
                        municipio="Cucuta",
                        totales=[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ),
                ],
                total=1,
            ),
        ),
    )

    app.dependency_overrides[get_session] = _fake_session
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        client = TestClient(app)
        resp = client.get(
            "/api/v1/forms/stats/diligencias-mensuales",
            params={"anio": 2026, "municipios": ["Cucuta"]},
            headers={"Authorization": "Bearer dummy"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["anio"] == 2026
        assert body["total"] == 1
        assert body["series"][0]["totales"][0] == 1
    finally:
        app.dependency_overrides.clear()


def test_form_stats_ok(monkeypatch):
    async def _fake_get_validation_stats(_session, **kwargs):
        assert kwargs["municipio"] == "Cucuta"
        assert kwargs["fecha_desde"] == date(2026, 1, 1)
        assert kwargs["fecha_hasta"] == date(2026, 6, 30)
        return FormStatsResponse(
            total=10,
            cumple=6,
            no_cumple=3,
            sin_resultado=1,
            filtros_aplicados=FormStatsFiltersApplied(
                municipio="Cucuta",
                fecha_desde=date(2026, 1, 1),
                fecha_hasta=date(2026, 6, 30),
            ),
        )

    monkeypatch.setattr(
        forms_api,
        "get_validation_stats",
        AsyncMock(side_effect=_fake_get_validation_stats),
    )

    app.dependency_overrides[get_session] = _fake_session
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        client = TestClient(app)
        resp = client.get(
            "/api/v1/forms/stats",
            params={
                "municipio": "Cucuta",
                "fecha_desde": "2026-01-01",
                "fecha_hasta": "2026-06-30",
            },
            headers={"Authorization": "Bearer dummy"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 10
        assert body["cumple"] == 6
        assert body["no_cumple"] == 3
        assert body["sin_resultado"] == 1
        assert body["filtros_aplicados"]["municipio"] == "Cucuta"
    finally:
        app.dependency_overrides.clear()
