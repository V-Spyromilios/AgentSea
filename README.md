# AgentSea

AgentSea is an agent-first maritime intelligence API built for the Algorand x402 Agentic Commerce Hackathon.

It is designed around a simple idea: maritime intelligence is the product. Raw AIS data is only an ingredient.

The repo now also includes a small Hamburg Cargo frontend demo in `frontend/` for pitch-day storytelling.

## What This Milestone Includes

- FastAPI backend foundation
- Vertical slice architecture
- Mock AIS provider abstraction
- Mock intelligence products for vessels and ports
- Official `x402-avm` payment enforcement on ETA risk
- Informational pricing fields aligned with the current commerce path
- Automated tests
- Project operating documentation

## Architecture Overview

The project uses vertical slice architecture under `app/features/`.

- `health/` exposes liveness checks
- `vessel_status/` exposes vessel status intelligence and owns the AIS abstraction
- `eta_risk/` compares promised ETA against realistic ETA
- `port_congestion/` returns congestion intelligence from mock port metrics
- `departure_verification/` checks whether a supplier departure claim appears credible
- `commerce/` contains pricing, x402 configuration, and the ETA risk payment boundary

Business logic lives in services. Routers stay thin.

For demo polish, `frontend/` contains a thin Vite + React + TypeScript single-page experience that calls the existing ETA risk endpoint without changing backend business logic.

## x402 Configuration

The ETA risk endpoint can be payment-gated with these environment variables:

```bash
X402_ENABLED=false
X402_AVM_ADDRESS=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz
X402_NETWORK=algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
X402_ETA_RISK_PRICE_USD=0.02
X402_SYNC_FACILITATOR_ON_START=false
```

Notes:

- `X402_ENABLED=false` keeps the entire API in Milestone 1 behavior.
- Only `GET /v1/vessels/{imo}/eta-risk` is protected when enabled.
- The default `X402_AVM_ADDRESS` is a safe local placeholder for unpaid-flow testing. Use a real receiver address for live TestNet verification.

## Installation

Create and activate a Python 3.12+ virtual environment, then install the project plus test dependencies in editable mode:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

## Environment Setup

Create a local `.env` file from the committed example:

```bash
cp .env.example .env
```

AgentSea now loads environment variables from `.env` through the centralized settings module in [app/core/config.py](/Users/evangelos/Documents/AgentSea/app/core/config.py:1).

Replace these values before a real TestNet demo:

- `X402_AVM_ADDRESS` with the receiver account address
- `AVM_PRIVATE_KEY` with the payer's Base64-encoded 64-byte private key

Keep these defaults unless your demo environment requires changes:

- `X402_FACILITATOR_URL`
- `X402_NETWORK`
- `X402_ETA_RISK_PRICE_USD`

Notes:

- The server does not require `AVM_PRIVATE_KEY` to start
- `AVM_PRIVATE_KEY` and `RESOURCE_URL` are demo-client settings, not server-startup settings

## Running

```bash
uvicorn app.main:app --reload
```

The API docs will be available at `http://127.0.0.1:8000/docs`.

### Running With x402 Disabled

```bash
X402_ENABLED=false uvicorn app.main:app --reload
```

All endpoints, including ETA risk, return normal Milestone 1 responses.

### Running With x402 Enabled

```bash
X402_ENABLED=true \
X402_AVM_ADDRESS=YOUR_TESTNET_RECEIVER_ADDRESS \
X402_FACILITATOR_URL=https://facilitator.goplausible.xyz \
X402_NETWORK=algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI= \
X402_ETA_RISK_PRICE_USD=0.02 \
X402_SYNC_FACILITATOR_ON_START=true \
uvicorn app.main:app --reload
```

With x402 enabled:

- Unpaid ETA risk requests return HTTP `402 Payment Required`.
- The response includes a `PAYMENT-REQUIRED` header with the x402 requirements.
- Retried requests with a valid `PAYMENT-SIGNATURE` continue to the existing ETA risk service.
- Other endpoints remain unpaid.

## Frontend Demo

The Hamburg Cargo pitch demo lives in `frontend/`.

Create the frontend env file:

```bash
cp frontend/.env.example frontend/.env
```

Then run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The page will open on Vite's local dev server and call the ETA risk backend using:

```bash
VITE_AGENTSEA_API_BASE_URL=http://127.0.0.1:8000
```

Demo flow:

- The frontend makes a real request to `GET /v1/vessels/9321483/eta-risk?promised_eta=2026-06-09`
- If the backend returns `402`, the UI shows a real paywall state and decoded `PAYMENT-REQUIRED` header evidence
- A separate demo-only button can reveal a clearly labelled preview of the paid intelligence for pitch purposes
- That demo button does not perform payment verification and does not change backend x402 behavior

## Testing

```bash
pytest
```

## Real TestNet Demo Runbook

For the real Milestone 3 Algorand TestNet flow on ETA risk, use [docs/TESTNET_DEMO.md](/Users/evangelos/Documents/AgentSea/docs/TESTNET_DEMO.md:1).

That runbook covers:

- creating payer and receiver accounts
- funding TestNet ALGO
- opting into TestNet USDC
- starting AgentSea with `X402_ENABLED=true`
- confirming the unpaid `402` response
- paying with the Python `x402-avm` client
- receiving the paid ETA risk intelligence response

## curl Examples

Root metadata:

```bash
curl http://127.0.0.1:8000/
```

Health:

```bash
curl http://127.0.0.1:8000/health
```

Vessel status:

```bash
curl http://127.0.0.1:8000/v1/vessels/9321483/status
```

ETA risk:

```bash
curl "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09"
```

ETA risk when x402 is enabled and unpaid:

```bash
curl -i "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09"
```

Port congestion:

```bash
curl http://127.0.0.1:8000/v1/ports/DEHAM/congestion
```

Departure verification:

```bash
curl http://127.0.0.1:8000/v1/vessels/9771940/departure-verification
```

## Sample Responses

ETA risk sample:

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
    "asset": "EURQ",
    "amount": "0.02",
    "network": "algorand-testnet"
  },
  "imo": "9321483",
  "promised_eta": "2026-06-09",
  "realistic_eta": "2026-06-12",
  "risk_level": "high",
  "assessment": "Supplier ETA appears unrealistic relative to the vessel's current progress."
}
```

Departure verification sample:

```json
{
  "product": "departure-verification",
  "mock_data": true,
  "generated_at": "2026-06-06T10:00:00Z",
  "confidence": 0.9,
  "evidence": [
    {
      "source": "mock-ais",
      "statement": "Still berthed in Rotterdam awaiting berth release and customs clearance."
    }
  ],
  "price": {
    "asset": "EURQ",
    "amount": "0.02",
    "network": "algorand-testnet"
  },
  "imo": "9771940",
  "vessel_name": "MV Baltic Beacon",
  "result": "inconsistent",
  "supplier_claim": {
    "claimed_departure_port_code": "NLRTM",
    "claimed_departure_date": "2026-06-05"
  },
  "assessment": "Supplier departure claim conflicts with current vessel state."
}
```

## Hackathon Story

AgentSea demonstrates how an AI agent could buy maritime decision intelligence instead of raw tracking data. Milestone 1 built the backend foundation. Milestone 2 adds a real x402 enforcement boundary on the ETA risk product without coupling payment checks to the intelligence services.
