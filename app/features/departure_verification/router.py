from fastapi import APIRouter

from app.features.departure_verification.schemas import DepartureVerificationResponse
from app.features.departure_verification.service import DepartureVerificationService
from app.features.vessel_status.provider import MockAISProvider


router = APIRouter(prefix="/v1/vessels", tags=["vessel-intelligence"])
service = DepartureVerificationService(provider=MockAISProvider())


@router.get(
    "/{imo}/departure-verification",
    summary="Get departure verification intelligence",
    description=(
        "Assess whether a supplier departure claim appears verified, questionable, or "
        "inconsistent with the current vessel state."
    ),
    response_model=DepartureVerificationResponse,
    responses={
        200: {
            "description": "Departure verification intelligence response.",
            "content": {
                "application/json": {
                    "example": DepartureVerificationResponse.model_config["json_schema_extra"][
                        "example"
                    ]
                }
            },
        }
    },
)
def get_departure_verification(imo: str) -> DepartureVerificationResponse:
    return service.verify_departure(imo)
