from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_departure_verification_flags_inconsistent_claim() -> None:
    response = client.get("/v1/vessels/9771940/departure-verification")

    assert response.status_code == 200
    body = response.json()
    for field in ["product", "mock_data", "generated_at", "confidence", "evidence", "price"]:
        assert field in body

    assert body["product"] == "departure-verification"
    assert body["result"] == "inconsistent"
    assert body["supplier_claim"]["claimed_departure_port_code"] == "NLRTM"
    assert body["price"] == {
        "asset": "EURQ",
        "amount": "0.02",
        "network": "algorand-testnet",
    }
