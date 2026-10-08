def test_create_and_update_product(client):
    res = client.post("/api/products", json={"name": " Camiseta ", "price": 35000})
    assert res.status_code == 201
    product = res.json()
    assert product["name"] == "Camiseta"
    assert product["price"] == 35000
    assert product["active"] is True
    assert product["stock"] is None

    res = client.put(
        f"/api/products/{product['id']}",
        json={"name": "Camiseta", "price": 38000, "active": False, "description": "Algodón"},
    )
    assert res.status_code == 200
    assert res.json()["active"] is False

    active = client.get("/api/products", params={"active": True}).json()
    assert active == []


def test_product_validation(client):
    res = client.post("/api/products", json={"name": "", "price": -1})
    assert res.status_code == 422
    fields = {e["field"]: e["message"] for e in res.json()["errors"]}
    assert fields["name"] == "Este campo es obligatorio"
    assert fields["price"] == "Debe ser mayor o igual a 0"


def test_update_missing_product(client):
    res = client.put("/api/products/999", json={"name": "X", "price": 1})
    assert res.status_code == 404


def test_customer_crud_and_phone_normalization(client):
    res = client.post(
        "/api/customers",
        json={"name": "María López", "phone": "(300) 555-1234", "address": "Cra 7"},
    )
    assert res.status_code == 201
    customer = res.json()
    assert customer["phone"] == "3005551234"

    dup = client.post(
        "/api/customers", json={"name": "Otra", "phone": "300 555 1234", "address": "X"}
    )
    assert dup.status_code == 409

    res = client.put(
        f"/api/customers/{customer['id']}",
        json={"name": "María López", "phone": "3005551234", "address": "Cra 8", "city": "Cali"},
    )
    assert res.json()["city"] == "Cali"

    found = client.get("/api/customers", params={"search": "555"}).json()
    assert [c["id"] for c in found] == [customer["id"]]


def test_customer_required_fields(client):
    res = client.post("/api/customers", json={"name": "", "phone": "12", "address": ""})
    assert res.status_code == 422
    fields = {e["field"] for e in res.json()["errors"]}
    assert fields == {"name", "phone", "address"}
