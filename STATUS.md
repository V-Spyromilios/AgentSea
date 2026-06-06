# STATUS.md

- Current milestone: Demo Frontend Milestone
- Implemented functionality: FastAPI app scaffold, root metadata endpoint, health check, vessel status intelligence, ETA risk intelligence, port congestion intelligence, departure verification intelligence, official `x402-avm[fastapi,avm]` payment enforcement for `GET /v1/vessels/{imo}/eta-risk`, centralized dotenv-backed configuration in `app/core/config.py`, committed `.env.example`, OpenAPI 402 documentation for ETA risk, pytest coverage for disabled, unpaid, paid-mocked, and unprotected-route scenarios, a Milestone 3 TestNet demo runbook in `docs/TESTNET_DEMO.md`, and a small Vite/React Hamburg Cargo frontend demo in `frontend/` that displays decoded x402 payment header evidence.
- Mocked functionality: AIS vessel data, port congestion metrics, intelligence evidence, and facilitator/network behavior in default x402 tests.
- Missing functionality: Real AIS integration, execution of the live funded TestNet end-to-end payment demo, a browser-native real payment path, broader endpoint protection, payment observability, authentication, persistence, and production deployment concerns.
- Immediate recommendation: Run the frontend demo against the local backend for the pitch story, then execute `docs/TESTNET_DEMO.md` with funded TestNet accounts to replace the demo-only unlock with a real paid flow.
