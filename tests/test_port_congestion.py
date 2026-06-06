from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_port_congestion_returns_high_for_hamburg() -> None:
    response = client.get("/v1/ports/DEHAM/congestion")

    assert response.status_code == 200
    body = response.json()
    for field in ["product", "mock_data", "generated_at", "confidence", "evidence", "price"]:
        assert field in body

    assert body["product"] == "port-congestion"
    assert body["port_name"] == "Hamburg"
    assert body["congestion_level"] == "high"
    assert body["price"] == {
        "asset": "EURQ",
        "amount": "0.02",
        "network": "algorand-testnet",
    }
