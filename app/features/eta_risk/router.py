from datetime import date

from fastapi import APIRouter, Query

from app.features.eta_risk.schemas import ETARiskResponse
from app.features.eta_risk.service import ETARiskService
from app.features.vessel_status.provider import MockAISProvider


router = APIRouter(prefix="/v1/vessels", tags=["vessel-intelligence"])
service = ETARiskService(provider=MockAISProvider())


@router.get(
    "/{imo}/eta-risk",
    summary="Get ETA risk intelligence",
    description=(
        "Compare a supplier-promised ETA against the realistic ETA inferred from mock vessel "
        "state and return a low, medium, or high delay risk assessment."
    ),
    response_model=ETARiskResponse,
    responses={
        200: {
            "description": "ETA risk intelligence response.",
            "content": {
                "application/json": {
                    "example": ETARiskResponse.model_config["json_schema_extra"]["example"]
                }
            },
        }
    },
)
def get_eta_risk(
    imo: str,
    promised_eta: date = Query(
        ...,
        description="Supplier-promised ETA in YYYY-MM-DD format.",
        examples=["2026-06-09"],
    ),
) -> ETARiskResponse:
    return service.get_eta_risk(imo=imo, promised_eta=promised_eta)
