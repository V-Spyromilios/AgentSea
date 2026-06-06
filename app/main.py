from fastapi import FastAPI

from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.features.commerce.x402_eta_risk_middleware import attach_eta_risk_x402_middleware
from app.features.departure_verification.router import router as departure_verification_router
from app.features.eta_risk.router import router as eta_risk_router
from app.features.health.router import router as health_router
from app.features.port_congestion.router import router as port_congestion_router
from app.features.vessel_status.router import router as vessel_status_router
from app.shared.responses import APIMetadataResponse


ROOT_EXAMPLE = {
    "project_name": "AgentSea",
    "description": "Agent-first maritime intelligence API for structured operational decisions.",
    "agent_first": True,
    "x402_ready": True,
    "algorand_ready": True,
}


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        summary="Agent-first maritime intelligence API.",
        description=(
            "AgentSea sells structured maritime decision intelligence to AI agents. "
            "This milestone provides mock intelligence products, a swappable AIS provider "
            "abstraction, and an x402 payment enforcement boundary for ETA risk on Algorand."
        ),
    )

    register_exception_handlers(app)
    attach_eta_risk_x402_middleware(app)

    @app.get(
        "/",
        summary="Get API metadata",
        description=(
            "Return top-level AgentSea metadata so developers and AI agents can quickly "
            "understand product intent and x402 readiness."
        ),
        response_model=APIMetadataResponse,
        responses={
            200: {
                "description": "AgentSea API metadata.",
                "content": {"application/json": {"example": ROOT_EXAMPLE}},
            }
        },
        tags=["platform"],
    )
    def read_root() -> APIMetadataResponse:
        return APIMetadataResponse(
            project_name=settings.app_name,
            description=settings.project_description,
            agent_first=settings.agent_first,
            x402_ready=settings.x402_ready,
            algorand_ready=settings.algorand_ready,
        )

    app.include_router(health_router)
    app.include_router(vessel_status_router)
    app.include_router(eta_risk_router)
    app.include_router(port_congestion_router)
    app.include_router(departure_verification_router)

    return app


app = create_app()
