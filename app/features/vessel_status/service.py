from app.features.commerce.payment_service import get_product_price
from app.features.vessel_status.provider import AISProvider
from app.features.vessel_status.schemas import VesselStatusResponse
from app.shared.responses import EvidenceItem, PriceInfo, utc_now


class VesselStatusService:
    def __init__(self, provider: AISProvider) -> None:
        self.provider = provider

    def get_status(self, imo: str) -> VesselStatusResponse:
        vessel = self.provider.get_vessel(imo)
        price = get_product_price("vessel-status")
        return VesselStatusResponse(
            product="vessel-status",
            generated_at=utc_now(),
            confidence=0.95,
            evidence=[
                EvidenceItem(
                    source="mock-ais",
                    statement=(
                        f"AIS shows {vessel.vessel_name} {vessel.navigation_status.value} "
                        f"with destination {vessel.destination_port_name}."
                    ),
                )
            ],
            price=PriceInfo(**price.model_dump()),
            imo=vessel.imo,
            vessel_name=vessel.vessel_name,
            navigation_status=vessel.navigation_status,
            current_port_code=vessel.current_port_code,
            current_port_name=vessel.current_port_name,
            destination_port_code=vessel.destination_port_code,
            destination_port_name=vessel.destination_port_name,
            realistic_eta=vessel.realistic_eta,
            status_summary=vessel.status_summary,
            speed_knots=vessel.speed_knots,
            last_ais_timestamp=vessel.last_ais_timestamp,
        )
