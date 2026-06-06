from __future__ import annotations

import re
from datetime import datetime

from app.features.message_extraction.schemas import (
    MessageExtractionEvidence,
    SupplierClaimExtractionRequest,
    SupplierClaimExtractionResponse,
)


ISO_DATE_PATTERN = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")
IMO_PATTERN = re.compile(r"\bIMO[:\s]*([0-9]{7})\b", re.IGNORECASE)
ROUTE_PATTERN = re.compile(r"\bRoute[:\s]*(.+)", re.IGNORECASE)
LONG_DATE_PATTERNS = [
    re.compile(
        r"\b("
        r"January|February|March|April|May|June|July|August|September|October|November|December"
        r")\s+([0-9]{1,2}),\s*(20\d{2})\b",
        re.IGNORECASE,
    ),
]


class SupplierClaimExtractionError(ValueError):
    """Raised when a supplier claim cannot be extracted deterministically."""


class SupplierClaimExtractor:
    def extract(
        self, request: SupplierClaimExtractionRequest
    ) -> SupplierClaimExtractionResponse:
        message = request.message.strip()
        vessel_imo = self._extract_imo(message) or request.imo_hint.strip()
        route_context = self._extract_route(message) or request.route_hint.strip()
        promised_eta = self._extract_date(message)

        if not promised_eta:
            raise SupplierClaimExtractionError(
                "Could not extract a supplier-promised ETA from the message."
            )

        return SupplierClaimExtractionResponse(
            vessel_imo=vessel_imo,
            route_context=route_context,
            supplier_promised_eta=promised_eta,
            claim_summary=f"Supplier claims the vessel will arrive by {promised_eta}.",
            confidence=0.9 if vessel_imo and route_context else 0.82,
            evidence=[
                MessageExtractionEvidence(
                    source="exporter-message",
                    summary=f"Message states expected arrival by {promised_eta}.",
                )
            ],
        )

    @staticmethod
    def _extract_imo(message: str) -> str | None:
        match = IMO_PATTERN.search(message)
        if match:
            return match.group(1)
        fallback = re.search(r"\b([0-9]{7})\b", message)
        return fallback.group(1) if fallback else None

    @staticmethod
    def _extract_route(message: str) -> str | None:
        match = ROUTE_PATTERN.search(message)
        if match:
            route = match.group(1).strip()
            return route.replace(" to ", " → ")

        lowered = message.lower()
        if "asia" in lowered and "hamburg" in lowered:
            return "Asia → Hamburg"
        return None

    @staticmethod
    def _extract_date(message: str) -> str | None:
        iso_match = ISO_DATE_PATTERN.search(message)
        if iso_match:
            return iso_match.group(1)

        for pattern in LONG_DATE_PATTERNS:
            match = pattern.search(message)
            if not match:
                continue
            month_name, day, year = match.groups()
            parsed = datetime.strptime(
                f"{month_name.title()} {int(day)}, {year}", "%B %d, %Y"
            )
            return parsed.date().isoformat()

        return None


_EXTRACTOR = SupplierClaimExtractor()


def get_supplier_claim_extractor() -> SupplierClaimExtractor:
    return _EXTRACTOR
