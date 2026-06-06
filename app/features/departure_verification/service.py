from app.features.commerce.payment_service import get_product_price
from app.features.vessel_status.provider import AISProvider
from app.shared.models import NavigationStatus, VerificationStatus
from app.shared.responses import EvidenceItem, PriceInfo, utc_now

from .schemas import DepartureVerificationResponse, SupplierDepartureClaim


class DepartureVerificationService:
    def __init__(self, provider: AISProvider) -> None:
        self.provider = provider

    def verify_departure(self, imo: str) -> DepartureVerificationResponse:
        vessel = self.provider.get_vessel(imo)

        if (
            vessel.supplier_claim_departure_port_code == vessel.current_port_code
            and vessel.navigation_status == NavigationStatus.BERTHED
        ):
            result = VerificationStatus.INCONSISTENT
            confidence = 0.9
            assessment = "Supplier departure claim conflicts with current vessel state."
        elif vessel.departure_signal_strength < 0.7:
            result = VerificationStatus.QUESTIONABLE
            confidence = 0.77
            assessment = "Departure claim is plausible but supported by weak operational signals."
        else:
            result = VerificationStatus.VERIFIED
            confidence = 0.92
            assessment = "Departure claim is consistent with vessel movement and AIS timing."

        price = get_product_price("departure-verification")

        return DepartureVerificationResponse(
            product="departure-verification",
            generated_at=utc_now(),
            confidence=confidence,
            evidence=[
                EvidenceItem(
                    source="mock-ais",
                    statement=vessel.status_summary,
                ),
                EvidenceItem(
                    source="mock-supplier-claim",
                    statement=(
                        f"Supplier claims departure from "
                        f"{vessel.supplier_claim_departure_port_code} on "
                        f"{vessel.supplier_claim_departed_at}."
                    ),
                ),
            ],
            price=PriceInfo(**price.model_dump()),
            imo=vessel.imo,
            vessel_name=vessel.vessel_name,
            result=result,
            supplier_claim=SupplierDepartureClaim(
                claimed_departure_port_code=vessel.supplier_claim_departure_port_code,
                claimed_departure_date=vessel.supplier_claim_departed_at,
            ),
            assessment=assessment,
        )
