import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "clave de prueba"
os.environ.update(ADMIN_USERNAME=ADMIN_USERNAME, ADMIN_PASSWORD=ADMIN_PASSWORD, AUTH_SECRET="secreto-de-pruebas")

from app.core.config import get_settings  # noqa: E402
from app.core.security import login_throttle  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402

settings = get_settings()
if not settings.test_database_url:
    pytest.exit("Define TEST_DATABASE_URL en backend/.env para ejecutar las pruebas", returncode=1)

engine = create_engine(settings.test_database_url)
TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    login_throttle.reset()
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE"))
        conn.execute(text("ALTER SEQUENCE order_number_seq RESTART WITH 1"))


def _get_test_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def test_db():
    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def anon():
    """Cliente sin sesión, como un visitante de las páginas públicas."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def client():
    """Cliente con la sesión del administrador iniciada."""
    with TestClient(app) as c:
        res = c.post("/api/auth/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
        assert res.status_code == 200, res.text
        c.headers["Authorization"] = f"Bearer {res.json()['access_token']}"
        yield c


@pytest.fixture
def product(client):
    res = client.post("/api/products", json={"name": "Producto A", "price": 25000, "stock": 10})
    assert res.status_code == 201, res.text
    return res.json()


def order_payload(product_id: int | None = None, **overrides) -> dict:
    payload = {
        "customer": {
            "name": "Juan Pérez",
            "phone": "300 123 4567",
            "address": "Calle 1 # 2-3",
            "city": "Bogotá",
        },
        "items": [{"product_id": product_id, "quantity": 2}],
        "payment_method": "cash",
        "shipping_cost": 0,
    }
    payload.update(overrides)
    return payload
