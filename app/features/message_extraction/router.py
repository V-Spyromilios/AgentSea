from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.features.message_extraction.schemas import (
    SupplierClaimExtractionRequest,
    SupplierClaimExtractionResponse,
)
from app.features.message_extraction.service import (
    SupplierClaimExtractionError,
    get_supplier_claim_extractor,
)


router = APIRouter(prefix="/v1/message-extraction", tags=["message-extraction"])


@router.post(
    "/supplier-claim",
    summary="Extract a structured supplier claim from a message",
    description=(
        "Deterministically extract operational shipment claim fields from a supplier "
        "message so the frontend can populate the structured supplier claim and "
        "continue to paid ETA risk intelligence."
    ),
    response_model=SupplierClaimExtractionResponse,
)
def extract_supplier_claim(
    request: SupplierClaimExtractionRequest,
) -> SupplierClaimExtractionResponse:
    extractor = get_supplier_claim_extractor()
    try:
        return extractor.extract(request)
    except SupplierClaimExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
