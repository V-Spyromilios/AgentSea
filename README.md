# MarineAgent

MarineAgent is an agent-first maritime decision intelligence API built for the Algorand x402 Agentic Commerce Hackathon.

MarineAgent sells operational maritime decisions to AI agents. Raw AIS data is an input, not the product.

The demo customer is Hamburg Cargo.

## Current Demo Capabilities

- FastAPI backend with vertical slice architecture
- deterministic supplier/exporter message extraction
- structured supplier claim generation
- ETA risk intelligence
- port congestion intelligence
- real HTTP 402 x402 payment requirement
- Algorand TestNet x402 payment confirmation
- two independent x402-protected paid products:
  - ETA Risk Intelligence
  - Port Congestion Intelligence
- paid intelligence released only after valid payment
- frontend demo for Hamburg Cargo
- manual payment approval mode
- trusted auto-pay demo mode for ETA risk with policy guard
- Lora transaction evidence when available
- warehouse email draft generated after paid ETA intelligence
- human approval for email draft
- no real email sending

## What MarineAgent Is Not

- not a ship-tracking website
- not a maritime map
- not a MarineTraffic clone
- not a production wallet custody system
- not using real AIS or port data yet
- not sending real emails

## Architecture Overview

The project uses vertical slice architecture under `app/features/`.

- `health`
- `vessel_status`
- `eta_risk`
- `port_congestion`
- `departure_verification`
- `commerce`
- `message_extraction`
- `agent_actions`

Business logic lives in services. Routers stay thin. Commerce/x402 logic stays inside the commerce feature.

## Quick Start

Backend:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend env file is [frontend/.env.example](/Users/evangelos/Documents/AgentSea/frontend/.env.example:1), and the current frontend variable name is:

```bash
VITE_AGENTSEA_API_BASE_URL=http://127.0.0.1:8000
```

## Environment Configuration

Important backend variables:

- `X402_ENABLED`
- `X402_AVM_ADDRESS`
- `X402_FACILITATOR_URL`
- `X402_NETWORK`
- `X402_ETA_RISK_PRICE_USD`
- `X402_PORT_CONGESTION_PRICE_USD`
- `X402_SYNC_FACILITATOR_ON_START`
- `AVM_PRIVATE_KEY`
- `RESOURCE_URL`

Meaning:

- `X402_ENABLED=false` disables payment gating for local development.
- `X402_AVM_ADDRESS` is the MarineAgent receiver / seller address.
- `AVM_PRIVATE_KEY` is the Hamburg Cargo demo payer / buyer key.
- `AVM_PRIVATE_KEY` is server-side only.
- `RESOURCE_URL` is used by the demo payment endpoint for the ETA-risk protected resource.
- There is no separate configured port-congestion resource URL variable in the current codebase. Port congestion uses its fixed local demo resource internally.

Current root `.env.example` values live in [.env.example](/Users/evangelos/Documents/AgentSea/.env.example:1).

## x402-Protected Products

When `X402_ENABLED=true`, these endpoints are protected:

```http
GET /v1/vessels/{imo}/eta-risk
GET /v1/ports/{port_code}/congestion
```

Unpaid requests return:

- `HTTP 402 Payment Required`
- `payment-required` header

Paid requests return the intelligence response.

Other endpoints are not protected unless explicitly added later.

## Frontend Demo Flow

1. Exporter message is entered.
2. Deterministic parser extracts structured supplier claim.
3. Hamburg Cargo agent requests ETA Risk Intelligence.
4. MarineAgent returns real HTTP 402 x402 payment requirement.
5. User confirms payment, or trusted auto-pay handles matching ETA-risk requests.
6. MarineAgent releases paid ETA risk intelligence after payment.
7. Hamburg Cargo agent drafts a warehouse email.
8. Human approves the draft for manual sending.
9. Separately, the agent can purchase Port Congestion Intelligence through its own x402 flow.

Notes:

- the demo parser is deterministic, not OpenAI-based
- future structured LLM extraction can replace that boundary later
- the warehouse draft is not sent by MarineAgent
- trusted auto-pay is demo-local and policy-guarded

## API Examples

Root:

```bash
curl http://127.0.0.1:8000/
```

Health:

```bash
curl http://127.0.0.1:8000/health
```

Supplier claim extraction:

```bash
curl -X POST http://127.0.0.1:8000/v1/message-extraction/supplier-claim \
  -H "Content-Type: application/json" \
  -d '{
    "imo_hint": "9321483",
    "route_hint": "Asia → Hamburg",
    "message": "Hi Hamburg Cargo team,\n\nHamburg Trader is still expected to arrive in Hamburg by 2026-06-13.\nPlease keep the warehouse slot ready.\n\nIMO: 9321483\nRoute: Asia to Hamburg"
  }'
```

ETA risk unpaid:

```bash
curl -i "http://127.0.0.1:8000/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09"
```

Port congestion unpaid:

```bash
curl -i http://127.0.0.1:8000/v1/ports/DEHAM/congestion
```

Warehouse email draft:

```bash
curl -X POST http://127.0.0.1:8000/v1/agent-actions/warehouse-email-draft \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Hamburg Cargo",
    "warehouse_name": "Hamburg North Warehouse",
    "vessel_name": "Hamburg Trader",
    "imo": "9321483",
    "supplier_promised_eta": "2026-06-09",
    "realistic_eta": "2026-06-12",
    "delay_days": 3,
    "risk_level": "high",
    "recommendation": "Notify warehouse and prepare a fallback receiving slot."
  }'
```

Approve draft:

```bash
curl -X POST http://127.0.0.1:8000/v1/agent-actions/<action_id>/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approved_by": "Hamburg Cargo operator"
  }'
```

## Real TestNet Demo

For the live Algorand TestNet x402 demo, use [docs/TESTNET_DEMO.md](/Users/evangelos/Documents/AgentSea/docs/TESTNET_DEMO.md:1).

That proof chain is:

- payer funded with TestNet ALGO and USDC
- receiver opted into TestNet USDC
- UI shows a real `402`
- confirm payment
- paid intelligence released
- verify transaction in Lora when a transaction id is available

## Current Limitations

- deterministic mock maritime data
- deterministic supplier claim parser
- no real AIS provider yet
- no real port congestion provider yet
- no production wallet custody
- no real email sending
- no database or auth
- TestNet only for the live demo

## Future Real Data Providers

Current demo intelligence uses deterministic mock inputs.

Future adapters may use:

- AIS providers for vessel movement
- maritime route and distance providers
- marine weather and sea-state providers
- Hamburg-specific port-call data such as HVCC Hamburg
- commercial congestion APIs such as Portcast, OceanLook, GoComet
- AIS and port-arrival sources such as VesselFinder, MarineTraffic, or Kpler
- DCSA Port Call compatible feeds

None of these providers are integrated in the current demo.
