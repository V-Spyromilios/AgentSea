# NEXT_STEPS.md

- Current milestone: Milestone 2 x402 Enforcement on ETA Risk
- Completed capabilities: Mock intelligence endpoints, AIS abstraction, commerce/x402 stubs, official `x402-avm` middleware protection for ETA risk, env-driven commerce config, OpenAPI 402 docs, and tests for disabled, unpaid, paid-mocked, and unprotected routes.
- Immediate next recommendation: Run a real Algorand TestNet end-to-end x402 demo for ETA risk with funded payer and receiver accounts and the hosted facilitator.
- Restart guidance: Start in `app/features/commerce/`, set real `X402_AVM_ADDRESS` and payer credentials in a separate client, verify the hosted facilitator path end-to-end, then preserve the existing ETA risk service as payment-agnostic domain logic.
- Future roadmap: Validate real TestNet settlement, decide whether to keep USDC or move to a Quantoz-backed flow, extend protection to additional intelligence products only after the ETA risk path is stable, then add real AIS ingestion, persistence, and customer-facing access controls.
