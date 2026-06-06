from __future__ import annotations

import os

from pydantic import BaseModel, ConfigDict
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

from app.features.commerce.schemas import ProductPrice


LOCAL_DEV_AVM_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"


def _parse_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class X402Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    enabled: bool = False
    avm_address: str = LOCAL_DEV_AVM_ADDRESS
    facilitator_url: str = "https://facilitator.goplausible.xyz"
    network: str = ALGORAND_TESTNET_CAIP2
    eta_risk_price_usd: str = "0.02"
    sync_facilitator_on_start: bool = False

    @property
    def eta_risk_route_pattern(self) -> str:
        return "GET /v1/vessels/[imo]/eta-risk"

    @property
    def eta_risk_price(self) -> ProductPrice:
        return ProductPrice(
            asset="USDC",
            amount=self.eta_risk_price_usd,
            network=self.network,
        )

    @property
    def eta_risk_price_expression(self) -> str:
        return f"${self.eta_risk_price_usd}"


def get_x402_settings() -> X402Settings:
    return X402Settings(
        enabled=_parse_bool(os.getenv("X402_ENABLED"), default=False),
        avm_address=os.getenv("X402_AVM_ADDRESS", LOCAL_DEV_AVM_ADDRESS),
        facilitator_url=os.getenv(
            "X402_FACILITATOR_URL",
            "https://facilitator.goplausible.xyz",
        ),
        network=os.getenv("X402_NETWORK", ALGORAND_TESTNET_CAIP2),
        eta_risk_price_usd=os.getenv("X402_ETA_RISK_PRICE_USD", "0.02"),
        sync_facilitator_on_start=_parse_bool(
            os.getenv("X402_SYNC_FACILITATOR_ON_START"),
            default=False,
        ),
    )
