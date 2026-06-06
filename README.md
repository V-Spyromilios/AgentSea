# AgentSea

AgentSea is an agent-first maritime intelligence API built for the Algorand x402 Agentic Commerce Hackathon.

It is designed around a simple idea: maritime intelligence is the product. Raw AIS data is only an ingredient.

## What This Milestone Includes

- FastAPI backend foundation
- Vertical slice architecture
- Mock AIS provider abstraction
- Mock intelligence products for vessels and ports
- Informational pricing fields for future x402 commerce
- Automated tests
- Project operating documentation

## Architecture Overview

The project uses vertical slice architecture under `app/features/`.

- `health/` exposes liveness checks
- `vessel_status/` exposes vessel status intelligence and owns the AIS abstraction
- `eta_risk/` compares promised ETA against realistic ETA
- `port_congestion/` returns congestion intelligence from mock port metrics
- `departure_verification/` checks whether a supplier departure claim appears credible
- `commerce/` contains pricing and x402-ready extension points without enforcing payment yet

Business logic lives in services. Routers stay thin.

## Installation

Create and activate a Python 3.12+ virtual environment, then install the project plus test dependencies in editable mode:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

## Running

```bash
uvicorn app.main:app --reload
```

The API docs will be available at `http://127.0.0.1:8000/docs`.

## Testing

```bash
pytest
```

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

AgentSea demonstrates how an AI agent could buy maritime decision intelligence instead of raw tracking data. The first milestone focuses on the backend foundation so the next milestone can plug in a real Algorand x402 flow without restructuring the intelligence products themselves.

Milestone 2 is real x402 payment enforcement on Algorand, added as a commerce boundary without coupling payment checks to the intelligence services.
