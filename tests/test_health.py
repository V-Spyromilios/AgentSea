from fastapi.testclient import TestClient

def test_health(app_client_factory) -> None:
    client = app_client_factory()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
