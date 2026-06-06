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

Milestone 2 uses the official `x402-avm[fastapi,avm]` Python package, pinned to version `2.0.2`, instead of a custom payment protocol implementation. This keeps AgentSea aligned with the published Algorand x402 flow and avoids inventing facilitator behavior.

## Decision 7: Protect Only ETA Risk First

Only `GET /v1/vessels/{imo}/eta-risk` is payment-gated in Milestone 2. This keeps the rollout narrow, limits failure blast radius, and preserves the other intelligence endpoints as free development and demo surfaces.

## Decision 8: Keep ETA Risk Business Logic Payment-Agnostic

The ETA risk router and service remain responsible only for intelligence generation. x402 verification runs in commerce middleware before the route handler executes, so the business service does not know whether a request was paid.
