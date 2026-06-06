from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2


LOCAL_DEV_AVM_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
LOCAL_DEMO_RESOURCE_URL = (
    "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09"
)
LOCAL_DEMO_PORT_CONGESTION_RESOURCE_URL = (
    "http://127.0.0.1:8000/v1/ports/DEHAM/congestion"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    app_name: str = "MarineAgent"
    version: str = "0.1.0"
    project_description: str = (
        "Agent-first maritime intelligence API for structured operational decisions."
    )
    agent_first: bool = True
    x402_ready: bool = True
    algorand_ready: bool = True
    default_price_asset: str = "EURQ"
    default_price_network: str = "algorand-testnet"

    x402_enabled: bool = Field(default=False, alias="X402_ENABLED")
    x402_avm_address: str = Field(
        default=LOCAL_DEV_AVM_ADDRESS,
        alias="X402_AVM_ADDRESS",
    )
    x402_facilitator_url: str = Field(
        default="https://facilitator.goplausible.xyz",
        alias="X402_FACILITATOR_URL",
    )
    x402_network: str = Field(
        default=ALGORAND_TESTNET_CAIP2,
        alias="X402_NETWORK",
    )
    x402_eta_risk_price_usd: str = Field(
        default="0.02",
        alias="X402_ETA_RISK_PRICE_USD",
    )
    x402_port_congestion_price_usd: str = Field(
        default="0.02",
        alias="X402_PORT_CONGESTION_PRICE_USD",
    )
    x402_sync_facilitator_on_start: bool = Field(
        default=False,
        alias="X402_SYNC_FACILITATOR_ON_START",
    )

    avm_private_key: str | None = Field(default=None, alias="AVM_PRIVATE_KEY")
    resource_url: str = Field(
        default=LOCAL_DEMO_RESOURCE_URL,
        alias="RESOURCE_URL",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
