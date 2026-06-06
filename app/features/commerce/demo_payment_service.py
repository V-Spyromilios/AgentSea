from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from urllib.parse import parse_qs, urlparse

import algosdk
import httpx
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.constants import PAYMENT_REQUIRED_HEADER, PAYMENT_RESPONSE_HEADER
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID
from x402.mechanisms.avm.exact.register import register_exact_avm_client
from x402.schemas import PaymentRequired

from app.core.config import get_settings
from app.features.commerce.schemas import (
    DemoPayEtaRiskRequest,
    DemoPayEtaRiskResponse,
    DemoPaymentDebugEvidence,
    DemoPaymentEvidence,
)
from app.features.commerce.x402_config import X402Settings, get_x402_settings


ETA_RISK_DEMO_PATH = "/v1/vessels/9321483/eta-risk"
TESTNET_LORA_TRANSACTION_URL = "https://lora.algokit.io/testnet/transaction"
EXPECTED_PROMISED_ETA = "2026-06-09"
HEADER_PREVIEW_LENGTH = 120
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DemoPayer:
    address: str
    secret_key: bytes
    encoded_secret_key: str


class AlgorandSigner:
    def __init__(self, secret_key: bytes, address: str):
        self._secret_key = secret_key
        self._address = address

    @property
    def address(self) -> str:
        return self._address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        private_key_b64 = base64.b64encode(self._secret_key).decode()
        signed_group: list[bytes | None] = []

        for index, txn_bytes in enumerate(unsigned_txns):
            if index in indexes_to_sign:
                txn = algosdk.encoding.msgpack_decode(
                    base64.b64encode(txn_bytes).decode()
                )
                signed = txn.sign(private_key_b64)
                signed_group.append(
                    base64.b64decode(algosdk.encoding.msgpack_encode(signed))
                )
            else:
                signed_group.append(None)

        return signed_group


class DemoPaymentExecutor:
    async def pay_eta_risk(
        self,
        request: DemoPayEtaRiskRequest,
    ) -> DemoPayEtaRiskResponse:
        settings = get_settings()
        x402_settings = get_x402_settings()

        if not x402_settings.enabled:
            raise ValueError("X402 must be enabled before demo payment can run.")

        if not settings.avm_private_key:
            raise ValueError(
                "AVM_PRIVATE_KEY must be configured on the backend for the demo payer."
            )

        resource_url = str(request.resource_url)
        self._validate_resource_url(resource_url, settings.resource_url)

        payer = self._load_demo_payer(settings.avm_private_key)

        if request.payer_address and request.payer_address != payer.address:
            raise ValueError(
                "payer_address does not match the configured backend demo payer."
            )

        try:
            return await self._perform_payment_request(
                request=request,
                resource_url=resource_url,
                payer=payer,
                x402_settings=x402_settings,
            )
        except Exception as exc:
            return DemoPayEtaRiskResponse(
                paid=False,
                status_code=500,
                payer_address=payer.address,
                resource_url=resource_url,
                mode=request.mode,
                error=self._sanitize_error_message(str(exc), payer.encoded_secret_key),
                payment_evidence=self._default_payment_evidence(x402_settings),
            )

    async def _perform_payment_request(
        self,
        request: DemoPayEtaRiskRequest,
        resource_url: str,
        payer: DemoPayer,
        x402_settings: X402Settings,
    ) -> DemoPayEtaRiskResponse:
        signer = AlgorandSigner(payer.secret_key, payer.address)
        x402 = x402Client()
        register_exact_avm_client(x402, signer, networks=x402_settings.network)
        payment_http_client = x402HTTPClient(x402)

        logger.info(
            "Starting demo x402 payment attempt for payer=%s resource_url=%s mode=%s",
            payer.address,
            resource_url,
            request.mode,
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            initial_response = await client.get(
                resource_url,
                headers={"Accept": "application/json"},
            )
            initial_body = await initial_response.aread()
            logger.info(
                "Initial demo payment request returned status=%s payment_required_present=%s",
                initial_response.status_code,
                initial_response.headers.get(PAYMENT_REQUIRED_HEADER) is not None,
            )

            if initial_response.status_code != 402:
                return DemoPayEtaRiskResponse(
                    paid=False,
                    status_code=initial_response.status_code,
                    payer_address=payer.address,
                    resource_url=resource_url,
                    mode=request.mode,
                    error=(
                        "Expected a real HTTP 402 payment checkpoint before demo payment, "
                        f"but received HTTP {initial_response.status_code}."
                    ),
                    payment_evidence=self._default_payment_evidence(x402_settings),
                    debug_evidence=DemoPaymentDebugEvidence(
                        retry_status_code=initial_response.status_code,
                        retry_body=self._sanitize_retry_text(
                            initial_body.decode("utf-8", errors="ignore"),
                            payer.encoded_secret_key,
                        ),
                    ),
                )

            raw_payment_required = initial_response.headers.get(PAYMENT_REQUIRED_HEADER)
            if not raw_payment_required:
                return DemoPayEtaRiskResponse(
                    paid=False,
                    status_code=402,
                    payer_address=payer.address,
                    resource_url=resource_url,
                    mode=request.mode,
                    error="PAYMENT-REQUIRED header was missing from the HTTP 402 response.",
                    payment_evidence=self._default_payment_evidence(x402_settings),
                    debug_evidence=DemoPaymentDebugEvidence(
                        retry_status_code=402,
                        retry_body=self._sanitize_retry_text(
                            initial_body.decode("utf-8", errors="ignore"),
                            payer.encoded_secret_key,
                        ),
                    ),
                )

            payment_required = payment_http_client.get_payment_required_response(
                lambda name: initial_response.headers.get(name),
                initial_body,
            )
            evidence = self._build_payment_evidence(
                payment_required=payment_required,
                raw_payment_response_header=None,
                settle_response=None,
            )

            try:
                payment_headers, _ = await payment_http_client.handle_402_response(
                    dict(initial_response.headers),
                    initial_body,
                )
            except Exception as exc:
                return DemoPayEtaRiskResponse(
                    paid=False,
                    status_code=402,
                    payer_address=payer.address,
                    resource_url=resource_url,
                    mode=request.mode,
                    error=self._sanitize_error_message(str(exc), payer.encoded_secret_key),
                    payment_evidence=evidence,
                    debug_evidence=DemoPaymentDebugEvidence(),
                )

            retry_response = await client.get(
                resource_url,
                headers={
                    "Accept": "application/json",
                    **payment_headers,
                },
            )
            retry_body = await retry_response.aread()
            raw_payment_response = retry_response.headers.get(PAYMENT_RESPONSE_HEADER)
            retry_payment_required_header = retry_response.headers.get(PAYMENT_REQUIRED_HEADER)
            debug_evidence = self._build_retry_debug_evidence(
                retry_status_code=retry_response.status_code,
                retry_body=retry_body,
                retry_payment_required_header=retry_payment_required_header,
                payment_response_header=raw_payment_response,
                secret=payer.encoded_secret_key,
            )

            settle_response = None
            payment_note = None
            if raw_payment_response:
                try:
                    settle_response = payment_http_client.get_payment_settle_response(
                        lambda name: retry_response.headers.get(name)
                    )
                except ValueError:
                    payment_note = (
                        "Payment response header was returned but could not be decoded by "
                        "the current x402 client helper."
                    )
            elif retry_response.status_code == 200:
                payment_note = (
                    "Payment succeeded but transaction id was not exposed by the current "
                    "x402 client response."
                )

            evidence = self._build_payment_evidence(
                payment_required=payment_required,
                raw_payment_response_header=raw_payment_response,
                settle_response=settle_response,
                note=payment_note,
            )
            logger.info(
                "Demo x402 retry returned status=%s decoded_retry_error=%s payment_response_present=%s",
                retry_response.status_code,
                self._extract_decoded_retry_error(debug_evidence.decoded_retry_payment_required),
                raw_payment_response is not None,
            )

            if retry_response.status_code != 200:
                return DemoPayEtaRiskResponse(
                    paid=False,
                    status_code=retry_response.status_code,
                    payer_address=payer.address,
                    resource_url=resource_url,
                    mode=request.mode,
                    error=self._extract_retry_error(retry_response, retry_body),
                    payment_evidence=evidence,
                    debug_evidence=debug_evidence,
                )

            return DemoPayEtaRiskResponse(
                paid=True,
                status_code=200,
                payer_address=payer.address,
                resource_url=resource_url,
                mode=request.mode,
                intelligence=json.loads(retry_body.decode("utf-8")),
                payment_evidence=evidence,
                debug_evidence=debug_evidence,
            )

    def _load_demo_payer(self, encoded_secret_key: str) -> DemoPayer:
        secret_key = base64.b64decode(encoded_secret_key)
        if len(secret_key) != 64:
            raise ValueError("AVM_PRIVATE_KEY must be a Base64-encoded 64-byte key.")

        address = algosdk.encoding.encode_address(secret_key[32:])
        return DemoPayer(
            address=address,
            secret_key=secret_key,
            encoded_secret_key=encoded_secret_key,
        )

    def _validate_resource_url(self, resource_url: str, expected_url: str) -> None:
        parsed = urlparse(resource_url)
        expected = urlparse(expected_url)

        if parsed.scheme not in {"http", "https"}:
            raise ValueError("resource_url must use http or https.")

        if parsed.hostname not in {"127.0.0.1", "localhost"}:
            raise ValueError("resource_url must point to the local MarineAgent demo backend.")

        if resource_url != expected_url:
            raise ValueError(
                "resource_url must match the configured demo RESOURCE_URL exactly."
            )

        if parsed.path != ETA_RISK_DEMO_PATH:
            raise ValueError("resource_url must target the protected ETA risk demo path.")

        promised_eta = parse_qs(parsed.query).get("promised_eta", [None])[0]
        if promised_eta != EXPECTED_PROMISED_ETA:
            raise ValueError(
                "resource_url must use the expected demo promised_eta query value."
            )

        if expected.hostname not in {"127.0.0.1", "localhost"}:
            raise ValueError("Configured RESOURCE_URL must remain local for the demo payer.")

    def _build_payment_evidence(
        self,
        payment_required: PaymentRequired,
        raw_payment_response_header: str | None,
        settle_response: Any,
        note: str | None = None,
    ) -> DemoPaymentEvidence:
        if not payment_required.accepts:
            raise ValueError("Payment requirement did not include any accepted payment options.")
        accepted = payment_required.accepts[0]
        asset_id = str(accepted.asset)
        transaction_id = getattr(settle_response, "transaction", None)
        raw_settlement = self._decode_base64_json(raw_payment_response_header)
        group_id = self._find_nested_value(
            raw_settlement,
            {"groupId", "group_id", "settlementGroupId", "settlement_group_id"},
        )

        return DemoPaymentEvidence(
            network=self._network_label(str(accepted.network), accepted.extra),
            asset_id=asset_id,
            amount=self._human_amount(
                amount=str(accepted.amount),
                asset_id=asset_id,
                decimals=self._extract_decimals(accepted.extra),
            ),
            asset_label=self._asset_label(asset_id),
            transaction_id=transaction_id,
            group_id=group_id,
            lora_url=self._build_lora_url(str(accepted.network), transaction_id),
            raw_payment_response_header=raw_payment_response_header,
            note=note,
        )

    def _default_payment_evidence(self, x402_settings: X402Settings) -> DemoPaymentEvidence:
        return DemoPaymentEvidence(
            network=self._network_label(x402_settings.network, None),
            asset_id=str(USDC_TESTNET_ASA_ID),
            amount=x402_settings.eta_risk_price_usd,
            asset_label=self._asset_label(str(USDC_TESTNET_ASA_ID)),
        )

    def _extract_retry_error(
        self,
        response: httpx.Response,
        body: bytes,
    ) -> str:
        if body:
            try:
                payload = json.loads(body.decode("utf-8"))
                if isinstance(payload, dict):
                    if isinstance(payload.get("detail"), str):
                        return payload["detail"]
                    if isinstance(payload.get("error"), str):
                        return payload["error"]
            except json.JSONDecodeError:
                text = body.decode("utf-8", errors="ignore").strip()
                if text:
                    return text

        return f"x402 payment retry returned HTTP {response.status_code}."

    def _build_retry_debug_evidence(
        self,
        retry_status_code: int,
        retry_body: bytes,
        retry_payment_required_header: str | None,
        payment_response_header: str | None,
        secret: str,
    ) -> DemoPaymentDebugEvidence:
        decoded_retry_payment_required = self._decode_payment_required_header_for_debug(
            retry_payment_required_header
        )
        return DemoPaymentDebugEvidence(
            retry_status_code=retry_status_code,
            retry_body=self._sanitize_retry_text(
                retry_body.decode("utf-8", errors="ignore"),
                secret,
            ),
            retry_payment_required_header_present=retry_payment_required_header is not None,
            retry_payment_required_header_preview=self._preview_header(
                retry_payment_required_header
            ),
            decoded_retry_payment_required=decoded_retry_payment_required,
            payment_response_header_present=payment_response_header is not None,
            payment_response_header_preview=self._preview_header(payment_response_header),
        )

    def _decode_payment_required_header_for_debug(
        self,
        header_value: str | None,
    ) -> dict[str, Any] | None:
        decoded = self._decode_base64_json(header_value)
        if not isinstance(decoded, dict):
            return None

        result: dict[str, Any] = {}
        for key in ("error", "message", "reason"):
            value = decoded.get(key)
            if isinstance(value, str):
                result[key] = value

        accepts = decoded.get("accepts")
        if isinstance(accepts, list):
            result["accepts"] = [
                self._safe_accept_preview(item)
                for item in accepts
                if isinstance(item, dict)
            ]

        return result or decoded

    def _safe_accept_preview(self, accept: dict[str, Any]) -> dict[str, Any]:
        preview: dict[str, Any] = {}
        for key in ("scheme", "network", "asset", "amount", "payTo"):
            value = accept.get(key)
            if value is not None:
                preview[key] = value
        return preview

    def _extract_decoded_retry_error(self, decoded: dict[str, Any] | None) -> str | None:
        if not decoded:
            return None
        for key in ("error", "message", "reason"):
            value = decoded.get(key)
            if isinstance(value, str):
                return value
        return None

    def _sanitize_error_message(self, message: str, secret: str) -> str:
        if secret and secret in message:
            return message.replace(secret, "[redacted]")
        return message

    def _sanitize_retry_text(self, text: str, secret: str) -> str | None:
        cleaned = self._sanitize_error_message(text.strip(), secret)
        return cleaned or None

    def _decode_base64_json(self, header_value: str | None) -> Any:
        if not header_value:
            return None

        try:
            decoded = base64.b64decode(header_value).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            return None

    def _find_nested_value(self, data: Any, names: set[str]) -> str | None:
        if isinstance(data, dict):
            for key, value in data.items():
                if key in names and value is not None:
                    return str(value)
                found = self._find_nested_value(value, names)
                if found is not None:
                    return found
        elif isinstance(data, list):
            for item in data:
                found = self._find_nested_value(item, names)
                if found is not None:
                    return found
        return None

    def _preview_header(self, header_value: str | None) -> str | None:
        if not header_value:
            return None
        if len(header_value) <= HEADER_PREVIEW_LENGTH:
            return header_value
        return f"{header_value[:HEADER_PREVIEW_LENGTH]}..."

    def _extract_decimals(self, extra: dict[str, Any] | None) -> int | None:
        if not extra:
            return None
        decimals = extra.get("decimals")
        return decimals if isinstance(decimals, int) else None

    def _human_amount(self, amount: str, asset_id: str, decimals: int | None) -> str:
        resolved_decimals = decimals
        if resolved_decimals is None and asset_id == str(USDC_TESTNET_ASA_ID):
            resolved_decimals = 6

        if resolved_decimals is None:
            return amount

        value = Decimal(amount) / (Decimal(10) ** resolved_decimals)
        normalized = value.normalize()
        return format(normalized, "f")

    def _asset_label(self, asset_id: str) -> str:
        if asset_id == str(USDC_TESTNET_ASA_ID):
            return "TestNet USDC"
        return f"ASA {asset_id}"

    def _network_label(self, network: str, extra: dict[str, Any] | None) -> str:
        if network == ALGORAND_TESTNET_CAIP2:
            return "Algorand TestNet"
        if extra and extra.get("genesisId") == "testnet-v1.0":
            return "Algorand TestNet"
        if network.startswith("algorand:"):
            return "Algorand"
        return network

    def _build_lora_url(self, network: str, transaction_id: str | None) -> str | None:
        if not transaction_id:
            return None
        if network == ALGORAND_TESTNET_CAIP2:
            return f"{TESTNET_LORA_TRANSACTION_URL}/{transaction_id}"
        return None


_demo_payment_executor = DemoPaymentExecutor()


def get_demo_payment_executor() -> DemoPaymentExecutor:
    return _demo_payment_executor
