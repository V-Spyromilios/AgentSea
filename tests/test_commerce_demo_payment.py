import asyncio
import base64
import json

import httpx

from app.core.config import LOCAL_DEMO_RESOURCE_URL
from app.features.commerce.demo_payment_service import DemoPaymentExecutor
from app.features.commerce.schemas import DemoPayEtaRiskResponse, DemoPaymentEvidence
from app.features.commerce.x402_config import X402Settings
from x402.http.constants import PAYMENT_REQUIRED_HEADER, PAYMENT_RESPONSE_HEADER
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.schemas import PaymentRequired, PaymentRequirements, ResourceInfo


def test_demo_payment_rejects_invalid_resource_url(app_client_factory) -> None:
    client = app_client_factory(
        X402_ENABLED="true",
        AVM_PRIVATE_KEY="QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ==",
    )

    response = client.post(
        "/v1/commerce/demo/pay-eta-risk",
        json={
            "resource_url": "http://127.0.0.1:8000/v1/vessels/9321483/status",
            "mode": "manual_confirm",
        },
    )

    assert response.status_code == 400
    assert "resource_url" in response.json()["detail"]


def test_demo_payment_requires_backend_demo_payer_key(app_client_factory) -> None:
    client = app_client_factory(
        X402_ENABLED="true",
        AVM_PRIVATE_KEY="",
        RESOURCE_URL=LOCAL_DEMO_RESOURCE_URL,
    )

    response = client.post(
        "/v1/commerce/demo/pay-eta-risk",
        json={
            "resource_url": LOCAL_DEMO_RESOURCE_URL,
            "mode": "manual_confirm",
        },
    )

    assert response.status_code == 409
    assert "AVM_PRIVATE_KEY" in response.json()["detail"]


def test_demo_payment_failure_does_not_expose_private_key(
    app_client_factory,
    monkeypatch,
) -> None:
    secret = "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ=="

    async def fake_perform_payment_request(self, request, resource_url, payer, x402_settings):  # type: ignore[no-untyped-def]
        raise RuntimeError(f"payment failed for {payer.address} using {secret}")

    monkeypatch.setattr(
        DemoPaymentExecutor,
        "_perform_payment_request",
        fake_perform_payment_request,
    )

    client = app_client_factory(
        X402_ENABLED="true",
        AVM_PRIVATE_KEY=secret,
        RESOURCE_URL=LOCAL_DEMO_RESOURCE_URL,
    )

    response = client.post(
        "/v1/commerce/demo/pay-eta-risk",
        json={
            "resource_url": LOCAL_DEMO_RESOURCE_URL,
            "mode": "manual_confirm",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["paid"] is False
    assert secret not in response.text
    assert secret not in json.dumps(body)
    assert "[redacted]" in body["error"]


def test_demo_payment_returns_paid_false_when_payment_fails(
    app_client_factory,
    monkeypatch,
) -> None:
    async def fake_perform_payment_request(self, request, resource_url, payer, x402_settings):  # type: ignore[no-untyped-def]
        return DemoPayEtaRiskResponse(
            paid=False,
            status_code=402,
            payer_address=payer.address,
            resource_url=resource_url,
            mode=request.mode,
            error="asset 10458941 missing from payer account",
            payment_evidence=DemoPaymentEvidence(
                network="Algorand TestNet",
                asset_id="10458941",
                amount="0.02",
                asset_label="TestNet USDC",
            ),
        )

    monkeypatch.setattr(
        DemoPaymentExecutor,
        "_perform_payment_request",
        fake_perform_payment_request,
    )

    client = app_client_factory(
        X402_ENABLED="true",
        AVM_PRIVATE_KEY="QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ==",
        RESOURCE_URL=LOCAL_DEMO_RESOURCE_URL,
    )

    response = client.post(
        "/v1/commerce/demo/pay-eta-risk",
        json={
            "resource_url": LOCAL_DEMO_RESOURCE_URL,
            "mode": "manual_confirm",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["paid"] is False
    assert body["status_code"] == 402
    assert body["intelligence"] is None
    assert body["payment_evidence"]["asset_id"] == "10458941"


def test_demo_payment_returns_paid_true_only_when_payment_succeeds(
    app_client_factory,
    monkeypatch,
) -> None:
    async def fake_perform_payment_request(self, request, resource_url, payer, x402_settings):  # type: ignore[no-untyped-def]
        return DemoPayEtaRiskResponse(
            paid=True,
            status_code=200,
            payer_address=payer.address,
            resource_url=resource_url,
            mode=request.mode,
            intelligence={
                "product": "eta-risk",
                "risk_level": "high",
                "realistic_eta": "2026-06-12",
            },
            payment_evidence=DemoPaymentEvidence(
                network="Algorand TestNet",
                asset_id="10458941",
                amount="0.02",
                asset_label="TestNet USDC",
                transaction_id="MOCKTXID123",
                lora_url="https://lora.algokit.io/testnet/transaction/MOCKTXID123",
            ),
        )

    monkeypatch.setattr(
        DemoPaymentExecutor,
        "_perform_payment_request",
        fake_perform_payment_request,
    )

    client = app_client_factory(
        X402_ENABLED="true",
        AVM_PRIVATE_KEY="QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ==",
        RESOURCE_URL=LOCAL_DEMO_RESOURCE_URL,
    )

    response = client.post(
        "/v1/commerce/demo/pay-eta-risk",
        json={
            "resource_url": LOCAL_DEMO_RESOURCE_URL,
            "mode": "manual_confirm",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["paid"] is True
    assert body["status_code"] == 200
    assert body["intelligence"]["product"] == "eta-risk"
    assert body["payment_evidence"]["transaction_id"] == "MOCKTXID123"


def test_demo_payment_retry_402_returns_debug_evidence(monkeypatch) -> None:
    secret = "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ=="
    executor = DemoPaymentExecutor()
    payer = executor._load_demo_payer(secret)
    request_model = type(
        "RequestModel",
        (),
        {
            "mode": "manual_confirm",
        },
    )()

    initial_required = PaymentRequired(
        error="Payment required",
        resource=ResourceInfo(
            url="/v1/vessels/{imo}/eta-risk",
            description="ETA risk intelligence",
            mimeType="application/json",
        ),
        accepts=[
            PaymentRequirements(
                scheme="exact",
                network=ALGORAND_TESTNET_CAIP2,
                asset="10458941",
                amount="20000",
                payTo="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
                maxTimeoutSeconds=300,
                extra={"decimals": 6, "genesisId": "testnet-v1.0"},
            )
        ],
    )

    retry_required_payload = {
        "x402Version": 2,
        "error": "facilitator rejected payment proof",
        "accepts": [
            {
                "scheme": "exact",
                "network": ALGORAND_TESTNET_CAIP2,
                "asset": "10458941",
                "amount": "20000",
                "payTo": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
            }
        ],
    }
    retry_required_header = base64.b64encode(
        json.dumps(retry_required_payload).encode("utf-8")
    ).decode("utf-8")

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            self._responses = [
                httpx.Response(
                    402,
                    headers={PAYMENT_REQUIRED_HEADER: retry_required_header},
                    content=b"{}",
                    request=httpx.Request("GET", LOCAL_DEMO_RESOURCE_URL),
                ),
                httpx.Response(
                    402,
                    headers={
                        PAYMENT_REQUIRED_HEADER: retry_required_header,
                        PAYMENT_RESPONSE_HEADER: "opaque-payment-response",
                    },
                    content=b'{"detail":"facilitator rejected payment"}',
                    request=httpx.Request("GET", LOCAL_DEMO_RESOURCE_URL),
                ),
            ]

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def get(self, url, headers=None):
            return self._responses.pop(0)

    monkeypatch.setattr(
        "app.features.commerce.demo_payment_service.httpx.AsyncClient",
        FakeAsyncClient,
    )
    monkeypatch.setattr(
        "app.features.commerce.demo_payment_service.register_exact_avm_client",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        "app.features.commerce.demo_payment_service.x402HTTPClient.get_payment_required_response",
        lambda self, get_header, body: initial_required,
    )
    monkeypatch.setattr(
        "app.features.commerce.demo_payment_service.x402HTTPClient.handle_402_response",
        lambda self, headers, body: asyncio.sleep(
            0, result=({"PAYMENT-SIGNATURE": "mock-signature"}, object())
        ),
    )
    monkeypatch.setattr(
        "app.features.commerce.demo_payment_service.x402HTTPClient.get_payment_settle_response",
        lambda self, get_header: (_ for _ in ()).throw(ValueError("not decodable")),
    )

    result = asyncio.run(
        executor._perform_payment_request(
            request=request_model,
            resource_url=LOCAL_DEMO_RESOURCE_URL,
            payer=payer,
            x402_settings=X402Settings(enabled=True),
        )
    )

    assert result.paid is False
    assert result.status_code == 402
    assert result.debug_evidence is not None
    assert result.debug_evidence.retry_status_code == 402
    assert result.debug_evidence.retry_payment_required_header_present is True
    assert result.debug_evidence.payment_response_header_present is True
    assert result.debug_evidence.decoded_retry_payment_required is not None
    assert (
        result.debug_evidence.decoded_retry_payment_required["error"]
        == "facilitator rejected payment proof"
    )
    assert secret not in json.dumps(result.model_dump())
