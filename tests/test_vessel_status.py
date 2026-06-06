from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_vessel_status_returns_mock_intelligence() -> None:
    response = client.get("/v1/vessels/9321483/status")

    assert response.status_code == 200
    body = response.json()
    for field in ["product", "mock_data", "generated_at", "confidence", "evidence", "price"]:
        assert field in body

    assert body["product"] == "vessel-status"
    assert body["mock_data"] is True
    assert body["imo"] == "9321483"
    assert body["vessel_name"] == "MV Elbe Trader"
    assert body["navigation_status"] == "underway"
    assert body["price"] == {
        "asset": "EURQ",
        "amount": "0.01",
        "network": "algorand-testnet",
    }
