from fastapi import APIRouter

from app.features.health.schemas import HealthResponse


router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Get service health",
    description="Return a minimal liveness signal for local development and automated checks.",
    response_model=HealthResponse,
    responses={
        200: {
            "description": "Healthy service response.",
            "content": {"application/json": {"example": {"status": "ok"}}},
        }
    },
)
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")
