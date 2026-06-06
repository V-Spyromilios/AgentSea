from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class MessageExtractionEvidence(BaseModel):
    source: str
    summary: str


class SupplierClaimExtractionRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "imo_hint": "9321483",
                "route_hint": "Asia → Hamburg",
                "message": (
                    "Hi Hamburg Cargo team,\n\n"
                    "Hamburg Trader is still expected to arrive in Hamburg by 2026-06-09.\n"
                    "Please keep the warehouse slot ready.\n\n"
                    "IMO: 9321483\n"
                    "Route: Asia to Hamburg"
                ),
            }
        }
    )

    imo_hint: str
    route_hint: str
    message: str


class SupplierClaimExtractionResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vessel_imo": "9321483",
                "route_context": "Asia → Hamburg",
                "supplier_promised_eta": "2026-06-09",
                "claim_summary": "Supplier claims the vessel will arrive by 2026-06-09.",
                "confidence": 0.9,
                "evidence": [
                    {
                        "source": "exporter-message",
                        "summary": "Message states expected arrival by 2026-06-09.",
                    }
                ],
            }
        }
    )

    vessel_imo: str
    route_context: str
    supplier_promised_eta: str
    claim_summary: str
    confidence: float
    evidence: list[MessageExtractionEvidence]
