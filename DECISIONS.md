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
