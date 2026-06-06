import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_AGENTSEA_API_BASE_URL ?? "http://127.0.0.1:8000";
const DEMO_PAYMENT_URL = `${API_BASE_URL}/v1/commerce/demo/pay-eta-risk`;
const WAREHOUSE_DRAFT_URL = `${API_BASE_URL}/v1/agent-actions/warehouse-email-draft`;
const MESSAGE_EXTRACTION_URL = `${API_BASE_URL}/v1/message-extraction/supplier-claim`;
const ALGOD_TESTNET_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const TESTNET_USDC_ASSET_ID = "10458941";
const WHITELIST_STORAGE_KEY = "marineagent_x402_whitelisted";
const HAMBURG_CARGO_COMPANY = "Hamburg Cargo";
const HAMBURG_WAREHOUSE_NAME = "Hamburg North Warehouse";
const HAMBURG_VESSEL_NAME = "Hamburg Trader";
const DEFAULT_IMO = "9321483";
const DEFAULT_ROUTE_CONTEXT = "Asia → Hamburg";
const DEFAULT_PROMISED_ETA = "2026-06-09";
const DEFAULT_EXPORTER_MESSAGE = `Hi Hamburg Cargo team,

Hamburg Trader is still expected to arrive in Hamburg by 2026-06-09.
Please keep the warehouse slot ready.

IMO: 9321483
Route: Asia to Hamburg`;

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

type SupplierClaim = {
  vesselImo: string;
  routeContext: string;
  supplierPromisedEta: string;
  claimSummary: string;
  confidence: number;
  evidence: {
    source: string;
    summary: string;
  }[];
};

type SupplierClaimExtractionResponse = {
  vessel_imo: string;
  route_context: string;
  supplier_promised_eta: string;
  claim_summary: string;
  confidence: number;
  evidence: {
    source: string;
    summary: string;
  }[];
};

type ExporterMessageForm = {
  vesselImo: string;
  routeContext: string;
  message: string;
};

type AgentActionEvidence = {
  source: string;
  summary: string;
};

type WarehouseEmailDraftResponse = {
  action_id: string;
  action_type: "warehouse_email_draft";
  status: "requires_approval";
  recipient_role: "warehouse";
  recipient_name: string;
  subject: string;
  body: string;
  approval_required: boolean;
  send_status: "not_sent";
  evidence: AgentActionEvidence[];
};

type AgentActionApprovalResponse = {
  action_id: string;
  status: "approved";
  send_status: "not_sent";
  approval_note: string;
  approved_by: string;
};

type DraftActionState =
  | { kind: "idle" }
  | { kind: "drafting" }
  | { kind: "ready"; draft: WarehouseEmailDraftResponse }
  | {
      kind: "approved";
      draft: WarehouseEmailDraftResponse;
      approval: AgentActionApprovalResponse;
    }
  | { kind: "rejected"; draft: WarehouseEmailDraftResponse }
  | { kind: "error"; message: string };

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
      paymentRequired: PaymentRequired | null;
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

function buildEtaRiskUrl(claim: SupplierClaim): string {
  const params = new URLSearchParams({
    promised_eta: claim.supplierPromisedEta,
  });
  return `${API_BASE_URL}/v1/vessels/${claim.vesselImo}/eta-risk?${params.toString()}`;
}

function defaultSupplierClaim(): SupplierClaim {
  return {
    vesselImo: DEFAULT_IMO,
    routeContext: DEFAULT_ROUTE_CONTEXT,
    supplierPromisedEta: DEFAULT_PROMISED_ETA,
    claimSummary: `Supplier claims the vessel will arrive by ${DEFAULT_PROMISED_ETA}.`,
    confidence: 0.9,
    evidence: [
      {
        source: "exporter-message",
        summary: `Message states expected arrival by ${DEFAULT_PROMISED_ETA}.`,
      },
    ],
  };
}

function buildDemoPreviewResult(claim: SupplierClaim): IntelligenceResponse {
  const promised = new Date(claim.supplierPromisedEta);
  const realistic = new Date(promised);
  realistic.setDate(realistic.getDate() + 3);

  return {
    ...demoResult,
    imo: claim.vesselImo,
    promised_eta: claim.supplierPromisedEta,
    realistic_eta: realistic.toISOString().slice(0, 10),
    evidence: [
      {
        source: "mock-ais",
        statement: "Promised ETA differs from the realistic ETA by 3 day(s).",
      },
      {
        source: "route-context",
        statement: `${claim.routeContext} schedule slack is limited for this vessel call.`,
      },
    ],
  };
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

function buildWarehouseAction(result: IntelligenceResponse): string {
  const delayDays = getDelayDays(result);

  if (result.risk_level === "high") {
    return `Notify the warehouse about the likely ${delayDays}-day delay and prepare a fallback receiving slot.`;
  }

  if (result.risk_level === "medium") {
    return "Alert the warehouse to hold a contingency receiving slot until the ETA is reconfirmed.";
  }

  return "Keep the warehouse informed and maintain a flexible receiving slot while normal monitoring continues.";
}

function loadWhitelistPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(WHITELIST_STORAGE_KEY) === "true";
}

function paymentRequirementMatchesDemoPolicy(
  paymentRequired: PaymentRequired | null,
  currentEtaRiskUrl: string,
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

  if (!currentEtaRiskUrl.includes("/v1/vessels/9321483/eta-risk")) {
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
  const [exporterMessage, setExporterMessage] = useState<ExporterMessageForm>({
    vesselImo: DEFAULT_IMO,
    routeContext: DEFAULT_ROUTE_CONTEXT,
    message: DEFAULT_EXPORTER_MESSAGE,
  });
  const [supplierClaim, setSupplierClaim] = useState<SupplierClaim | null>(null);
  const [isExtractingClaim, setIsExtractingClaim] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(() =>
    loadWhitelistPreference(),
  );
  const [draftState, setDraftState] = useState<DraftActionState>({ kind: "idle" });
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

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
  const hasExtractedClaim = supplierClaim !== null;
  const etaRiskUrl = useMemo(
    () => (supplierClaim ? buildEtaRiskUrl(supplierClaim) : ""),
    [supplierClaim],
  );

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
  const livePaymentRequired =
    state.kind === "live" ? state.paymentRequired : null;

  async function attemptDemoPayment(
    checkpoint: Extract<
      FetchState,
      { kind: "unpaid" } | { kind: "paying" } | { kind: "payment_failed" } | { kind: "demo" }
    >,
    mode: PaymentMode,
  ) {
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
          resource_url: etaRiskUrl,
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
            resource_url: etaRiskUrl,
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
        paymentRequired: checkpoint.paymentRequired,
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
          resource_url: etaRiskUrl,
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
    resetActionDraftState();
    setState({ kind: "loading" });

    try {
      const response = await fetch(etaRiskUrl, {
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
            etaRiskUrl,
          );
          if (!policyCheck.allowed) {
            return;
          }

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
        paymentRequired: null,
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
  }

  function handleWhitelistDisable() {
    setIsWhitelisted(false);
  }

  function handleExporterFieldChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setExporterMessage((current) => ({
      ...current,
      [name]: value,
    }));
    setExtractionError(null);
    if (supplierClaim) {
      setSupplierClaim(null);
      resetDownstreamState();
    }
  }

  async function handleExtractSupplierClaim() {
    setIsExtractingClaim(true);
    setExtractionError(null);

    try {
      const response = await fetch(MESSAGE_EXTRACTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          imo_hint: exporterMessage.vesselImo,
          route_hint: exporterMessage.routeContext,
          message: exporterMessage.message,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        setExtractionError(message);
        return;
      }

      const extracted = (await response.json()) as SupplierClaimExtractionResponse;
      setSupplierClaim({
        vesselImo: extracted.vessel_imo,
        routeContext: extracted.route_context,
        supplierPromisedEta: extracted.supplier_promised_eta,
        claimSummary: extracted.claim_summary,
        confidence: extracted.confidence,
        evidence: extracted.evidence,
      });
      resetDownstreamState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown extraction error";
      setExtractionError(message);
    } finally {
      setIsExtractingClaim(false);
    }
  }

  async function handleConfirmPayment() {
    if (!hasExtractedClaim) {
      return;
    }
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

  function handleShowDemoResult() {
    if (!supplierClaim) {
      return;
    }
    resetActionDraftState();
    setState({
      kind: "demo",
      result: buildDemoPreviewResult(supplierClaim),
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

  async function handleDraftWarehouseEmail() {
    if (!currentResult || delayDays === null || !warehouseRecommendation) {
      return;
    }

    setDraftState({ kind: "drafting" });
    setCopyMessage(null);

    try {
      const response = await fetch(WAREHOUSE_DRAFT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          company_name: HAMBURG_CARGO_COMPANY,
          warehouse_name: HAMBURG_WAREHOUSE_NAME,
          vessel_name: HAMBURG_VESSEL_NAME,
          imo: currentResult.imo,
          supplier_promised_eta: currentResult.promised_eta,
          realistic_eta: currentResult.realistic_eta,
          delay_days: delayDays,
          risk_level: currentResult.risk_level,
          recommendation: warehouseRecommendation,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        setDraftState({ kind: "error", message });
        return;
      }

      const draft = (await response.json()) as WarehouseEmailDraftResponse;
      setDraftState({ kind: "ready", draft });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown draft generation error";
      setDraftState({ kind: "error", message });
    }
  }

  async function handleApproveDraft() {
    if (!currentDraft) {
      return;
    }

    setCopyMessage(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/agent-actions/${currentDraft.action_id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            approved_by: "Hamburg Cargo operator",
          }),
        },
      );

      if (!response.ok) {
        const message = await parseErrorMessage(response);
        setDraftState({ kind: "error", message });
        return;
      }

      const approval = (await response.json()) as AgentActionApprovalResponse;
      setDraftState({ kind: "approved", draft: currentDraft, approval });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown approval error";
      setDraftState({ kind: "error", message });
    }
  }

  async function handleCopyEmail() {
    if (!currentDraft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `Subject: ${currentDraft.subject}\n\n${currentDraft.body}`,
      );
      setCopyMessage("Email copied. Send manually from your email client.");
    } catch {
      setCopyMessage(
        "Copy failed in this browser. Select the draft text and copy it manually.",
      );
    }
  }

  function handleRejectDraft() {
    if (!currentDraft) {
      return;
    }

    setDraftState({ kind: "rejected", draft: currentDraft });
    setCopyMessage(null);
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
  const paymentStateAccept =
    displayedAccept ?? livePaymentRequired?.accepts?.[0] ?? null;
  const paymentStateHumanAmount = paymentStateAccept
    ? formatAmount(
        paymentStateAccept.amount,
        paymentStateAccept.extra?.decimals,
        paymentStateAccept.asset,
      )
    : "0.02";
  const paymentStateAssetCode = formatAssetCode(
    paymentStateAccept?.asset ?? TESTNET_USDC_ASSET_ID,
  );
  const paymentStateAssetName = formatAssetName(
    paymentStateAccept?.asset ?? TESTNET_USDC_ASSET_ID,
  );
  const paymentStateReceiver = shortenAddress(paymentStateAccept?.payTo);
  const supplierEvidence = supplierClaim?.evidence[0]?.summary ?? null;
  const warehouseRecommendation = currentResult
    ? buildWarehouseAction(currentResult)
    : null;
  const canDraftWarehouseEmail =
    state.kind === "live" &&
    !!currentResult &&
    (Boolean(liveDemoPayment?.paid) || hasLiveSettlement);
  const currentDraft =
    draftState.kind === "ready" ||
    draftState.kind === "approved" ||
    draftState.kind === "rejected"
      ? draftState.draft
      : null;

  useEffect(() => {
    if (!canDraftWarehouseEmail) {
      setDraftState({ kind: "idle" });
      setCopyMessage(null);
    }
  }, [canDraftWarehouseEmail]);

  function resetActionDraftState() {
    setDraftState({ kind: "idle" });
    setCopyMessage(null);
  }

  function resetDownstreamState() {
    setState({ kind: "idle" });
    resetActionDraftState();
  }

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
            <span className="section-tag">1. Message Exporter</span>
            <span className="status-pill neutral">Inbound Message</span>
          </div>
          <h2>Supplier update received</h2>
          <div className="manual-grid">
            <label className="manual-field">
              <span>Vessel IMO</span>
              <input
                className="manual-input"
                name="vesselImo"
                value={exporterMessage.vesselImo}
                onChange={handleExporterFieldChange}
              />
            </label>
            <label className="manual-field">
              <span>Route context</span>
              <input
                className="manual-input"
                name="routeContext"
                value={exporterMessage.routeContext}
                onChange={handleExporterFieldChange}
              />
            </label>
          </div>
          <label className="manual-field">
            <span>message</span>
            <textarea
              className="manual-input manual-textarea"
              name="message"
              value={exporterMessage.message}
              onChange={handleExporterFieldChange}
              rows={8}
            />
          </label>
          <button
            className="secondary-button"
            onClick={handleExtractSupplierClaim}
            type="button"
            disabled={isExtractingClaim}
          >
            {isExtractingClaim
              ? "MarineAgent is analyzing the message..."
              : "Extract info"}
          </button>
          
          {extractionError && <p className="error-copy">{extractionError}</p>}
        </article>

        <article className="card spotlight">
          <div className="card-header">
            <span className="section-tag">2. Supplier Claim</span>
            <span className={`status-pill ${hasExtractedClaim ? "neutral" : "neutral"}`}>
              {hasExtractedClaim ? "Structured Claim" : "Awaiting Extraction"}
            </span>
          </div>
          {supplierClaim ? (
            <>
              <h2>{supplierClaim.routeContext} container move</h2>
              <dl className="data-list">
                <div>
                  <dt>Vessel IMO</dt>
                  <dd>{supplierClaim.vesselImo}</dd>
                </div>
                <div>
                  <dt>Supplier promised ETA</dt>
                  <dd>{supplierClaim.supplierPromisedEta}</dd>
                </div>
                <div>
                  <dt>Route context</dt>
                  <dd>{supplierClaim.routeContext}</dd>
                </div>
                <div>
                  <dt>Claim</dt>
                  <dd>{supplierClaim.claimSummary}</dd>
                </div>
              </dl>
              {supplierEvidence && (
                <details className="protocol-evidence extraction-evidence">
                  <summary>Extraction evidence</summary>
                  <ul className="detail-list evidence-list-compact">
                    <li>Source: exporter-message</li>
                    <li>{supplierEvidence}</li>
                    <li>Confidence: {formatConfidence(supplierClaim.confidence)}</li>
                  </ul>
                </details>
              )}
            </>
          ) : (
            <div className="payment-empty-state">
              <p className="highlight">Waiting for extraction</p>
              <p className="muted">No structured supplier claim yet.</p>
              <p className="muted">
                Click &quot;Extract supplier claim&quot; to populate this card from the exporter message.
              </p>
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <span className="section-tag">3. Agent Action</span>
            <span className="status-pill action">Agent Trigger</span>
          </div>
          <h2>Request ETA Risk Intelligence</h2>
          <p className="muted">
            {isWhitelisted
              ? "Agent auto-pays x402."
              : "Agent asks before paying."}
          </p>
          <button
            className="primary-button"
            onClick={handleBuyIntelligence}
            disabled={state.kind === "loading" || !hasExtractedClaim}
          >
            {state.kind === "loading"
              ? "Requesting MarineAgent intelligence..."
              : "Request ETA & Risk"}
          </button>
          <div className="whitelist-panel">
            <div className="mode-panel">
              <button
                className={`mode-button ${isWhitelisted ? "active trusted" : "approval"}`}
                onClick={isWhitelisted ? handleWhitelistDisable : handleWhitelistEnable}
                type="button"
              >
                {isWhitelisted ? "Require Approval" : "Trust & auto-pay"}
              </button>
            </div>
          </div>
          <div className="request-meta">
            <span className="request-label">Live backend endpoint</span>
            {hasExtractedClaim ? (
              <code className="request-line">GET {etaRiskUrl}</code>
            ) : (
              <p className="muted">The protected ETA-risk request appears here after extraction.</p>
            )}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="section-tag">4. Payment State</span>
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
            <div className="payment-empty-state">
              <p className="highlight">Waiting for request</p>
              <p className="muted">No payment checkpoint yet.</p>
              <p className="muted">
                The x402 payment requirement will appear here after the agent
                requests ETA risk intelligence.
              </p>
            </div>
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
                  <strong>x402 Payment Required</strong>
                  <p>HTTP 402 checkpoint reached.</p>
                </div>
              </div>
              <p className="highlight">No ETA intelligence was released.</p>
              <ul className="detail-list evidence-list-compact">
                <li>
                  Network: {formatNetwork(
                    paymentStateAccept?.network ?? ALGOD_TESTNET_CAIP2,
                    paymentStateAccept?.extra?.genesisId,
                  )}
                </li>
                <li>Asset: {paymentStateAssetName}</li>
                <li>Amount: {paymentStateHumanAmount} {paymentStateAssetCode}</li>
                <li>Receiver: {paymentStateReceiver}</li>
              </ul>
              {state.kind !== "paying" && (
                <button
                  className="secondary-button"
                  onClick={handleConfirmPayment}
                  type="button"
                >
                  Confirm x402 Payment
                </button>
              )}
              {isWhitelisted && (
                <p className="muted">
                  Whitelist active. Matching ETA risk payment requirements can auto-confirm.
                </p>
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
              <h3>Payment attempt failed</h3>
              <p className="truth-copy">
                Retry status: HTTP {failedDebugEvidence?.retry_status_code ?? failedPayment.status_code}
              </p>
              <p className="truth-copy">
                Reason: {decodedRetryError ?? failedPayment.error ?? "Unknown payment error"}
              </p>
              <ul className="detail-list evidence-list-compact">
                <li>Payer: {shortenAddress(failedPayment.payer_address ?? undefined)}</li>
                <li>
                  Required: {failedPayment.payment_evidence.amount}{" "}
                  {formatAssetCode(failedPayment.payment_evidence.asset_id)}
                </li>
              </ul>
            </div>
          )}
          {hasLiveSettlement && (
            <div className="truth-panel settlement-panel">
              <span className="truth-badge settlement-badge">Live paid response</span>
              <h3>Payment settled</h3>
              <p className="truth-copy">Algorand TestNet x402 payment accepted.</p>
              <p className="truth-copy">ETA intelligence released.</p>
              <ul className="detail-list evidence-list-compact">
                <li>Payer: {shortenAddress(liveSettlement?.payer ?? undefined)}</li>
                <li>Receiver: {paymentStateReceiver}</li>
                <li>Amount: {paymentStateHumanAmount} {paymentStateAssetCode}</li>
                <li>Transaction ID: {liveSettlement?.transaction}</li>
              </ul>
              <a
                className="protocol-link"
                href={buildLoraTransactionUrl(liveSettlement?.transaction ?? null, null) ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                View transaction in Lora
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
              <h3>Payment settled</h3>
              <p className="truth-copy">Algorand TestNet x402 payment accepted.</p>
              <p className="truth-copy">ETA intelligence released.</p>
              <ul className="detail-list evidence-list-compact">
                <li>Payer: {shortenAddress(liveDemoPayment.payer_address ?? undefined)}</li>
                <li>Receiver: {paymentStateReceiver}</li>
                <li>Amount: {paymentStateHumanAmount} {paymentStateAssetCode}</li>
                {liveDemoPayment.payment_evidence.transaction_id && (
                  <li>Transaction ID: {liveDemoPayment.payment_evidence.transaction_id}</li>
                )}
                {liveDemoPayment.payment_evidence.group_id && (
                  <li>Settlement/group ID: {liveDemoPayment.payment_evidence.group_id}</li>
                )}
              </ul>
              {liveDemoPayment.payment_evidence.lora_url && (
                <a
                  className="protocol-link"
                  href={liveDemoPayment.payment_evidence.lora_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction in Lora
                </a>
              )}
              {liveDemoPayment.payment_evidence.note && (
                <p className="truth-note">{liveDemoPayment.payment_evidence.note}</p>
              )}
            </div>
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
            <span className="section-tag">5. Intelligence Result</span>
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
            !liveCheckpointReached && (
            <p className="muted">
              The ETA intelligence panel will populate after a successful live
              response or an explicit demo-only unlock.
            </p>
          )}
          {liveCheckpointReached &&
            state.kind !== "payment_failed" && (
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
            <span className="section-tag">6. Recommended Action</span>
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
              <div className="decision-meta">
                <span>Recommended action</span>
                <strong>{warehouseRecommendation}</strong>
              </div>
              {canDraftWarehouseEmail && (
                <div className="action-draft-panel">
                  <div className="card-header compact-header">
                    <span className="section-tag">Warehouse action draft</span>
                    <span className="status-pill action">Human approval required</span>
                  </div>
                  {draftState.kind === "idle" && (
                    <>
                      <p className="muted">
                        Hamburg Cargo&apos;s agent can now prepare a warehouse notification
                        draft from paid ETA intelligence. A human operator must approve it
                        before manual sending.
                      </p>
                      <button
                        className="secondary-button"
                        onClick={handleDraftWarehouseEmail}
                        type="button"
                      >
                        Draft warehouse email
                      </button>
                    </>
                  )}
                  {draftState.kind === "drafting" && (
                    <p className="muted">
                      Hamburg Cargo agent is drafting a warehouse notification...
                    </p>
                  )}
                  {draftState.kind === "error" && (
                    <p className="error-copy">{draftState.message}</p>
                  )}
                  {currentDraft && (
                    <>
                      <div className="draft-meta">
                        <div className="decision-meta">
                          <span>Status</span>
                          <strong>
                            {draftState.kind === "approved"
                              ? "approved"
                              : draftState.kind === "rejected"
                                ? "rejected"
                                : currentDraft.status}
                          </strong>
                        </div>
                        <div className="decision-meta">
                          <span>Send status</span>
                          <strong>{currentDraft.send_status}</strong>
                        </div>
                      </div>
                      <div className="email-draft-block">
                        <span>Subject</span>
                        <p className="draft-subject">{currentDraft.subject}</p>
                        <span>Body</span>
                        <pre className="draft-body">{currentDraft.body}</pre>
                      </div>
                      <div className="evidence-block draft-evidence-block">
                        <h3>Evidence source</h3>
                        <ul className="evidence-list">
                          {currentDraft.evidence.map((item) => (
                            <li key={`${item.source}-${item.summary}`}>
                              <span>{item.source}</span>
                              <p>{item.summary}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {draftState.kind === "approved" && (
                        <p className="disclaimer success-copy">
                          Approved for manual sending. No email was sent by MarineAgent.
                        </p>
                      )}
                      {draftState.kind === "rejected" && (
                        <p className="error-copy">Draft rejected by operator.</p>
                      )}
                      {copyMessage && <p className="disclaimer">{copyMessage}</p>}
                      <div className="action-button-row">
                        {draftState.kind !== "approved" && (
                          <button
                            className="secondary-button"
                            onClick={handleApproveDraft}
                            type="button"
                          >
                            Approve draft
                          </button>
                        )}
                        <button
                          className="secondary-button"
                          onClick={handleCopyEmail}
                          type="button"
                        >
                          Copy email
                        </button>
                        <button
                          className="ghost-button"
                          onClick={handleRejectDraft}
                          type="button"
                        >
                          Reject draft
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {!canDraftWarehouseEmail && state.kind === "demo" && (
                <p className="disclaimer">
                  Warehouse drafting is disabled for demo-only preview output. A real paid ETA intelligence release is required.
                </p>
              )}
            </>
          )}
        </article>
      </section>
    </main>
  );
}

export default App;
