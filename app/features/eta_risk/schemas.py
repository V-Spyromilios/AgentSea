from datetime import date

from pydantic import ConfigDict

from app.shared.models import RiskLevel
from app.shared.responses import IntelligenceResponseBase


class ETARiskResponse(IntelligenceResponseBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "eta-risk",
                "mock_data": True,
                "generated_at": "2026-06-06T10:00:00Z",
                "confidence": 0.84,
                "evidence": [
                    {
                        "source": "mock-ais",
                        "statement": "Promised arrival precedes the realistic arrival estimate by three days.",
                    }
                ],
                "price": {
                    "asset": "EURQ",
                    "amount": "0.02",
                    "network": "algorand-testnet",
                },
                "imo": "9321483",
                "promised_eta": "2026-06-09",
                "realistic_eta": "2026-06-12",
                "risk_level": "high",
                "assessment": "Supplier ETA appears unrealistic relative to the vessel's current progress.",
            }
        }
    )

    imo: str
    promised_eta: date
    realistic_eta: date
    risk_level: RiskLevel
    assessment: str
