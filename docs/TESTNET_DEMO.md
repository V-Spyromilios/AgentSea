# TESTNET_DEMO.md

## Purpose

This runbook documents the real end-to-end Algorand TestNet x402 flow for MarineAgent's paid ETA Risk endpoint:

- Start MarineAgent with `X402_ENABLED=true`
- Send an unpaid request to `GET /v1/vessels/{imo}/eta-risk`
- Receive `HTTP 402 Payment Required`
- Pay with an Algorand TestNet x402 client
- Retry automatically with payment proof
- Receive the normal ETA risk intelligence response
- Confirm that port congestion is also a second independent x402-protected product

The repo now supports two truthful demo paths that use the same funded TestNet payer:

- the existing Python x402 client flow from the terminal
- the frontend Confirm x402 Payment button, which calls a backend demo-payment endpoint that uses `AVM_PRIVATE_KEY` server-side

This document is for Milestone 3 execution readiness. It does not add new product scope or change business logic.

## Prepare `.env`

Start from the committed example:

```bash
cp .env.example .env
```

Update `.env` with real TestNet values for:

- `X402_AVM_ADDRESS`
- `AVM_PRIVATE_KEY`

For the first live demo, also set:

```bash
X402_ENABLED=true
X402_SYNC_FACILITATOR_ON_START=true
```

## Current Scope

- Protected endpoint: `GET /v1/vessels/{imo}/eta-risk`
- Unprotected endpoints: `/health`, vessel status, departure verification
- Additional protected endpoint: `/v1/ports/{port_code}/congestion`
- Payment stack: official `x402-avm[fastapi,avm]==2.0.2`
- Network: Algorand TestNet
- Asset for the real demo: TestNet USDC

The current official Algorand x402 flow uses TestNet USDC on Algorand. The known TestNet USDC ASA ID is `10458941`.

## Required Accounts

You need two Algorand TestNet accounts:

- `payer`: the client account that pays for ETA risk or port congestion requests
- `receiver`: the MarineAgent server account that receives payment and becomes `X402_AVM_ADDRESS`

Both accounts should have:

- TestNet ALGO for fees and minimum balance
- TestNet USDC opt-in completed

The payer must also hold TestNet USDC before attempting payment.

## Create Accounts

Use the installed `algosdk` to generate fresh local-only TestNet accounts:

```bash
python3 - <<'PY'
from algosdk import account, mnemonic

for name in ("payer", "receiver"):
    private_key, address = account.generate_account()
    print(f"{name.upper()}_ADDRESS={address}")
    print(f"{name.upper()}_PRIVATE_KEY={private_key}")
    print(f"{name.upper()}_MNEMONIC={mnemonic.from_private_key(private_key)}")
    print()
PY
```

Important:

- `*_PRIVATE_KEY` is already the Base64-encoded 64-byte value expected by the Python x402 client as `AVM_PRIVATE_KEY`
- Never commit mnemonics or private keys
- Keep these values in a local `.env` file or shell session only

## Fund Both Accounts With TestNet ALGO

Fund both `payer` and `receiver` with TestNet ALGO using either:

- Lora: [https://lora.algokit.io/](https://lora.algokit.io/)
- Algorand TestNet Dispenser: [https://dispenser.testnet.aws.algodev.network/](https://dispenser.testnet.aws.algodev.network/)

Recommended minimum:

- `payer`: at least `5` TestNet ALGO
- `receiver`: at least `2` TestNet ALGO

## Opt Both Accounts Into TestNet USDC

Before the x402 payment can work, both accounts should opt into TestNet USDC asset `10458941`.

Official no-code path:

1. Open [https://lora.algokit.io/](https://lora.algokit.io/)
2. Switch to `TestNet`
3. Load the account you want to opt in
4. Find asset `10458941`
5. Opt in
6. Repeat for the other account

If you prefer a script, run the following once per account after replacing the env vars:

```bash
export ALGO_ADDRESS="YOUR_ACCOUNT_ADDRESS"
export ALGO_PRIVATE_KEY="YOUR_ACCOUNT_PRIVATE_KEY"

python3 - <<'PY'
import os
from algosdk import transaction
from algosdk.v2client import algod
from algosdk.transaction import wait_for_confirmation
from x402.mechanisms.avm import USDC_TESTNET_ASA_ID

client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")
address = os.environ["ALGO_ADDRESS"]
private_key = os.environ["ALGO_PRIVATE_KEY"]

params = client.suggested_params()
txn = transaction.AssetTransferTxn(
    sender=address,
    sp=params,
    receiver=address,
    amt=0,
    index=USDC_TESTNET_ASA_ID,
)
signed = txn.sign(private_key)
txid = client.send_transaction(signed)
wait_for_confirmation(client, txid, 4)
print(txid)
print(f"Opt-in complete for {address}")
PY
```

## Fund TestNet USDC

Fund TestNet USDC through Circle's public faucet:

- Faucet: [https://faucet.circle.com/](https://faucet.circle.com/)
- Asset: `USDC`
- Network: `Algorand Testnet`

Follow the official Algorand x402 setup and fund both accounts. The payer is the account that actually spends USDC in the request flow.

## Required Environment Variables

MarineAgent reads server configuration from `.env` through `app/core/config.py`. The Python payment client reads its values from exported shell variables, so load the same `.env` into your shell before running the client command:

```bash
set -a
source .env
set +a
```

### Server

```bash
X402_ENABLED=true
X402_AVM_ADDRESS="RECEIVER_ADDRESS"
X402_FACILITATOR_URL="https://facilitator.goplausible.xyz"
X402_NETWORK="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
X402_ETA_RISK_PRICE_USD="0.02"
X402_SYNC_FACILITATOR_ON_START=true
```

### Client

```bash
AVM_PRIVATE_KEY="PAYER_PRIVATE_KEY"
RESOURCE_URL="http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09"
```

Demo-custody note:

- `AVM_PRIVATE_KEY` now powers both the Python client flow and the backend demo-payment endpoint
- this is acceptable only for a local hackathon demo
- do not expose the key to the frontend, and do not reuse this backend-custody pattern as a production wallet design

## Start MarineAgent

From the repository root:

```bash
uvicorn app.main:app --reload
```

Live demo note:

- Set `X402_SYNC_FACILITATOR_ON_START=true` for real TestNet runs
- The current default of `false` is fine for mocked local tests, but the live demo should initialize against the hosted facilitator before the first unpaid request
- The server reads these values from `.env`, so you do not need to prefix `uvicorn` with inline env vars once `.env` is populated

## Step 1: Make The Unpaid Request

```bash
curl -i "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09"
```

Expected result:

- Status: `HTTP/1.1 402 Payment Required`
- A `payment-required` response header describing the x402 payment requirement

## Step 2: Pay And Retry With The Python x402 Client

The client below uses the installed `x402-avm` Python stack and automatically retries after building a valid Algorand payment proof.

```bash
python3 - <<'PY'
import asyncio
import base64
import os

from dotenv import load_dotenv

load_dotenv(".env", override=True)
import algosdk
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients.httpx import x402HttpxClient
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact.register import register_exact_avm_client


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


async def main() -> None:
    private_key_b64 = os.environ["AVM_PRIVATE_KEY"]
    resource_url = os.environ["RESOURCE_URL"]

    secret_key = base64.b64decode(private_key_b64)
    if len(secret_key) != 64:
        raise ValueError("AVM_PRIVATE_KEY must be a Base64-encoded 64-byte key")

    address = algosdk.encoding.encode_address(secret_key[32:])
    print(f"Payer address: {address}")

    signer = AlgorandSigner(secret_key, address)
    x402 = x402Client()
    register_exact_avm_client(x402, signer, networks=ALGORAND_TESTNET_CAIP2)

    async with x402HttpxClient(x402) as client:
        response = await client.get(resource_url)
        await response.aread()

        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")

        print("Status:", response.status_code)
        print("Headers:")
        for k, v in response.headers.items():
            print(k, ":", v)
        print("Body:", response.text)

        if response.is_success:
            settle_client = x402HTTPClient(x402)
            try:
                settlement = settle_client.get_payment_settle_response(
                    lambda name: response.headers.get(name)
                )
                print("Settlement metadata:")
                print(settlement.model_dump_json(indent=2))
            except ValueError:
                print("No settlement header was returned")


asyncio.run(main())
PY
```

Capture these fields from the Python client for the frontend demo evidence panel:

- payer address
- transaction ID if settlement succeeds
- any settlement or group ID printed by your client tooling
- any payment error message if settlement fails

If you have a transaction ID, you can open it in Lora TestNet with:

```text
https://lora.algokit.io/testnet/transaction/<txid>
```

## Optional Step 3: Confirm Payment From The Frontend

After the UI receives a real `402` response and decodes the `payment-required` header, click `Confirm x402 Payment`.

That action calls the backend demo endpoint:

```text
POST /v1/commerce/demo/pay-eta-risk
```

The backend then:

1. loads `AVM_PRIVATE_KEY` server-side
2. recreates the same x402 AVM signer flow used in the Python runbook
3. retries the protected resource request with real payment headers
4. returns paid ETA intelligence only if the retried request actually returns `HTTP 200`

If the response includes a transaction ID, verify it in Lora:

```text
https://lora.algokit.io/testnet/transaction/<txid>
```

If the frontend confirm path fails, capture:

- payer address
- transaction ID if available
- any Lora link
- the exact failure message

You can still paste this evidence into the demo UI's manual evidence panel if needed.

## Expected Successful Response

If the payer account has ALGO, USDC, and a USDC opt-in, and the hosted facilitator is reachable, the client should print:

- `Status: 200`
- The normal ETA risk intelligence response body
- A second independent protected-product proof path for port congestion through the frontend demo payer endpoint

Representative response:

```json
{
  "product": "eta-risk",
  "mock_data": true,
  "generated_at": "2026-06-06T10:00:00Z",
  "confidence": 0.84,
  "evidence": [
    {
      "source": "mock-ais",
      "statement": "Promised ETA differs from the realistic ETA by 3 day(s)."
    }
  ],
  "price": {
    "asset": "USDC",
    "amount": "0.02",
    "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
  },
  "imo": "9321483",
  "promised_eta": "2026-06-09",
  "realistic_eta": "2026-06-12",
  "risk_level": "high",
  "assessment": "Supplier ETA appears unrealistic relative to the vessel's current progress."
}
```

## Known Blockers And Uncertainties

- This runbook depends on the hosted facilitator at `https://facilitator.goplausible.xyz` being reachable and healthy
- The repo's default x402 tests mock facilitator behavior; this runbook is the first real network-backed execution path
- Both accounts must be funded and USDC-opted-in before the demo; the payer must hold spendable TestNet USDC
- The current server route metadata uses a relative resource path for ETA risk; if the live facilitator or client proves to require an absolute URL, that will need a small Milestone 3 code adjustment before the demo can be considered production-ready
- Quantoz EURQ and EURD remain out of scope for this first live TestNet demo; the official x402 path here is TestNet USDC

## References

- Algorand x402 overview: [https://dev.algorand.co/resources/x402-on-algorand/](https://dev.algorand.co/resources/x402-on-algorand/)
- Algorand TestNet funding: [https://dev.algorand.co/concepts/accounts/funding/](https://dev.algorand.co/concepts/accounts/funding/)
- Circle faucet: [https://faucet.circle.com/](https://faucet.circle.com/)
- Circle USDC addresses: [https://developers.circle.com/stablecoins/usdc-contract-addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)
- Local MarineAgent x402 resources: `skills/skills/algorand-agent-skills/` and `docs/HACKATHON_RESOURCES.md`
