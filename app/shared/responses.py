from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class EvidenceItem(BaseModel):
    source: str
    statement: str


class PriceInfo(BaseModel):
    asset: str
    amount: str
    network: str


class IntelligenceResponseBase(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "eta-risk",
                "mock_data": True,
                "generated_at": "2026-06-06T10:00:00Z",
                "confidence": 0.82,
                "evidence": [
                    {
                        "source": "mock-ais",
                        "statement": "Promised arrival is earlier than the realistic arrival window.",
                    }
                ],
                "price": {
                    "asset": "EURQ",
                    "amount": "0.02",
                    "network": "algorand-testnet",
                },
            }
        }
    )

    product: str
    mock_data: bool = True
    generated_at: datetime
    confidence: float = Field(ge=0, le=1)
    evidence: list[EvidenceItem]
    price: PriceInfo


class APIMetadataResponse(BaseModel):
    project_name: str
    description: str
    agent_first: bool
    x402_ready: bool
    algorand_ready: bool


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
