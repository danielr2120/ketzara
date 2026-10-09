import pytest

from app.core.config import get_settings
from tests.conftest import ADMIN_PASSWORD, ADMIN_USERNAME, order_payload

ADMIN_ENDPOINTS = [
    ("get", "/api/orders"),
    ("get", "/api/orders/export"),
    ("get", "/api/orders/1"),
    ("post", "/api/orders"),
    ("get", "/api/products"),
    ("post", "/api/products"),
    ("get", "/api/customers"),
    ("get", "/api/dashboard/summary"),
]


@pytest.mark.parametrize(("method", "path"), ADMIN_ENDPOINTS)
def test_admin_endpoints_require_login(anon, method, path):
    res = getattr(anon, method)(path, **({"json": {}} if method == "post" else {}))
    assert res.status_code == 401
    bad_token = getattr(anon, method)(path, headers={"Authorization": "Bearer inventado"})
    assert bad_token.status_code == 401


def test_customer_pages_stay_public(anon, client, product):
    assert anon.get("/api/health").status_code == 200
    assert anon.get("/api/meta").status_code == 200
    assert anon.get("/api/public/products").status_code == 200
    payload = order_payload(product["id"])
    del payload["shipping_cost"]
    created = anon.post("/api/public/orders", json=payload)
    assert created.status_code == 201, created.text
    assert anon.get(f"/api/public/orders/{created.json()['tracking_code']}").status_code == 200


def test_login(anon):
    wrong = anon.post("/api/auth/login", json={"username": ADMIN_USERNAME, "password": "otra"})
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "Usuario o contraseña incorrectos"
    wrong_user = anon.post("/api/auth/login", json={"username": "otro", "password": ADMIN_PASSWORD})
    assert wrong_user.status_code == 401
    # La contraseña conserva los espacios: " clave" no es "clave".
    padded = anon.post("/api/auth/login", json={"username": ADMIN_USERNAME, "password": f" {ADMIN_PASSWORD} "})
    assert padded.status_code == 401

    res = anon.post("/api/auth/login", json={"username": f" {ADMIN_USERNAME} ", "password": ADMIN_PASSWORD})
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == ADMIN_USERNAME
    assert data["expires_at"]
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    assert anon.get("/api/orders", headers=headers).status_code == 200


def test_changing_password_invalidates_sessions(client, monkeypatch):
    assert client.get("/api/orders").status_code == 200
    monkeypatch.setattr(get_settings(), "admin_password", "nueva clave")
    assert client.get("/api/orders").status_code == 401


def test_login_disabled_without_configuration(anon, monkeypatch):
    monkeypatch.setattr(get_settings(), "admin_password", None)
    res = anon.post("/api/auth/login", json={"username": ADMIN_USERNAME, "password": "x"})
    assert res.status_code == 503


def test_login_throttled_after_repeated_failures(anon):
    for _ in range(10):
        assert anon.post("/api/auth/login", json={"username": ADMIN_USERNAME, "password": "mal"}).status_code == 401
    blocked = anon.post("/api/auth/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    assert blocked.status_code == 429
