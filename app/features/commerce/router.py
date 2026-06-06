from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.features.commerce.demo_payment_service import get_demo_payment_executor
from app.features.commerce.schemas import DemoPaymentRequest, DemoPaymentResponse


router = APIRouter(prefix="/v1/commerce", tags=["commerce"])


@router.post(
    "/demo/pay-eta-risk",
    summary="Confirm demo x402 payment for ETA risk",
    description=(
        "Execute a real demo-only x402 payment from the backend demo payer wallet for the "
        "protected ETA risk resource, then return the paid intelligence response and any "
        "settlement evidence that the current x402 client exposes."
    ),
    response_model=DemoPaymentResponse,
    responses={
        200: {
            "description": "Demo payment attempt completed and returned either paid output or a truthful failure envelope.",
            "content": {
                "application/json": {
                    "example": DemoPaymentResponse.model_config["json_schema_extra"]["example"]
                }
            },
        },
        400: {"description": "The request did not satisfy demo payment safety checks."},
        409: {"description": "Demo payment is unavailable because x402 or the backend demo payer is not configured."},
    },
)
async def demo_pay_eta_risk(
    request: DemoPaymentRequest,
) -> DemoPaymentResponse:
    executor = get_demo_payment_executor()

    try:
        return await executor.pay_eta_risk(request)
    except ValueError as exc:
        message = str(exc)
        status_code = 409 if "X402" in message or "AVM_PRIVATE_KEY" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post(
    "/demo/pay-port-congestion",
    summary="Confirm demo x402 payment for port congestion",
    description=(
        "Execute a real demo-only x402 payment from the backend demo payer wallet for the "
        "protected port congestion resource, then return the paid intelligence response and "
        "any settlement evidence that the current x402 client exposes."
    ),
    response_model=DemoPaymentResponse,
    responses={
        200: {
            "description": "Demo payment attempt completed and returned either paid output or a truthful failure envelope.",
            "content": {
                "application/json": {
                    "example": {
                        **DemoPaymentResponse.model_config["json_schema_extra"]["example"],
                        "resource_url": "http://127.0.0.1:8000/v1/ports/DEHAM/congestion",
                        "intelligence": {
                            "product": "port-congestion",
                            "port_code": "DEHAM",
                            "port_name": "Hamburg",
                            "congestion_level": "high",
                            "average_delay_hours": 28.0,
                            "waiting_vessels": 14,
                            "berth_utilization": 0.91,
                            "assessment": "Congestion is high and likely to extend berth waiting times.",
                        },
                    }
                }
            },
        },
        400: {"description": "The request did not satisfy demo payment safety checks."},
        409: {"description": "Demo payment is unavailable because x402 or the backend demo payer is not configured."},
    },
)
async def demo_pay_port_congestion(
    request: DemoPaymentRequest,
) -> DemoPaymentResponse:
    executor = get_demo_payment_executor()

    try:
        return await executor.pay_port_congestion(request)
    except ValueError as exc:
        message = str(exc)
        status_code = 409 if "X402" in message or "AVM_PRIVATE_KEY" in message else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
