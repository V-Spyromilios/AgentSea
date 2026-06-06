from datetime import date

from app.features.commerce.payment_service import get_product_price
from app.features.vessel_status.provider import AISProvider
from app.shared.models import RiskLevel
from app.shared.responses import EvidenceItem, PriceInfo, utc_now

from .schemas import ETARiskResponse


class ETARiskService:
    def __init__(self, provider: AISProvider) -> None:
        self.provider = provider

    def get_eta_risk(self, imo: str, promised_eta: date) -> ETARiskResponse:
        vessel = self.provider.get_vessel(imo)
        delay_days = (vessel.realistic_eta - promised_eta).days

        if delay_days <= 0:
            risk_level = RiskLevel.LOW
            confidence = 0.76
            assessment = "Supplier ETA is aligned with the realistic arrival window."
        elif delay_days <= 2:
            risk_level = RiskLevel.MEDIUM
            confidence = 0.81
            assessment = "Supplier ETA is mildly optimistic and carries moderate delay risk."
        else:
            risk_level = RiskLevel.HIGH
            confidence = 0.84
            assessment = (
                "Supplier ETA appears unrealistic relative to the vessel's current progress."
            )

        price = get_product_price("eta-risk")

        return ETARiskResponse(
            product="eta-risk",
            generated_at=utc_now(),
            confidence=confidence,
            evidence=[
                EvidenceItem(
                    source="mock-ais",
                    statement=(
                        f"Promised ETA differs from the realistic ETA by {delay_days} day(s)."
                    ),
                ),
                EvidenceItem(
                    source="mock-operations-model",
                    statement=vessel.status_summary,
                ),
            ],
            price=PriceInfo(**price.model_dump()),
            imo=imo,
            promised_eta=promised_eta,
            realistic_eta=vessel.realistic_eta,
            risk_level=risk_level,
            assessment=assessment,
        )
