from app.core.errors import ResourceNotFoundError
from app.data.mock_ports import MOCK_PORTS
from app.features.commerce.payment_service import get_product_price
from app.shared.models import CongestionLevel
from app.shared.responses import EvidenceItem, PriceInfo, utc_now

from .schemas import PortCongestionResponse


class PortCongestionService:
    def get_congestion(self, port_code: str) -> PortCongestionResponse:
        port = MOCK_PORTS.get(port_code.upper())
        if port is None:
            raise ResourceNotFoundError(f"Port with code '{port_code}' was not found.")

        if port.berth_utilization >= 0.85 or port.average_delay_hours >= 24:
            level = CongestionLevel.HIGH
            confidence = 0.87
            assessment = "Congestion is high and likely to extend berth waiting times."
        elif port.berth_utilization >= 0.65 or port.average_delay_hours >= 10:
            level = CongestionLevel.MEDIUM
            confidence = 0.79
            assessment = "Congestion is moderate and should be monitored for schedule slippage."
        else:
            level = CongestionLevel.LOW
            confidence = 0.74
            assessment = "Congestion is low relative to current mock demand indicators."

        price = get_product_price("port-congestion")

        return PortCongestionResponse(
            product="port-congestion",
            generated_at=utc_now(),
            confidence=confidence,
            evidence=[
                EvidenceItem(
                    source="mock-port-ops",
                    statement=(
                        f"{port.waiting_vessels} vessel(s) waiting, {port.average_delay_hours} "
                        f"average delay hours, berth utilization {port.berth_utilization:.0%}."
                    ),
                )
            ],
            price=PriceInfo(**price.model_dump()),
            port_code=port.code,
            port_name=port.name,
            congestion_level=level,
            average_delay_hours=port.average_delay_hours,
            waiting_vessels=port.waiting_vessels,
            berth_utilization=port.berth_utilization,
            assessment=assessment,
        )
