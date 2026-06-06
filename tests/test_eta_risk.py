from fastapi.testclient import TestClient

def test_eta_risk_returns_high_for_unrealistic_promise(app_client_factory) -> None:
    client = app_client_factory()
    response = client.get("/v1/vessels/9321483/eta-risk", params={"promised_eta": "2026-06-09"})

    assert response.status_code == 200
    body = response.json()
    for field in ["product", "mock_data", "generated_at", "confidence", "evidence", "price"]:
        assert field in body

    assert body["product"] == "eta-risk"
    assert body["risk_level"] == "high"
    assert body["realistic_eta"] == "2026-06-12"
    assert body["price"] == {
        "asset": "EURQ",
        "amount": "0.02",
        "network": "algorand-testnet",
    }
