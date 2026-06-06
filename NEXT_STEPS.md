# NEXT_STEPS.md

- Current milestone: Milestone 2 x402 Enforcement on ETA Risk
- Completed capabilities: Mock intelligence endpoints, AIS abstraction, commerce/x402 stubs, official `x402-avm` middleware protection for ETA risk, centralized dotenv-backed config, committed `.env.example`, OpenAPI 402 docs, tests for disabled, unpaid, paid-mocked, and unprotected routes, and a dedicated live demo runbook in `docs/TESTNET_DEMO.md`.
- Immediate next recommendation: Copy `.env.example` to `.env`, set real TestNet payer and receiver values, then execute `docs/TESTNET_DEMO.md` with the hosted facilitator and TestNet USDC to validate the full paid ETA risk flow.
- Restart guidance: Start in `app/core/config.py` and `.env.example` for configuration, then move to `docs/TESTNET_DEMO.md`, fund payer and receiver accounts, set `X402_SYNC_FACILITATOR_ON_START=true`, run the unpaid curl check first, and finally use the Python x402 client command to confirm the paid path without changing ETA risk business logic.
- Future roadmap: Validate real TestNet settlement, resolve any live facilitator or resource-metadata issues discovered during the demo, decide whether to keep USDC or move to a Quantoz-backed flow, extend protection to additional intelligence products only after the ETA risk path is stable, then add real AIS ingestion, persistence, and customer-facing access controls.
