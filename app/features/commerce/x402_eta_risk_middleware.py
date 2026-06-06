from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import payment_middleware
from x402.http.types import RouteConfig, RoutesConfig
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.server import x402ResourceServer

from app.features.commerce.x402_config import X402Settings, get_x402_settings


def build_protected_product_x402_routes(settings: X402Settings) -> RoutesConfig:
    return {
        settings.eta_risk_route_pattern: RouteConfig(
            accepts=PaymentOption(
                scheme="exact",
                pay_to=settings.avm_address,
                price=settings.eta_risk_price_expression,
                network=settings.network,
            ),
            resource="/v1/vessels/{imo}/eta-risk",
            description="ETA risk intelligence for maritime schedule credibility.",
            mime_type="application/json",
        ),
        settings.port_congestion_route_pattern: RouteConfig(
            accepts=PaymentOption(
                scheme="exact",
                pay_to=settings.avm_address,
                price=settings.port_congestion_price_expression,
                network=settings.network,
            ),
            resource="/v1/ports/{port_code}/congestion",
            description="Port congestion intelligence for berth delay and queue risk.",
            mime_type="application/json",
        ),
    }


def build_commerce_payment_middleware(
    settings: X402Settings | None = None,
) -> Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]] | None:
    resolved_settings = settings or get_x402_settings()
    if not resolved_settings.enabled:
        return None

    facilitator = HTTPFacilitatorClient(
        FacilitatorConfig(url=resolved_settings.facilitator_url)
    )
    server = x402ResourceServer(facilitator)
    register_exact_avm_server(server, networks=resolved_settings.network)

    return payment_middleware(
        routes=build_protected_product_x402_routes(resolved_settings),
        server=server,
        sync_facilitator_on_start=resolved_settings.sync_facilitator_on_start,
    )


def attach_commerce_x402_middleware(app: FastAPI) -> None:
    middleware = build_commerce_payment_middleware()
    if middleware is None:
        return

    @app.middleware("http")
    async def commerce_x402_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        return await middleware(request, call_next)
