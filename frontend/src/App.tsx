import { useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_AGENTSEA_API_BASE_URL ?? "http://127.0.0.1:8000";
const ETA_RISK_PATH =
  "/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09";
const ETA_RISK_URL = `${API_BASE_URL}${ETA_RISK_PATH}`;
const ALGOD_TESTNET_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const TESTNET_USDC_ASSET_ID = "10458941";

type RiskLevel = "low" | "medium" | "high";

type EvidenceItem = {
  source: string;
  statement: string;
};

type IntelligenceResponse = {
  product: string;
  mock_data: boolean;
  generated_at: string;
  confidence: number;
  evidence: EvidenceItem[];
  price: {
    asset: string;
    amount: string;
    network: string;
  };
  imo: string;
  promised_eta: string;
  realistic_eta: string;
  risk_level: RiskLevel;
  assessment: string;
};

type PaymentAccept = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: {
    decimals?: number;
    genesisId?: string;
  };
};

type PaymentRequired = {
  x402Version?: number;
  accepts: PaymentAccept[];
  error?: string;
  resource?: {
    url: string;
    description?: string;
    mimeType?: string;
  };
};

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "unpaid";
      statusCode: number;
      headerPresent: boolean;
      rawHeaderValue: string | null;
      paymentRequired: PaymentRequired | null;
    }
  | { kind: "live"; result: IntelligenceResponse }
  | {
      kind: "demo";
      result: IntelligenceResponse;
      statusCode: number;
      headerPresent: boolean;
      rawHeaderValue: string | null;
      paymentRequired: PaymentRequired | null;
    }
  | { kind: "error"; message: string };

const demoResult: IntelligenceResponse = {
  product: "eta-risk",
  mock_data: true,
  generated_at: "2026-06-06T10:00:00Z",
  confidence: 0.84,
  evidence: [
    {
      source: "mock-ais",
      statement: "Promised ETA differs from the realistic ETA by 3 day(s).",
    },
    {
      source: "route-context",
      statement: "Asia to Hamburg schedule slack is limited for this vessel call.",
    },
  ],
  price: {
    asset: "USDC",
    amount: "0.02",
    network: ALGOD_TESTNET_CAIP2,
  },
  imo: "9321483",
  promised_eta: "2026-06-09",
  realistic_eta: "2026-06-12",
  risk_level: "high",
  assessment: "Supplier ETA appears unrealistic relative to the vessel's current progress.",
};

function decodePaymentRequired(headerValue: string | null): PaymentRequired | null {
  if (!headerValue) {
    return null;
  }

  try {
    const decoded = atob(headerValue);
    return JSON.parse(decoded) as PaymentRequired;
  } catch {
    return null;
  }
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function formatNetwork(network: string): string {
  if (network === ALGOD_TESTNET_CAIP2) {
    return "Algorand TestNet";
  }
  if (network.startsWith("algorand:")) {
    return "Algorand TestNet";
  }
  return network;
}

function formatAsset(asset: string): string {
  if (asset === TESTNET_USDC_ASSET_ID) {
    return "USDC";
  }
  return asset;
}

function formatAmount(amount: string, decimals?: number, asset?: string): string {
  const parsed = Number(amount);
  const resolvedDecimals =
    decimals ?? (asset === TESTNET_USDC_ASSET_ID ? 6 : undefined);

  if (!Number.isFinite(parsed) || resolvedDecimals === undefined) {
    return amount;
  }

  return (parsed / 10 ** resolvedDecimals).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: resolvedDecimals,
  });
}

function shortenAddress(address: string | undefined): string {
  if (!address) {
    return "Unavailable";
  }
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

function previewHeader(headerValue: string | null): string {
  if (!headerValue) {
    return "not present";
  }
  if (headerValue.length <= 80) {
    return headerValue;
  }
  return `${headerValue.slice(0, 80)}...`;
}

function getDelayDays(result: IntelligenceResponse): number {
  const promised = new Date(result.promised_eta);
  const realistic = new Date(result.realistic_eta);
  const milliseconds = realistic.getTime() - promised.getTime();
  return Math.max(0, Math.round(milliseconds / (1000 * 60 * 60 * 24)));
}

function buildRecommendation(result: IntelligenceResponse): string {
  const delayDays = getDelayDays(result);

  if (result.risk_level === "high") {
    return `Supplier ETA appears unrealistic. Expected delay: ${delayDays} days. Notify the customer and prepare a fallback warehouse slot.`;
  }

  if (result.risk_level === "medium") {
    return `ETA risk is building. Hold a contingency slot and request updated carrier confirmation today.`;
  }

  return "ETA risk looks low. Keep the current inbound plan and continue normal monitoring.";
}

function App() {
  const [state, setState] = useState<FetchState>({ kind: "idle" });

  const currentResult = useMemo(() => {
    if (state.kind === "live" || state.kind === "demo") {
      return state.result;
    }
    return null;
  }, [state]);

  const paymentRequired =
    state.kind === "unpaid" || state.kind === "demo" ? state.paymentRequired : null;
  const rawHeaderValue =
    state.kind === "unpaid" || state.kind === "demo" ? state.rawHeaderValue : null;
  const headerPresent =
    state.kind === "unpaid" || state.kind === "demo" ? state.headerPresent : false;
  const statusCode =
    state.kind === "unpaid" || state.kind === "demo" ? state.statusCode : null;

  async function handleBuyIntelligence() {
    setState({ kind: "loading" });

    try {
      const response = await fetch(ETA_RISK_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 402) {
        const header = response.headers.get("PAYMENT-REQUIRED");
        setState({
          kind: "unpaid",
          statusCode: response.status,
          headerPresent: header !== null,
          rawHeaderValue: header,
          paymentRequired: decodePaymentRequired(header),
        });
        return;
      }

      if (!response.ok) {
        setState({
          kind: "error",
          message: `AgentSea returned ${response.status}.`,
        });
        return;
      }

      const data = (await response.json()) as IntelligenceResponse;
      setState({ kind: "live", result: data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown network error";
      setState({
        kind: "error",
        message: `Frontend could not reach AgentSea: ${message}`,
      });
    }
  }

  function handleShowDemoResult() {
    setState({
      kind: "demo",
      result: demoResult,
      statusCode: state.kind === "unpaid" ? state.statusCode : 402,
      headerPresent: state.kind === "unpaid" ? state.headerPresent : true,
      rawHeaderValue: state.kind === "unpaid" ? state.rawHeaderValue : null,
      paymentRequired,
    });
  }

  const recommendation = currentResult ? buildRecommendation(currentResult) : null;
  const delayDays = currentResult ? getDelayDays(currentResult) : null;
  const displayedAccept = paymentRequired?.accepts?.[0] ?? null;
  const humanAmount = displayedAccept
    ? formatAmount(
        displayedAccept.amount,
        displayedAccept.extra?.decimals,
        displayedAccept.asset,
      )
    : "0.02";
  const assetName = formatAsset(displayedAccept?.asset ?? TESTNET_USDC_ASSET_ID);
  const timeoutSeconds = displayedAccept?.maxTimeoutSeconds;
  const liveCheckpointReached = state.kind === "unpaid" || state.kind === "demo";

  return (
    <main className="page-shell">
      <div className="background-grid" />
      <section className="hero">
        <p className="eyebrow">Algorand x402 Hackathon</p>
        <h1>Cargo Operations Agent</h1>
        <p className="hero-copy">
          Cargo&apos;s operations agent requests ETA risk intelligence
          from AgentSea, encounters a real x402 payment checkpoint, and receives
          structured maritime intelligence after payment.
        </p>
      </section>

      <section className="card-grid">
        <article className="card spotlight">
          <div className="card-header">
            <span className="section-tag">1. Supplier Claim</span>
            <span className="status-pill neutral">Inbound Shipment</span>
          </div>
          <h2>Asia → Hamburg container move</h2>
          <dl className="data-list">
            <div>
              <dt>Vessel IMO</dt>
              <dd>9321483</dd>
            </div>
            <div>
              <dt>Supplier promised ETA</dt>
              <dd>2026-06-09</dd>
            </div>
            <div>
              <dt>Route context</dt>
              <dd>Asia → Hamburg</dd>
            </div>
            <div>
              <dt>Claim</dt>
              <dd>Supplier claims the vessel will arrive by 2026-06-09.</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="section-tag">2. Agent Action</span>
            <span className="status-pill action">Agent Trigger</span>
          </div>
          <h2>Request ETA Risk Intelligence</h2>
          <p className="muted">
            This button calls the live backend endpoint and shows either the real
            ETA response or the real x402 paywall state.
          </p>
          <button
            className="primary-button"
            onClick={handleBuyIntelligence}
            disabled={state.kind === "loading"}
          >
            {state.kind === "loading"
              ? "Requesting AgentSea intelligence..."
              : "Request ETA Risk Intelligence"}
          </button>
          <div className="request-meta">
            <span className="request-label">Live backend endpoint</span>
            <code className="request-line">GET {ETA_RISK_URL}</code>
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="section-tag">3. Payment State</span>
            <span
              className={`status-pill ${
                liveCheckpointReached
                  ? "warn"
                  : state.kind === "live"
                    ? "real"
                    : "neutral"
              }`}
            >
              {liveCheckpointReached
                ? "Live x402 checkpoint"
                : state.kind === "live"
                  ? "Live Access"
                  : "Waiting"}
            </span>
          </div>
          <h2>x402 payment checkpoint</h2>
          {state.kind === "idle" && (
            <p className="muted">
              No request yet. The page is waiting for Hamburg Cargo&apos;s agent
              to request ETA risk intelligence.
            </p>
          )}
          {state.kind === "loading" && (
            <p className="muted">
              AgentSea is evaluating the request and may return live intelligence
              or an x402 paywall requirement.
            </p>
          )}
          {liveCheckpointReached && (
            <>
              <div className="checkpoint-banner">
                <span className="checkpoint-badge">Real HTTP 402</span>
                <div className="checkpoint-copy">
                  <strong>x402 Payment Required</strong>
                  <p>
                    {humanAmount} {assetName} · {formatNetwork(displayedAccept?.network ?? ALGOD_TESTNET_CAIP2)}
                  </p>
                </div>
              </div>
              <p className="highlight">
                payment-required header received from the live backend checkpoint.
              </p>
              <ul className="detail-list evidence-list-compact">
                <li>Status: HTTP {statusCode}</li>
                <li>Scheme: {displayedAccept?.scheme ?? "Unavailable"}</li>
                <li>Network: {formatNetwork(displayedAccept?.network ?? ALGOD_TESTNET_CAIP2)}</li>
                <li>Asset: {assetName}</li>
                <li>TestNet Asset ID: {displayedAccept?.asset ?? TESTNET_USDC_ASSET_ID}</li>
                <li>Amount: {humanAmount} {assetName}</li>
                <li>Pay to: {shortenAddress(displayedAccept?.payTo)}</li>
                <li>
                  Max timeout: {timeoutSeconds !== undefined ? `${timeoutSeconds} seconds` : "Not provided"}
                </li>
                <li>
                  Header evidence: {headerPresent ? "payment-required header present" : "header missing"}
                </li>
              </ul>
              <p className="disclaimer">
                AgentSea did not release ETA intelligence before payment.
              </p>
              <details className="protocol-evidence">
                <summary>Protocol evidence</summary>
                <code className="protocol-line">
                  payment-required: {previewHeader(rawHeaderValue)}
                </code>
              </details>
            </>
          )}
          {state.kind === "live" && (
            <ul className="detail-list">
              <li>Real backend intelligence response received.</li>
              <li>Displayed price asset: {currentResult?.price.asset}</li>
              <li>Displayed network: {formatNetwork(currentResult?.price.network ?? "")}</li>
            </ul>
          )}
          {state.kind === "error" && (
            <p className="error-copy">{state.message}</p>
          )}
        </article>
      </section>

      <section className="result-grid">
        <article className="card intelligence-card">
          <div className="card-header">
            <span className="section-tag">4. Intelligence Result</span>
            <span
              className={`status-pill ${
                state.kind === "live" ? "real" : state.kind === "demo" ? "demo" : "neutral"
              }`}
            >
              {state.kind === "live"
                ? "Live Backend Response"
                : state.kind === "demo"
                  ? "Demo Preview"
                  : "No Result Yet"}
            </span>
          </div>
          <h2>ETA risk intelligence</h2>
          {!currentResult && !liveCheckpointReached && (
            <p className="muted">
              The ETA intelligence panel will populate after a successful live
              response or an explicit demo-only unlock.
            </p>
          )}
          {liveCheckpointReached && (
            <div className="payment-evidence-state">
              <p className="highlight">Payment checkpoint reached.</p>
              <p className="muted">
                The x402 client can now create an Algorand TestNet payment for
                this requirement.
              </p>
              <p className="muted">
                Current live blocker: payer account needs TestNet USDC asset
                funding.
              </p>
              <p className="muted">
                Demo-only intelligence preview is available below for pitch
                continuity.
              </p>
              <button className="secondary-button" onClick={handleShowDemoResult}>
                Show demo-only intelligence preview
              </button>
              <p className="disclaimer">
                Demo preview only. The HTTP 402 x402 checkpoint above is real.
              </p>
            </div>
          )}
          {currentResult && (
            <>
              {state.kind === "demo" && (
                <div className="demo-preview-banner">
                  <span className="checkpoint-badge demo-badge">Demo-only preview</span>
                  <p>
                    Payment evidence above is real. The intelligence below is a
                    pitch continuity preview, not a paid settlement result.
                  </p>
                </div>
              )}
              <div className="metric-row">
                <div className="metric-card">
                  <span>Risk level</span>
                  <strong className={`risk-${currentResult.risk_level}`}>
                    {currentResult.risk_level}
                  </strong>
                </div>
                <div className="metric-card">
                  <span>Realistic ETA</span>
                  <strong>{currentResult.realistic_eta}</strong>
                </div>
                <div className="metric-card">
                  <span>Confidence</span>
                  <strong>{formatConfidence(currentResult.confidence)}</strong>
                </div>
              </div>
              <p className="assessment">{currentResult.assessment}</p>
              <div className="evidence-block">
                <h3>Evidence</h3>
                <ul className="evidence-list">
                  {currentResult.evidence.map((item) => (
                    <li key={`${item.source}-${item.statement}`}>
                      <span>{item.source}</span>
                      <p>{item.statement}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </article>

        <article className="card decision-card">
          <div className="card-header">
            <span className="section-tag">5. Business Decision</span>
            <span className="status-pill action">Operational Output</span>
          </div>
          <h2>Hamburg Cargo recommendation</h2>
          {!recommendation && (
            <p className="muted">
              The operations recommendation appears once the intelligence result is
              available.
            </p>
          )}
          {recommendation && (
            <>
              <p className="decision-copy">{recommendation}</p>
              <div className="decision-meta">
                <span>Expected delay</span>
                <strong>{delayDays} days</strong>
              </div>
              <div className="decision-meta">
                <span>Intelligence source</span>
                <strong>
                  {state.kind === "live" ? "Real backend response" : "Demo-only unlocked preview"}
                </strong>
              </div>
            </>
          )}
        </article>
      </section>
    </main>
  );
}

export default App;
