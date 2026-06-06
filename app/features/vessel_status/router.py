from fastapi import APIRouter

from app.features.vessel_status.provider import MockAISProvider
from app.features.vessel_status.schemas import VesselStatusResponse
from app.features.vessel_status.service import VesselStatusService


router = APIRouter(prefix="/v1/vessels", tags=["vessel-intelligence"])
service = VesselStatusService(provider=MockAISProvider())


@router.get(
    "/{imo}/status",
    summary="Get vessel status intelligence",
    description=(
        "Return structured vessel status intelligence derived from mock AIS data. "
        "This endpoint sells an operational summary, not raw coordinates."
    ),
    response_model=VesselStatusResponse,
    responses={
        200: {
            "description": "Structured vessel status intelligence.",
            "content": {
                "application/json": {
                    "example": VesselStatusResponse.model_config["json_schema_extra"]["example"]
                }
            },
        }
    },
)
def get_vessel_status(imo: str) -> VesselStatusResponse:
    return service.get_status(imo)
