from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class ProductPrice(BaseModel):
    asset: str
    amount: str
    network: str


class FuturePaymentRequirement(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "eta-risk",
                "payment_required": False,
                "future_protocol": "x402",
                "network": "algorand-testnet",
            }
        }
    )

    product: str
    payment_required: bool = False
    future_protocol: str = "x402"
    network: str


class DemoPaymentRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "resource_url": "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09",
                "payer_address": "OBTH43WN4M3HRNKVX5PCUW3B3MQA7WW7ISQT5VU6W6CIMNU4PX7I5H4IJA",
                "mode": "manual_confirm",
            }
        }
    )

    resource_url: AnyHttpUrl
    payer_address: str | None = None
    mode: Literal["manual_confirm", "whitelist_auto_pay"] = "manual_confirm"


class DemoPaymentEvidence(BaseModel):
    network: str
    asset_id: str
    amount: str
    asset_label: str
    transaction_id: str | None = None
    group_id: str | None = None
    lora_url: str | None = None
    raw_payment_response_header: str | None = None
    note: str | None = None


class DemoPaymentDebugEvidence(BaseModel):
    retry_status_code: int | None = None
    retry_body: str | None = None
    retry_payment_required_header_present: bool = False
    retry_payment_required_header_preview: str | None = None
    decoded_retry_payment_required: dict[str, Any] | None = None
    payment_response_header_present: bool = False
    payment_response_header_preview: str | None = None


class DemoPaymentResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "paid": True,
                "status_code": 200,
                "payer_address": "OBTH43WN4M3HRNKVX5PCUW3B3MQA7WW7ISQT5VU6W6CIMNU4PX7I5H4IJA",
                "resource_url": "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09",
                "mode": "manual_confirm",
                "intelligence": {
                    "product": "eta-risk",
                    "risk_level": "high",
                    "realistic_eta": "2026-06-12",
                },
                "payment_evidence": {
                    "network": "Algorand TestNet",
                    "asset_id": "10458941",
                    "amount": "0.02",
                    "asset_label": "TestNet USDC",
                    "transaction_id": "MOCKTXID123",
                    "group_id": None,
                    "lora_url": "https://lora.algokit.io/testnet/transaction/MOCKTXID123",
                    "raw_payment_response_header": "eyJzdWNjZXNzIjp0cnVlfQ==",
                    "note": None,
                },
            }
        }
    )

    paid: bool
    status_code: int
    payer_address: str | None = None
    resource_url: str
    mode: Literal["manual_confirm", "whitelist_auto_pay"]
    intelligence: dict[str, Any] | None = None
    error: str | None = None
    payment_evidence: DemoPaymentEvidence
    debug_evidence: DemoPaymentDebugEvidence | None = None


DemoPayEtaRiskRequest = DemoPaymentRequest
DemoPayEtaRiskResponse = DemoPaymentResponse
