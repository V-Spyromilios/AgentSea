from x402.http.constants import PAYMENT_REQUIRED_HEADER, PAYMENT_RESPONSE_HEADER
from x402.http.types import HTTPProcessResult, ProcessSettleResult
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID
from x402.schemas import PaymentPayload, PaymentRequirements


TEST_AVM_ADDRESS = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"


def test_port_congestion_returns_200_when_x402_disabled(app_client_factory) -> None:
    client = app_client_factory(X402_ENABLED="false")

    response = client.get("/v1/ports/DEHAM/congestion")

    assert response.status_code == 200
    assert response.json()["product"] == "port-congestion"


def test_port_congestion_returns_402_when_x402_enabled_and_unpaid(
    app_client_factory,
    monkeypatch,
) -> None:
    def fake_initialize(self) -> None:  # type: ignore[no-untyped-def]
        self._initialized = True

    def fake_build_payment_requirements(self, config, extensions=None):  # type: ignore[no-untyped-def]
        return [
            PaymentRequirements(
                scheme="exact",
                network=ALGORAND_TESTNET_CAIP2,
                asset=str(USDC_TESTNET_ASA_ID),
                amount="20000",
                payTo=TEST_AVM_ADDRESS,
                maxTimeoutSeconds=60,
            )
        ]

    monkeypatch.setattr("x402.server.x402ResourceServer.initialize", fake_initialize)
    monkeypatch.setattr(
        "x402.server.x402ResourceServer.build_payment_requirements",
        fake_build_payment_requirements,
    )

    client = app_client_factory(
        X402_ENABLED="true",
        X402_AVM_ADDRESS=TEST_AVM_ADDRESS,
        X402_SYNC_FACILITATOR_ON_START="false",
    )

    response = client.get("/v1/ports/DEHAM/congestion")

    assert response.status_code == 402
    assert response.json() == {}
    assert PAYMENT_REQUIRED_HEADER in response.headers


def test_port_congestion_returns_200_when_x402_enabled_and_payment_is_verified(
    app_client_factory,
    monkeypatch,
) -> None:
    async def fake_process_http_request(self, context, paywall_config=None):  # type: ignore[no-untyped-def]
        accepted = PaymentRequirements(
            scheme="exact",
            network=ALGORAND_TESTNET_CAIP2,
            asset=str(USDC_TESTNET_ASA_ID),
            amount="20000",
            payTo=TEST_AVM_ADDRESS,
            maxTimeoutSeconds=60,
        )
        payload = PaymentPayload(
            payload={"mocked": True},
            accepted=accepted,
        )
        return HTTPProcessResult(
            type="payment-verified",
            payment_payload=payload,
            payment_requirements=accepted,
        )

    async def fake_process_settlement(self, payment_payload, requirements):  # type: ignore[no-untyped-def]
        return ProcessSettleResult(
            success=True,
            headers={PAYMENT_RESPONSE_HEADER: "mock-payment-response"},
            transaction="mock-port-txid",
            network=ALGORAND_TESTNET_CAIP2,
            payer="mock-payer",
        )

    monkeypatch.setattr(
        "x402.http.x402_http_server.x402HTTPResourceServer.process_http_request",
        fake_process_http_request,
    )
    monkeypatch.setattr(
        "x402.http.x402_http_server.x402HTTPResourceServer.process_settlement",
        fake_process_settlement,
    )

    client = app_client_factory(
        X402_ENABLED="true",
        X402_AVM_ADDRESS=TEST_AVM_ADDRESS,
        X402_SYNC_FACILITATOR_ON_START="false",
        X402_PORT_CONGESTION_PRICE_USD="0.02",
    )

    response = client.get(
        "/v1/ports/DEHAM/congestion",
        headers={"PAYMENT-SIGNATURE": "mock-payment-signature"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["product"] == "port-congestion"
    assert body["congestion_level"] == "high"
    assert body["price"] == {
        "asset": "USDC",
        "amount": "0.02",
        "network": ALGORAND_TESTNET_CAIP2,
    }
    assert response.headers[PAYMENT_RESPONSE_HEADER] == "mock-payment-response"
