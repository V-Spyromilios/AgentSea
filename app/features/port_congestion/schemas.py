from pydantic import ConfigDict

from app.shared.models import CongestionLevel
from app.shared.responses import IntelligenceResponseBase


class PortCongestionResponse(IntelligenceResponseBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "product": "port-congestion",
                "mock_data": True,
                "generated_at": "2026-06-06T10:00:00Z",
                "confidence": 0.87,
                "evidence": [
                    {
                        "source": "mock-port-ops",
                        "statement": "Hamburg shows elevated berth utilization and queue depth.",
                    }
                ],
                "price": {
                    "asset": "EURQ",
                    "amount": "0.02",
                    "network": "algorand-testnet",
                },
                "port_code": "DEHAM",
                "port_name": "Hamburg",
                "congestion_level": "high",
                "average_delay_hours": 28.0,
                "waiting_vessels": 14,
                "berth_utilization": 0.91,
                "assessment": "Congestion is high and likely to extend berth waiting times.",
            }
        }
    )

    port_code: str
    port_name: str
    congestion_level: CongestionLevel
    average_delay_hours: float
    waiting_vessels: int
    berth_utilization: float
    assessment: str
