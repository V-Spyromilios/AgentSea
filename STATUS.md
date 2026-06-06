# STATUS.md

- Current milestone: Milestone 2 x402 Enforcement on ETA Risk
- Implemented functionality: FastAPI app scaffold, root metadata endpoint, health check, vessel status intelligence, ETA risk intelligence, port congestion intelligence, departure verification intelligence, official `x402-avm[fastapi,avm]` payment enforcement for `GET /v1/vessels/{imo}/eta-risk`, centralized dotenv-backed configuration in `app/core/config.py`, committed `.env.example`, OpenAPI 402 documentation for ETA risk, pytest coverage for disabled, unpaid, paid-mocked, and unprotected-route scenarios, and a Milestone 3 TestNet demo runbook in `docs/TESTNET_DEMO.md`.
- Mocked functionality: AIS vessel data, port congestion metrics, intelligence evidence, and facilitator/network behavior in default x402 tests.
- Missing functionality: Real AIS integration, execution of the live funded TestNet end-to-end payment demo, broader endpoint protection, payment observability, authentication, persistence, and production deployment concerns.
- Immediate recommendation: Copy `.env.example` to `.env`, set real TestNet wallet values, then execute `docs/TESTNET_DEMO.md` against the hosted facilitator to confirm the full `402 -> payment -> paid ETA risk response` loop before expanding scope.
