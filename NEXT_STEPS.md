# NEXT_STEPS.md

- Current milestone: Milestone 1 Foundation
- Completed capabilities: Mock intelligence endpoints, AIS abstraction, commerce/x402 stubs, OpenAPI examples, tests, and project operating docs.
- Immediate next recommendation: Milestone 2 is real x402 payment enforcement on Algorand using the official starter template and facilitator.
- Restart guidance: Start in `app/features/commerce/` and add real x402 verification as a boundary layer, then preserve the existing feature services as payment-agnostic domain logic.
- Future roadmap: Add real AIS ingestion, add facilitator-backed payment verification, add richer evidence modeling, add persistence for audits and metering, then introduce customer authentication only when the commercial flow is stable.
