from datetime import datetime, date

from pydantic import ConfigDict

from app.shared.models import NavigationStatus
from app.shared.responses import IntelligenceResponseBase


class VesselStatusResponse(IntelligenceResponseBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "vessel-status",
                "mock_data": True,
                "generated_at": "2026-06-06T10:00:00Z",
                "confidence": 0.95,
                "evidence": [
                    {
                        "source": "mock-ais",
                        "statement": "AIS shows the vessel underway from Singapore toward Hamburg.",
                    }
                ],
                "price": {
                    "asset": "EURQ",
                    "amount": "0.01",
                    "network": "algorand-testnet",
                },
                "imo": "9321483",
                "vessel_name": "MV Elbe Trader",
                "navigation_status": "underway",
                "current_port_code": "SGSIN",
                "current_port_name": "Singapore",
                "destination_port_code": "DEHAM",
                "destination_port_name": "Hamburg",
                "realistic_eta": "2026-06-12",
                "status_summary": "Underway on schedule through the Suez corridor with steady speed.",
                "speed_knots": 16.8,
                "last_ais_timestamp": "2026-06-06T09:45:00Z",
            }
        }
    )

    imo: str
    vessel_name: str
    navigation_status: NavigationStatus
    current_port_code: str
    current_port_name: str
    destination_port_code: str
    destination_port_name: str
    realistic_eta: date
    status_summary: str
    speed_knots: float
    last_ais_timestamp: datetime
