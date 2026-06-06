from datetime import date

from pydantic import BaseModel, ConfigDict

from app.shared.models import VerificationStatus
from app.shared.responses import IntelligenceResponseBase


class SupplierDepartureClaim(BaseModel):
    claimed_departure_port_code: str | None
    claimed_departure_date: date | None


class DepartureVerificationResponse(IntelligenceResponseBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "departure-verification",
                "mock_data": True,
                "generated_at": "2026-06-06T10:00:00Z",
                "confidence": 0.9,
                "evidence": [
                    {
                        "source": "mock-ais",
                        "statement": "The vessel remains berthed in Rotterdam despite a departure claim.",
                    }
                ],
                "price": {
                    "asset": "EURQ",
                    "amount": "0.02",
                    "network": "algorand-testnet",
                },
                "imo": "9771940",
                "vessel_name": "MV Baltic Beacon",
                "result": "inconsistent",
                "supplier_claim": {
                    "claimed_departure_port_code": "NLRTM",
                    "claimed_departure_date": "2026-06-05",
                },
                "assessment": "Supplier departure claim conflicts with current vessel state.",
            }
        }
    )

    imo: str
    vessel_name: str
    result: VerificationStatus
    supplier_claim: SupplierDepartureClaim
    assessment: str
