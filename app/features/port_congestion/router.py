from fastapi import APIRouter

from app.features.port_congestion.schemas import PortCongestionResponse
from app.features.port_congestion.service import PortCongestionService


router = APIRouter(prefix="/v1/ports", tags=["port-intelligence"])
service = PortCongestionService()


@router.get(
    "/{port_code}/congestion",
    summary="Get port congestion intelligence",
    description=(
        "Return a structured congestion assessment for a port using mock queue depth, "
        "delay, and berth utilization metrics."
    ),
    response_model=PortCongestionResponse,
    responses={
        200: {
            "description": "Port congestion intelligence response.",
            "content": {
                "application/json": {
                    "example": PortCongestionResponse.model_config["json_schema_extra"]["example"]
                }
            },
        }
    },
)
def get_port_congestion(port_code: str) -> PortCongestionResponse:
    return service.get_congestion(port_code)
