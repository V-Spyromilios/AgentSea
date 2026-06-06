import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_AGENTSEA_API_BASE_URL ?? "http://127.0.0.1:8000";
const ETA_RISK_PATH =
  "/v1/vessels/9321483/eta-risk?promised_eta=2026-06-09";
const ETA_RISK_URL = `${API_BASE_URL}${ETA_RISK_PATH}`;
const DEMO_PAYMENT_URL = `${API_BASE_URL}/v1/commerce/demo/pay-eta-risk`;
const ALGOD_TESTNET_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const TESTNET_USDC_ASSET_ID = "10458941";
const WHITELIST_STORAGE_KEY = "marineagent_x402_whitelisted";

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

type SettleResponse = {
  success: boolean;
  errorReason?: string | null;
  errorMessage?: string | null;
  payer?: string | null;
  transaction: string;
  network: string;
};

type ManualEvidence = {
  payerAddress: string;
  transactionId: string;
  settlementGroupId: string;
  loraUrl: string;
  paymentErrorMessage: string;
};

type PaymentMode = "manual_confirm" | "whitelist_auto_pay";

type DemoPaymentEvidence = {
  network: string;
  asset_id: string;
  amount: string;
  asset_label: string;
  transaction_id: string | null;
  group_id: string | null;
  lora_url: string | null;
  raw_payment_response_header: string | null;
  note: string | null;
};

type DemoPaymentDebugEvidence = {
  retry_status_code: number | null;
  retry_body: string | null;
  retry_payment_required_header_present: boolean;
  retry_payment_required_header_preview: string | null;
  decoded_retry_payment_required: Record<string, unknown> | null;
  payment_response_header_present: boolean;
  payment_response_header_preview: string | null;
};

type DemoPaymentResponse = {
  paid: boolean;
  status_code: number;
  payer_address: string | null;
  resource_url: string;
  mode: PaymentMode;
  intelligence: IntelligenceResponse | null;
  error?: string | null;
  payment_evidence: DemoPaymentEvidence;
  debug_evidence?: DemoPaymentDebugEvidence | null;
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
  | {
      kind: "paying";
      statusCode: number;
      headerPresent: boolean;
      rawHeaderValue: string | null;
      paymentRequired: PaymentRequired | null;
      mode: PaymentMode;
    }
  | {
      kind: "payment_failed";
      statusCode: number;
      headerPresent: boolean;
      rawHeaderValue: string | null;
      paymentRequired: PaymentRequired | null;
      mode: PaymentMode;
      paymentFailure: DemoPaymentResponse;
    }
  | {
      kind: "live";
      result: IntelligenceResponse;
      rawSettleHeaderValue: string | null;
      settleResponse: SettleResponse | null;
      demoPayment: DemoPaymentResponse | null;
    }
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

const KNOWN_FAILURE_EXAMPLE =
  "asset 10458941 missing from OBTH43WN4M3HRNKVX5PCUW3B3MQA7WW7ISQT5VU6W6CIMNU4PX7I5H4IJA";

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

function decodePaymentResponse(headerValue: string | null): SettleResponse | null {
  if (!headerValue) {
    return null;
  }

  try {
    const decoded = atob(headerValue);
    return JSON.parse(decoded) as SettleResponse;
  } catch {
    return null;
  }
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function formatNetwork(network: string, genesisId?: string): string {
  if (network === ALGOD_TESTNET_CAIP2) {
    return "Algorand TestNet";
  }
  if (genesisId === "testnet-v1.0") {
    return "Algorand TestNet";
  }
  if (network.startsWith("algorand:")) {
    return "Algorand TestNet";
  }
  return network;
}

function formatAssetCode(asset: string): string {
  if (asset === TESTNET_USDC_ASSET_ID) {
    return "USDC";
  }
  return asset;
}

function formatAssetName(asset: string): string {
  if (asset === TESTNET_USDC_ASSET_ID) {
    return "TestNet USDC";
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

function previewJson(value: unknown): string {
  if (!value) {
    return "not present";
  }

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= 160) {
      return serialized;
    }
    return `${serialized.slice(0, 160)}...`;
  } catch {
    return "unavailable";
  }
}

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function buildLoraTransactionUrl(
  transactionId: string | null,
  explicitUrl: string | null,
): string | null {
  if (explicitUrl) {
    return explicitUrl;
  }
  if (!transactionId) {
    return null;
  }
  return `https://lora.algokit.io/testnet/transaction/${transactionId}`;
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

function loadWhitelistPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(WHITELIST_STORAGE_KEY) === "true";
}

function paymentRequirementMatchesDemoPolicy(
  paymentRequired: PaymentRequired | null,
): { allowed: boolean; reason: string | null } {
  const accepted = paymentRequired?.accepts?.[0];
  const resourceUrl = paymentRequired?.resource?.url ?? "";

  if (!accepted) {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the payment requirement was incomplete.",
    };
  }

  if (accepted.network !== ALGOD_TESTNET_CAIP2) {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the payment requirement was not on Algorand TestNet.",
    };
  }

  if (accepted.asset !== TESTNET_USDC_ASSET_ID) {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the payment requirement used an unexpected asset.",
    };
  }

  if (accepted.amount !== "20000") {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the payment amount differed from the $0.02 demo policy.",
    };
  }

  if (!accepted.payTo) {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the receiver address was missing.",
    };
  }

  if (!ETA_RISK_URL.includes("/v1/vessels/9321483/eta-risk")) {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the requested resource did not match the ETA risk demo policy.",
    };
  }

  if (
    !resourceUrl.includes("/v1/vessels/{imo}/eta-risk") &&
    !resourceUrl.includes("/v1/vessels/9321483/eta-risk")
  ) {
    return {
      allowed: false,
      reason: "Auto-payment blocked because the decoded resource path did not match the ETA risk paywall.",
    };
  }

  return { allowed: true, reason: null };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string; error?: string };
    if (payload.detail) {
      return payload.detail;
    }
    if (payload.error) {
      return payload.error;
    }
  } catch {
    // fall back to plain text
  }

  const text = await response.text();
  return text || `MarineAgent returned ${response.status}.`;
}

function App() {
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(() =>
    loadWhitelistPreference(),
  );
  const [autoPayMessage, setAutoPayMessage] = useState<string | null>(null);
  const [manualEvidence, setManualEvidence] = useState<ManualEvidence>({
    payerAddress: "",
    transactionId: "",
    settlementGroupId: "",
    loraUrl: "",
    paymentErrorMessage: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      WHITELIST_STORAGE_KEY,
      isWhitelisted ? "true" : "false",
    );
  }, [isWhitelisted]);

  const currentResult = useMemo(() => {
    if (state.kind === "live" || state.kind === "demo") {
      return state.result;
    }
    return null;
  }, [state]);

  const paymentRequired =
    state.kind === "unpaid" ||
    state.kind === "demo" ||
    state.kind === "paying" ||
    state.kind === "payment_failed"
      ? state.paymentRequired
      : null;
  const rawHeaderValue =
    state.kind === "unpaid" ||
    state.kind === "demo" ||
    state.kind === "paying" ||
    state.kind === "payment_failed"
      ? state.rawHeaderValue
      : null;
  const headerPresent =
    state.kind === "unpaid" ||
    state.kind === "demo" ||
    state.kind === "paying" ||
    state.kind === "payment_failed"
      ? state.headerPresent
      : false;
  const statusCode =
    state.kind === "unpaid" ||
    state.kind === "demo" ||
    state.kind === "paying" ||
    state.kind === "payment_failed"
      ? state.statusCode
      : null;
  const liveSettlement = state.kind === "live" ? state.settleResponse : null;
  const liveSettlementHeader =
    state.kind === "live" ? state.rawSettleHeaderValue : null;
  const liveDemoPayment =
    state.kind === "live" ? state.demoPayment : null;

  async function attemptDemoPayment(
    checkpoint: Extract<
      FetchState,
      { kind: "unpaid" } | { kind: "paying" } | { kind: "payment_failed" } | { kind: "demo" }
    >,
    mode: PaymentMode,
  ) {
    setAutoPayMessage(null);
    setState({
      kind: "paying",
      statusCode: checkpoint.statusCode,
      headerPresent: checkpoint.headerPresent,
      rawHeaderValue: checkpoint.rawHeaderValue,
      paymentRequired: checkpoint.paymentRequired,
      mode,
    });

    try {
      const response = await fetch(DEMO_PAYMENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          resource_url: ETA_RISK_URL,
          mode,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        setState({
          kind: "payment_failed",
          statusCode: checkpoint.statusCode,
          headerPresent: checkpoint.headerPresent,
          rawHeaderValue: checkpoint.rawHeaderValue,
          paymentRequired: checkpoint.paymentRequired,
          mode,
          paymentFailure: {
            paid: false,
            status_code: response.status,
            payer_address: null,
            resource_url: ETA_RISK_URL,
            mode,
            intelligence: null,
            error: message,
            payment_evidence: {
              network: "Algorand TestNet",
              asset_id: TESTNET_USDC_ASSET_ID,
              amount: "0.02",
              asset_label: "TestNet USDC",
              transaction_id: null,
              group_id: null,
              lora_url: null,
              raw_payment_response_header: null,
              note: null,
            },
          },
        });
        return;
      }

      const result = (await response.json()) as DemoPaymentResponse;

      if (!result.paid || !result.intelligence) {
        setState({
          kind: "payment_failed",
          statusCode: checkpoint.statusCode,
          headerPresent: checkpoint.headerPresent,
          rawHeaderValue: checkpoint.rawHeaderValue,
          paymentRequired: checkpoint.paymentRequired,
          mode,
          paymentFailure: result,
        });
        return;
      }

      const settleHeader = result.payment_evidence.raw_payment_response_header;
      setState({
        kind: "live",
        result: result.intelligence,
        rawSettleHeaderValue: settleHeader,
        settleResponse: decodePaymentResponse(settleHeader),
        demoPayment: result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown payment network error";
      setState({
        kind: "payment_failed",
        statusCode: checkpoint.statusCode,
        headerPresent: checkpoint.headerPresent,
        rawHeaderValue: checkpoint.rawHeaderValue,
        paymentRequired: checkpoint.paymentRequired,
        mode,
        paymentFailure: {
          paid: false,
          status_code: 500,
          payer_address: null,
          resource_url: ETA_RISK_URL,
          mode,
          intelligence: null,
          error: message,
          payment_evidence: {
            network: "Algorand TestNet",
            asset_id: TESTNET_USDC_ASSET_ID,
            amount: "0.02",
            asset_label: "TestNet USDC",
            transaction_id: null,
            group_id: null,
            lora_url: null,
            raw_payment_response_header: null,
            note: null,
          },
        },
      });
    }
  }

  async function handleBuyIntelligence() {
    setAutoPayMessage(null);
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
        const unpaidState: Extract<FetchState, { kind: "unpaid" }> = {
          kind: "unpaid",
          statusCode: response.status,
          headerPresent: header !== null,
          rawHeaderValue: header,
          paymentRequired: decodePaymentRequired(header),
        };
        setState(unpaidState);

        if (isWhitelisted) {
          const policyCheck = paymentRequirementMatchesDemoPolicy(
            unpaidState.paymentRequired,
          );
          if (!policyCheck.allowed) {
            setAutoPayMessage(policyCheck.reason);
            return;
          }

          setAutoPayMessage(
            "MarineAgent is whitelisted. Attempting auto-confirmed x402 payment for this exact requirement.",
          );
          await attemptDemoPayment(unpaidState, "whitelist_auto_pay");
        }
        return;
      }

      if (!response.ok) {
        setState({
          kind: "error",
          message: `MarineAgent returned ${response.status}.`,
        });
        return;
      }

      const data = (await response.json()) as IntelligenceResponse;
      const settleHeader = response.headers.get("PAYMENT-RESPONSE");
      setState({
        kind: "live",
        result: data,
        rawSettleHeaderValue: settleHeader,
        settleResponse: decodePaymentResponse(settleHeader),
        demoPayment: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown network error";
      setState({
        kind: "error",
        message: `Frontend could not reach MarineAgent: ${message}`,
      });
    }
  }

  function handleWhitelistEnable() {
    setIsWhitelisted(true);
    setAutoPayMessage(
      "MarineAgent whitelisted by Hamburg Cargo agent. Future ETA risk requests can auto-confirm x402 payments when the payment requirement matches the demo policy.",
    );
  }

  function handleWhitelistDisable() {
    setIsWhitelisted(false);
    setAutoPayMessage("MarineAgent whitelist removed for this browser session.");
  }

  async function handleConfirmPayment() {
    if (
      state.kind !== "unpaid" &&
      state.kind !== "payment_failed" &&
      state.kind !== "demo"
    ) {
      return;
    }

    const checkpoint =
      state.kind === "demo"
        ? {
            kind: "demo" as const,
            result: state.result,
            statusCode: state.statusCode,
            headerPresent: state.headerPresent,
            rawHeaderValue: state.rawHeaderValue,
            paymentRequired: state.paymentRequired,
          }
        : state;

    await attemptDemoPayment(checkpoint, "manual_confirm");
  }

  function handleManualEvidenceChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setManualEvidence((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function clearManualEvidence() {
    setManualEvidence({
      payerAddress: "",
      transactionId: "",
      settlementGroupId: "",
      loraUrl: "",
      paymentErrorMessage: "",
    });
  }

  function handleShowDemoResult() {
    setState({
      kind: "demo",
      result: demoResult,
      statusCode:
        state.kind === "unpaid" ||
        state.kind === "paying" ||
        state.kind === "payment_failed"
          ? state.statusCode
          : 402,
      headerPresent:
        state.kind === "unpaid" ||
        state.kind === "paying" ||
        state.kind === "payment_failed"
          ? state.headerPresent
          : true,
      rawHeaderValue:
        state.kind === "unpaid" ||
        state.kind === "paying" ||
        state.kind === "payment_failed"
          ? state.rawHeaderValue
          : null,
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
  const assetCode = formatAssetCode(displayedAccept?.asset ?? TESTNET_USDC_ASSET_ID);
  const assetName = formatAssetName(displayedAccept?.asset ?? TESTNET_USDC_ASSET_ID);
  const timeoutSeconds = displayedAccept?.maxTimeoutSeconds;
  const liveCheckpointReached =
    state.kind === "unpaid" ||
    state.kind === "demo" ||
    state.kind === "paying" ||
    state.kind === "payment_failed";
  const manualFailureMessage = trimOrNull(manualEvidence.paymentErrorMessage);
  const manualPayerAddress = trimOrNull(manualEvidence.payerAddress);
  const manualTransactionId = trimOrNull(manualEvidence.transactionId);
  const manualSettlementGroupId = trimOrNull(manualEvidence.settlementGroupId);
  const manualLoraUrl = buildLoraTransactionUrl(
    manualTransactionId,
    trimOrNull(manualEvidence.loraUrl),
  );
  const hasManualFailure = manualFailureMessage !== null;
  const hasManualSettlement =
    !hasManualFailure && (manualTransactionId !== null || manualLoraUrl !== null);
  const hasLiveSettlement =
    !liveDemoPayment &&
    liveSettlement?.success === true &&
    !!liveSettlement.transaction;
  const failedPayment =
    state.kind === "payment_failed" ? state.paymentFailure : null;
  const failedDebugEvidence = failedPayment?.debug_evidence ?? null;
  const decodedRetryError =
    typeof failedDebugEvidence?.decoded_retry_payment_required?.error === "string"
      ? failedDebugEvidence.decoded_retry_payment_required.error
      : typeof failedDebugEvidence?.decoded_retry_payment_required?.message === "string"
        ? failedDebugEvidence.decoded_retry_payment_required.message
        : typeof failedDebugEvidence?.decoded_retry_payment_required?.reason === "string"
          ? failedDebugEvidence.decoded_retry_payment_required.reason
          : null;
  const canShowDemoPreview =
    liveCheckpointReached || hasManualFailure || hasManualSettlement;
  const effectivePayerAddress =
    manualPayerAddress ??
    failedPayment?.payer_address ??
    liveDemoPayment?.payer_address ??
    liveSettlement?.payer ??
    "OBTH43...H4IJA";

  return (
    <main className="page-shell">
      <div className="background-grid" />
      <section className="hero">
        <p className="eyebrow">Hackathon Demo Story</p>
        <h1>Cargo Operations Agent</h1>
        <p className="hero-copy">
          Cargo operations agent requests ETA risk intelligence from MarineAgent,
          encounters a real x402 payment checkpoint, and receives structured
          maritime intelligence after payment.
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
              ? "Requesting MarineAgent intelligence..."
              : "Request ETA Risk Intelligence"}
          </button>
          <div className="whitelist-panel">
            {!isWhitelisted ? (
              <button
                className="secondary-button whitelist-button"
                onClick={handleWhitelistEnable}
                type="button"
              >
                Whitelist MarineAgent for automatic x402 payments
              </button>
            ) : (
              <>
                <p className="highlight">
                  MarineAgent whitelisted by Hamburg Cargo agent. Future ETA risk
                  requests can auto-confirm x402 payments.
                </p>
                <button
                  className="ghost-button"
                  onClick={handleWhitelistDisable}
                  type="button"
                >
                  Remove whitelist
                </button>
              </>
            )}
            <p className="disclaimer">
              Demo whitelist only. In production this would be policy-based
              agent authorization with spending limits and agent-side signing.
            </p>
            {autoPayMessage && <p className="muted">{autoPayMessage}</p>}
          </div>
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
              MarineAgent is evaluating the request and may return live intelligence
              or an x402 paywall requirement.
            </p>
          )}
          {liveCheckpointReached && (
            <>
              <div className="checkpoint-banner">
                <span className="checkpoint-badge">Real HTTP 402</span>
                <div className="checkpoint-copy">
                  <strong>REAL x402 CHECKPOINT</strong>
                  <p>
                    HTTP 402 Payment Required received from MarineAgent.
                  </p>
                </div>
              </div>
              <p className="highlight">
                payment-required header decoded. No ETA intelligence was released.
              </p>
              <ul className="detail-list evidence-list-compact">
                <li>Status: HTTP {statusCode}</li>
                <li>Scheme: {displayedAccept?.scheme ?? "Unavailable"}</li>
                <li>
                  Network: {formatNetwork(
                    displayedAccept?.network ?? ALGOD_TESTNET_CAIP2,
                    displayedAccept?.extra?.genesisId,
                  )}
                </li>
                <li>Asset: {assetName}</li>
                <li>TestNet Asset ID: {displayedAccept?.asset ?? TESTNET_USDC_ASSET_ID}</li>
                <li>Amount: {humanAmount} {assetCode}</li>
                <li>Receiver: {shortenAddress(displayedAccept?.payTo)}</li>
                <li>
                  Timeout: {timeoutSeconds !== undefined ? `${timeoutSeconds} seconds` : "Not provided"}
                </li>
                <li>
                  Header evidence: {headerPresent ? "payment-required header present" : "header missing"}
                </li>
              </ul>
              <p className="disclaimer">
                MarineAgent did not release ETA intelligence before payment.
              </p>
              {state.kind !== "paying" && (
                <button
                  className="secondary-button"
                  onClick={handleConfirmPayment}
                  type="button"
                >
                  Confirm x402 Payment
                </button>
              )}
              {state.kind === "paying" && (
                <div className="truth-panel">
                  <span className="truth-badge settlement-badge">
                    {state.mode === "whitelist_auto_pay" ? "Auto-pay running" : "Payment in progress"}
                  </span>
                  <h3>Hamburg Cargo agent is authorizing x402 payment...</h3>
                  <p className="truth-copy">
                    The backend demo payer is attempting a real Algorand TestNet
                    settlement for this exact ETA risk requirement.
                  </p>
                </div>
              )}
              <details className="protocol-evidence">
                <summary>Protocol evidence</summary>
                <code className="protocol-line">
                  payment-required: {previewHeader(rawHeaderValue)}
                </code>
              </details>
            </>
          )}
          {failedPayment && (
            <div className="truth-panel failure-panel">
              <span className="truth-badge failure-badge">Payment attempt failed</span>
              <h3>PAYMENT ATTEMPT FAILED</h3>
              <p className="truth-copy">
                The backend demo payer attempted a real x402 payment but did not
                receive a paid intelligence release.
              </p>
              {failedPayment.error && (
                <p className="truth-copy">Reason: {failedPayment.error}</p>
              )}
              <ul className="detail-list evidence-list-compact">
                <li>Payer: {shortenAddress(failedPayment.payer_address ?? undefined)}</li>
                <li>
                  Retry status: HTTP {failedDebugEvidence?.retry_status_code ?? failedPayment.status_code}
                </li>
                {decodedRetryError && <li>Retry x402 error: {decodedRetryError}</li>}
                <li>Required asset: {failedPayment.payment_evidence.asset_id}</li>
                <li>Required asset name: {failedPayment.payment_evidence.asset_label}</li>
                <li>
                  Required amount: {failedPayment.payment_evidence.amount}{" "}
                  {formatAssetCode(failedPayment.payment_evidence.asset_id)}
                </li>
                <li>
                  {failedDebugEvidence?.payment_response_header_present
                    ? "Payment response header was created and sent to MarineAgent."
                    : "Payment response header was not created."}
                </li>
                <li>
                  This is a real payment failure from the current x402/Algorand
                  path, not a mocked UI state.
                </li>
              </ul>
              {(failedDebugEvidence?.decoded_retry_payment_required ||
                failedDebugEvidence?.retry_payment_required_header_present ||
                failedDebugEvidence?.retry_body ||
                failedDebugEvidence?.payment_response_header_present) && (
                <details className="protocol-evidence">
                  <summary>Retry payment-required evidence</summary>
                  {failedDebugEvidence?.decoded_retry_payment_required && (
                    <code className="protocol-line">
                      decoded retry payment-required:{" "}
                      {previewJson(failedDebugEvidence.decoded_retry_payment_required)}
                    </code>
                  )}
                  {failedDebugEvidence?.retry_payment_required_header_present && (
                    <code className="protocol-line">
                      retry payment-required:{" "}
                      {failedDebugEvidence.retry_payment_required_header_preview ?? "present"}
                    </code>
                  )}
                  {failedDebugEvidence?.payment_response_header_present && (
                    <code className="protocol-line">
                      payment-response:{" "}
                      {failedDebugEvidence.payment_response_header_preview ?? "present"}
                    </code>
                  )}
                  {failedDebugEvidence?.retry_body && (
                    <code className="protocol-line">
                      retry body: {failedDebugEvidence.retry_body}
                    </code>
                  )}
                </details>
              )}
            </div>
          )}
          {hasManualFailure && (
            <div className="truth-panel failure-panel">
              <span className="truth-badge failure-badge">Payment attempt failed</span>
              <h3>PAYMENT ATTEMPT FAILED</h3>
              <p className="truth-copy">
                The x402 client attempted payment but Algorand simulation rejected
                the transaction.
              </p>
              <p className="truth-copy">Reason: {manualFailureMessage}</p>
              <ul className="detail-list evidence-list-compact">
                <li>Payer: {shortenAddress(effectivePayerAddress ?? undefined)}</li>
                <li>Required asset: {displayedAccept?.asset ?? TESTNET_USDC_ASSET_ID}</li>
                <li>Required asset name: {assetName}</li>
                <li>Required amount: {humanAmount} {assetCode}</li>
                <li>
                  Likely fix: fund payer with TestNet ALGO, opt into TestNet USDC,
                  and fund payer with TestNet USDC.
                </li>
              </ul>
              <p className="disclaimer truth-note">
                This is a real TestNet validation failure, not a mocked UI state.
              </p>
            </div>
          )}
          {hasLiveSettlement && (
            <div className="truth-panel settlement-panel">
              <span className="truth-badge settlement-badge">Live paid response</span>
              <h3>PAYMENT SETTLED ON ALGORAND TESTNET</h3>
              <ul className="detail-list evidence-list-compact">
                <li>Transaction ID: {liveSettlement?.transaction}</li>
                <li>Settlement verified</li>
                <li>ETA intelligence released</li>
              </ul>
              <a
                className="protocol-link"
                href={buildLoraTransactionUrl(liveSettlement?.transaction ?? null, null) ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                View on Lora TestNet
              </a>
              {liveSettlementHeader && (
                <details className="protocol-evidence">
                  <summary>Settlement protocol evidence</summary>
                  <code className="protocol-line">
                    payment-response: {previewHeader(liveSettlementHeader)}
                  </code>
                </details>
              )}
            </div>
          )}
          {liveDemoPayment?.paid && (
            <div className="truth-panel settlement-panel">
              <span className="truth-badge settlement-badge">Backend demo payer</span>
              <h3>PAYMENT SETTLED ON ALGORAND TESTNET</h3>
              <ul className="detail-list evidence-list-compact">
                <li>Payer: {shortenAddress(liveDemoPayment.payer_address ?? undefined)}</li>
                {liveDemoPayment.payment_evidence.transaction_id && (
                  <li>Transaction ID: {liveDemoPayment.payment_evidence.transaction_id}</li>
                )}
                {liveDemoPayment.payment_evidence.group_id && (
                  <li>Settlement/group ID: {liveDemoPayment.payment_evidence.group_id}</li>
                )}
                <li>Settlement verified</li>
                <li>ETA intelligence released</li>
              </ul>
              {liveDemoPayment.payment_evidence.lora_url && (
                <a
                  className="protocol-link"
                  href={liveDemoPayment.payment_evidence.lora_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Lora TestNet
                </a>
              )}
              {liveDemoPayment.payment_evidence.note && (
                <p className="truth-note">{liveDemoPayment.payment_evidence.note}</p>
              )}
            </div>
          )}
          {hasManualSettlement && (
            <div className="truth-panel settlement-panel">
              <span className="truth-badge settlement-badge">Manual client evidence</span>
              <h3>PAYMENT SETTLED ON ALGORAND TESTNET</h3>
              <ul className="detail-list evidence-list-compact">
                {manualTransactionId && <li>Transaction ID: {manualTransactionId}</li>}
                {manualSettlementGroupId && (
                  <li>Settlement/group ID: {manualSettlementGroupId}</li>
                )}
                <li>Payer: {shortenAddress(effectivePayerAddress ?? undefined)}</li>
              </ul>
              {manualLoraUrl && (
                <a
                  className="protocol-link"
                  href={manualLoraUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Lora TestNet
                </a>
              )}
              <p className="disclaimer truth-note">
                External settlement evidence was pasted from the Python x402 client.
              </p>
            </div>
          )}
          {state.kind === "live" && (
            <ul className="detail-list">
              <li>Real backend intelligence response received.</li>
              <li>Displayed price asset: {currentResult?.price.asset}</li>
              <li>Displayed network: {formatNetwork(currentResult?.price.network ?? "")}</li>
            </ul>
          )}
          <div className="manual-evidence-panel">
            <div className="card-header compact-header">
              <span className="section-tag">Manual demo evidence from Python x402 client</span>
              <button className="ghost-button" onClick={clearManualEvidence} type="button">
                Clear
              </button>
            </div>
            <div className="manual-grid">
              <label className="manual-field">
                <span>Payer address</span>
                <input
                  className="manual-input"
                  name="payerAddress"
                  value={manualEvidence.payerAddress}
                  onChange={handleManualEvidenceChange}
                  placeholder="OBTH43WN4M3HRNKVX5PCUW3B3MQA7WW7ISQT5VU6W6CIMNU4PX7I5H4IJA"
                />
              </label>
              <label className="manual-field">
                <span>Transaction ID</span>
                <input
                  className="manual-input"
                  name="transactionId"
                  value={manualEvidence.transactionId}
                  onChange={handleManualEvidenceChange}
                  placeholder="Paste txid from the Python client"
                />
              </label>
              <label className="manual-field">
                <span>Settlement/group ID</span>
                <input
                  className="manual-input"
                  name="settlementGroupId"
                  value={manualEvidence.settlementGroupId}
                  onChange={handleManualEvidenceChange}
                  placeholder="Optional group or settlement id"
                />
              </label>
              <label className="manual-field">
                <span>Lora URL</span>
                <input
                  className="manual-input"
                  name="loraUrl"
                  value={manualEvidence.loraUrl}
                  onChange={handleManualEvidenceChange}
                  placeholder="https://lora.algokit.io/testnet/transaction/<txid>"
                />
              </label>
            </div>
            <label className="manual-field">
              <span>Payment error message</span>
              <textarea
                className="manual-input manual-textarea"
                name="paymentErrorMessage"
                value={manualEvidence.paymentErrorMessage}
                onChange={handleManualEvidenceChange}
                placeholder={KNOWN_FAILURE_EXAMPLE}
                rows={3}
              />
            </label>
          </div>
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
          {!currentResult &&
            !liveCheckpointReached &&
            !hasManualFailure &&
            !hasManualSettlement && (
            <p className="muted">
              The ETA intelligence panel will populate after a successful live
              response or an explicit demo-only unlock.
            </p>
          )}
          {liveCheckpointReached &&
            state.kind !== "payment_failed" &&
            !hasManualFailure &&
            !hasManualSettlement && (
            <div className="payment-evidence-state">
              <p className="highlight">Payment checkpoint reached.</p>
              <p className="muted">
                Hamburg Cargo agent received a real x402 payment requirement.
                The agent can authorize payment. After payment settlement,
                MarineAgent releases ETA risk intelligence.
              </p>
              {isWhitelisted ? (
                <p className="muted">
                  MarineAgent is currently whitelisted for automatic x402
                  payments, subject to the demo policy guard.
                </p>
              ) : (
                <button className="secondary-button" onClick={handleConfirmPayment}>
                  Confirm x402 Payment
                </button>
              )}
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
          {hasManualFailure && (
            <div className="payment-evidence-state">
              <p className="highlight">Payment attempt failed.</p>
              <p className="muted">
                The x402 client hit a real TestNet validation error before
                settlement completed.
              </p>
              <p className="muted">
                ETA intelligence remains locked until a valid paid HTTP 200
                response is returned.
              </p>
              <button className="secondary-button" onClick={handleShowDemoResult}>
                Show demo-only intelligence preview
              </button>
              <p className="disclaimer">
                Demo preview only. The failure evidence above is real.
              </p>
            </div>
          )}
          {failedPayment && (
            <div className="payment-evidence-state">
              <p className="highlight">Payment attempt failed.</p>
              <p className="muted">
                The backend demo payer did not receive a paid HTTP 200
                intelligence response.
              </p>
              <p className="muted">
                Retry status: HTTP {failedDebugEvidence?.retry_status_code ?? failedPayment.status_code}
              </p>
              {decodedRetryError && (
                <p className="muted">Retry x402 error: {decodedRetryError}</p>
              )}
              {failedPayment.error && (
                <p className="muted">Reason: {failedPayment.error}</p>
              )}
              <p className="muted">
                ETA intelligence remains locked until a valid paid response is
                returned.
              </p>
              <button className="secondary-button" onClick={handleConfirmPayment}>
                Retry x402 Payment
              </button>
              <button className="secondary-button" onClick={handleShowDemoResult}>
                Show demo-only intelligence preview
              </button>
              <p className="disclaimer">
                Demo preview only. The payment failure above is real.
              </p>
            </div>
          )}
          {hasManualSettlement && !hasLiveSettlement && !currentResult && (
            <div className="payment-evidence-state">
              <p className="highlight">External settlement evidence captured.</p>
              <p className="muted">
                A real TestNet payment appears to have settled in the Python
                x402 client, but this browser session has not yet received a
                paid HTTP 200 intelligence response.
              </p>
              <p className="muted">
                ETA intelligence remains locked here until a paid release is
                returned in this session.
              </p>
              <button className="secondary-button" onClick={handleShowDemoResult}>
                Show demo-only intelligence preview
              </button>
              <p className="disclaimer">
                Demo preview only. External settlement evidence is shown above.
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
                    {state.kind === "live"
                      ? "Real paid backend response"
                      : "Demo-only unlocked preview"}
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
