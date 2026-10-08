import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app

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
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE"))
        conn.execute(text("ALTER SEQUENCE order_number_seq RESTART WITH 1"))


def _get_test_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = _get_test_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
