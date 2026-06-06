# DOMAIN.md

## AgentSea

AgentSea is an agent-first maritime intelligence API. It sells business-ready judgments that help logistics teams and AI agents make better decisions.

## Hamburg Cargo

Hamburg Cargo is the first demo customer. Its AI operations agent buys maritime intelligence from AgentSea to monitor import and export shipments.

## AIS

AIS means Automatic Identification System. It is a vessel tracking signal source. In AgentSea, AIS is an input to reasoning, not the final product.

## ETA Risk

ETA Risk estimates whether a promised arrival date looks realistic. The goal is to flag schedule risk before a supplier delay becomes a business surprise.

## Port Congestion

Port Congestion estimates whether a port is operating smoothly or facing queue pressure, berth pressure, and delays that can affect logistics plans.

## Departure Verification

Departure Verification checks whether a supplier's claim that a vessel has departed appears consistent with the vessel's observed state.

## Agentic Commerce

Agentic Commerce means software agents can discover, buy, and consume API-delivered intelligence products with minimal human intervention.

## x402

x402 is the payment protocol AgentSea now uses for ETA Risk in Milestone 2. An unpaid ETA risk request returns HTTP 402, and a paid request proceeds to the existing intelligence response.

## Algorand

Algorand is the blockchain network used for the current ETA Risk payment enforcement boundary. The full end-to-end TestNet demo still needs funded accounts and facilitator-backed verification in a live run.

## Quantoz

Quantoz EURQ and EURD remain planned assets for future AgentSea commerce flows, but the current official ETA Risk x402 path is aligned with the available Algorand TestNet middleware flow.

## Core Product Principle

Maritime intelligence is the product.

AIS data is not the product.

AgentSea should answer business questions like "Is the ETA credible?" or "Does the departure claim look true?" instead of merely repeating raw vessel telemetry.
