"""
Future x402 integration notes for MarineAgent.

This module documents the broader x402 rollout that still remains after the current
ETA-risk-only enforcement boundary. The active middleware integration for ETA risk lives in
`x402_eta_risk_middleware.py`.

This file still exists to document the interfaces and operational decisions we expect to add in
future milestones:

- Algorand-based x402 payment verification
- Facilitator integration for payment orchestration
- TestNet support for development and demos
- MainNet support for production rollout
- Quantoz EURQ and EURD stablecoins as payment assets

The business intelligence services must stay callable without payment verification so we can
keep domain logic isolated from commerce concerns. The current ETA-risk payment gate follows
that rule by validating payment in HTTP middleware before the business service executes.
"""

from pydantic import BaseModel, ConfigDict


class X402NetworkPlan(BaseModel):
    model_config = ConfigDict(frozen=True)

    network: str
    facilitator_required: bool
    supported_assets: list[str]


class FutureX402Flow(BaseModel):
    model_config = ConfigDict(frozen=True)

    protocol: str = "x402"
    verification_implemented: bool = False
    notes: list[str]


ALGORAND_TESTNET_PLAN = X402NetworkPlan(
    network="algorand-testnet",
    facilitator_required=True,
    supported_assets=["EURQ", "EURD"],
)

ALGORAND_MAINNET_PLAN = X402NetworkPlan(
    network="algorand-mainnet",
    facilitator_required=True,
    supported_assets=["EURQ", "EURD"],
)

FUTURE_X402_FLOW = FutureX402Flow(
    notes=[
        "Adopt the official Algorand x402 starter template.",
        "Validate facilitator-issued payment attestations before route execution.",
        "Keep payment verification outside business services.",
    ]
)
