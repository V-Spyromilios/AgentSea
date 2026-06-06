from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

from app.core.config import LOCAL_DEV_AVM_ADDRESS, get_settings
from app.features.commerce.schemas import ProductPrice


class X402Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    enabled: bool = False
    avm_address: str = LOCAL_DEV_AVM_ADDRESS
    facilitator_url: str = "https://facilitator.goplausible.xyz"
    network: str = ALGORAND_TESTNET_CAIP2
    eta_risk_price_usd: str = "0.02"
    port_congestion_price_usd: str = "0.02"
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

    @property
    def port_congestion_route_pattern(self) -> str:
        return "GET /v1/ports/[port_code]/congestion"

    @property
    def port_congestion_price(self) -> ProductPrice:
        return ProductPrice(
            asset="USDC",
            amount=self.port_congestion_price_usd,
            network=self.network,
        )

    @property
    def port_congestion_price_expression(self) -> str:
        return f"${self.port_congestion_price_usd}"


def get_x402_settings() -> X402Settings:
    settings = get_settings()
    return X402Settings(
        enabled=settings.x402_enabled,
        avm_address=settings.x402_avm_address,
        facilitator_url=settings.x402_facilitator_url,
        network=settings.x402_network,
        eta_risk_price_usd=settings.x402_eta_risk_price_usd,
        port_congestion_price_usd=settings.x402_port_congestion_price_usd,
        sync_facilitator_on_start=settings.x402_sync_facilitator_on_start,
    )
