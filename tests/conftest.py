from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


X402_ENV_KEYS = [
    "X402_ENABLED",
    "X402_AVM_ADDRESS",
    "X402_FACILITATOR_URL",
    "X402_NETWORK",
    "X402_ETA_RISK_PRICE_USD",
    "X402_SYNC_FACILITATOR_ON_START",
    "AVM_PRIVATE_KEY",
    "RESOURCE_URL",
]


@pytest.fixture
def app_client_factory(monkeypatch: pytest.MonkeyPatch) -> Callable[..., TestClient]:
    def factory(**env_overrides: str | bool) -> TestClient:
        for key in X402_ENV_KEYS:
            monkeypatch.delenv(key, raising=False)

        monkeypatch.setenv("X402_ENABLED", "false")

        for key, value in env_overrides.items():
            monkeypatch.setenv(key, str(value))

        get_settings.cache_clear()
        return TestClient(create_app())

    return factory
