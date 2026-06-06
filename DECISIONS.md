# DECISIONS.md

## Decision 1: Vertical Slice Architecture

The project is organized by feature under `app/features/` so each intelligence product can evolve independently without a large shared service layer.

## Decision 2: Thin Routers, Services Own Logic

FastAPI routers only map HTTP requests to service calls. Business logic lives in `service.py` to keep testing simple and future payment enforcement separate from domain reasoning.

## Decision 3: AIS Provider Abstraction From Day One

An `AISProvider` interface is included immediately even though only mock data exists today. This protects future AIS vendor swaps from leaking into routes or intelligence logic.

## Decision 4: No Database In Milestone 1

The milestone uses in-memory mock records to optimize for speed, clarity, and demo readiness. Persistence can wait until the commercial and domain flows stabilize.

## Decision 5: Commerce Is Informational Only

Responses include price metadata now, but business services do not enforce payment. This preserves a clean upgrade path to real x402 middleware or dependency enforcement in the next milestone.

## Decision 6: Use Official x402-avm Middleware for Milestone 2

Milestone 2 uses the official `x402-avm[fastapi,avm]` Python package, pinned to version `2.0.2`, instead of a custom payment protocol implementation. This keeps MarineAgent aligned with the published Algorand x402 flow and avoids inventing facilitator behavior.

## Decision 7: Protect Only ETA Risk First

Only `GET /v1/vessels/{imo}/eta-risk` is payment-gated in Milestone 2. This keeps the rollout narrow, limits failure blast radius, and preserves the other intelligence endpoints as free development and demo surfaces.

## Decision 8: Keep ETA Risk Business Logic Payment-Agnostic

The ETA risk router and service remain responsible only for intelligence generation. x402 verification runs in commerce middleware before the route handler executes, so the business service does not know whether a request was paid.

## Decision 9: Use The Official TestNet USDC Path For The First Live Demo

The first real end-to-end MarineAgent x402 demo should follow the official Algorand TestNet path with the hosted facilitator and TestNet USDC rather than introducing a custom asset flow early. This keeps Milestone 3 aligned with the verified x402 references already checked into the repo and reduces uncertainty before any later Quantoz-specific work.

## Decision 10: Centralize Environment Loading In app/core/config.py

Application configuration is now loaded from one place through Pydantic settings with `.env` support. Commerce code reads typed config objects instead of calling `os.getenv()` directly, which improves local developer setup and keeps TestNet demo configuration consistent across the app and documentation.

## Decision 11: Keep The Frontend Demo Thin And Honest

The Hamburg Cargo frontend is a small single-page Vite/React demo layered on top of the existing backend. It may show a clearly labelled demo-only unlocked intelligence preview after a real `402` response, but it must not fake payment verification or imply that a browser click completed an Algorand settlement.

## Decision 12: Allow Backend Demo Payer Custody Only For The Hackathon Demo

MarineAgent now includes a demo-only backend payment confirmation endpoint that uses `AVM_PRIVATE_KEY` server-side to act as Hamburg Cargo's demo agent wallet. This keeps the real x402 settlement flow available from the frontend without exposing private keys to the browser, but it is explicitly not the production custody model. Production should move to agent-side signing, wallet delegation, or policy-limited spending authorization.

## Decision 13: Keep Agent Actions Draft-And-Approve Only

Warehouse email actions are downstream operational drafts produced from paid ETA intelligence. For the hackathon demo, MarineAgent may generate those drafts and record demo-local approval state, but it does not send real email. Human approval is mandatory, and any final send remains manual outside the product.

## Decision 14: Use Deterministic Supplier Claim Extraction For The Hackathon Demo

Supplier message extraction now uses deterministic parsing for IMO, route, and promised ETA before the paid ETA-risk flow begins. This keeps the live x402 demo reliable without introducing an OpenAI dependency that could fail at pitch time, while preserving a clean future path to optional structured LLM extraction behind the same service boundary.

## Decision 15: Add Port Congestion As A Second Independent Paid Product

MarineAgent now protects `GET /v1/ports/{port_code}/congestion` with the same official x402 middleware boundary used for ETA risk, but keeps the frontend purchase flow independent and manual-confirm only. This proves the product is a marketplace for multiple maritime intelligence products without coupling port congestion state to the ETA workflow or expanding whitelist complexity prematurely.
