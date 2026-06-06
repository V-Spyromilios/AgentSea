# AGENTS.md

## Purpose

AgentSea is an agent-first maritime intelligence API. The product is structured decision intelligence for AI agents, not raw AIS coordinates or undigested telemetry.

## Architecture Rules

- Keep the backend Python-only and FastAPI-first.
- Use vertical slice architecture under `app/features/`.
- Keep routers thin and place business logic in `service.py`.
- Shared contracts belong in `app/shared/`; global concerns belong in `app/core/`.
- Favor simple functions and explicit types over frameworks or clever abstractions.

## Vertical Slice Rules

- Each feature owns its router, schemas, and service.
- Add provider modules only when a feature needs an external integration boundary.
- Avoid cross-slice imports unless they represent a stable domain dependency.
- Do not introduce CQRS, repository layers, background workers, or message brokers for this project stage.

## AIS Abstraction Rules

- All vessel intelligence must consume an `AISProvider` abstraction.
- Route handlers and business services must not depend on concrete third-party AIS SDKs.
- `MockAISProvider` is the only provider allowed in this milestone.
- Future AIS providers must be swappable without changing route contracts.

## Commerce Ownership Rules

- Commerce extension points live in `app/features/commerce/`.
- Informational pricing is allowed in responses.
- Payment verification must remain outside business services.
- Milestone 2 protects only `GET /v1/vessels/{imo}/eta-risk` with x402.
- Do not protect other intelligence routes unless the milestone explicitly expands scope.
- Keep x402, facilitator, and Algorand logic isolated in the commerce feature.

## Documentation Maintenance Rules

Future coding agents must update the following files when relevant:

- `STATUS.md` for milestone and capability status.
- `DECISIONS.md` for architecture or product decisions.
- `DOMAIN.md` for domain language and business framing.
- `NEXT_STEPS.md` for restart guidance and roadmap shifts.
- `README.md` for developer-facing setup or API usage changes.

## Official Algorand/x402 Resources

Before implementing anything related to Algorand, x402, AVM, AlgoKit, TestNet, facilitator integration, wallets, or Quantoz payments, coding agents must inspect:

- `skills/skills/algorand-agent-skills/`
- `docs/HACKATHON_RESOURCES.md`

Do not invent x402 or Algorand behavior.

Use official documentation and starter templates as source of truth.

For AgentSea, the next verified commerce flow is:

AI agent request → HTTP 402 payment requirement → Algorand x402 payment → facilitator verification → paid intelligence response.
