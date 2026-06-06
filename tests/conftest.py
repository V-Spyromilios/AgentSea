from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


X402_ENV_KEYS = [
    "X402_ENABLED",
    "X402_AVM_ADDRESS",
    "X402_FACILITATOR_URL",
    "X402_NETWORK",
    "X402_ETA_RISK_PRICE_USD",
    "X402_SYNC_FACILITATOR_ON_START",
]


@pytest.fixture
def app_client_factory(monkeypatch: pytest.MonkeyPatch) -> Callable[..., TestClient]:
    def factory(**env_overrides: str | bool) -> TestClient:
        for key in X402_ENV_KEYS:
            monkeypatch.delenv(key, raising=False)

        for key, value in env_overrides.items():
            monkeypatch.setenv(key, str(value))

        return TestClient(create_app())

    return factory
