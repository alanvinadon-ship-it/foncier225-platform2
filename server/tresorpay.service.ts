/**
 * TrésorPay / TrésorMoney Payment Gateway Service
 * 
 * Banque digitale du Trésor Public de Côte d'Ivoire
 * Agrégateur agréé BCEAO pour le paiement des taxes foncières.
 * 
 * Supports: Orange Money, MTN MoMo, Moov Money, Wave, Carte bancaire
 * 
 * API Reference:
 * - Initialize: POST https://tresorpay.gouv.ci/api/v1/payment/init
 * - Verify: POST https://tresorpay.gouv.ci/api/v1/payment/verify
 * - Webhook: notify_url receives POST with transaction details
 */

const TRESORPAY_BASE_URL = "https://tresorpay.gouv.ci/api/v1";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TresorPayInitParams {
  transactionId: string;
  amount: number;
  currency: string; // XOF
  taxType: string; // liasse_afor, frais_geometre, taxe_immatriculation, frais_dossier
  description: string;
  returnUrl: string;
  notifyUrl: string;
  paymentMethod?: string; // MOBILE_MONEY, CARD, ALL
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  // Metadata spécifique foncier
  dossierReference?: string;
  contribuableId?: string;
}

interface TresorPayInitResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    transaction_id: string;
    payment_token: string;
    payment_url: string;
    expires_at: string;
  };
}

interface TresorPayVerifyResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    transaction_id: string;
    amount: number;
    currency: string;
    status: "SUCCESS" | "FAILED" | "PENDING" | "EXPIRED";
    payment_method: string;
    operator: string; // orange_money, mtn_momo, moov_money, wave, card
    operator_transaction_id: string;
    paid_at: string | null;
    metadata: Record<string, string>;
  };
}

// ─── Configuration Check ────────────────────────────────────────────────────

export function isTresorPayConfigured(): boolean {
  return !!(process.env.TRESORPAY_API_KEY && process.env.TRESORPAY_MERCHANT_ID);
}

// ─── Tax Type Labels ────────────────────────────────────────────────────────

export const TAX_TYPE_LABELS: Record<string, string> = {
  liasse_afor: "Liasse AFOR (Attestation Foncière Rurale)",
  frais_geometre: "Frais de géomètre agréé",
  taxe_immatriculation: "Taxe d'immatriculation foncière",
  frais_dossier: "Frais de dossier",
  other: "Autre frais",
};

// ─── Fee Schedule by Tax Type ───────────────────────────────────────────────

export const TAX_FEE_SCHEDULE: Record<string, { label: string; amount: number; description: string }[]> = {
  liasse_afor: [
    { label: "Liasse AFOR standard", amount: 35000, description: "Formulaires officiels + timbres fiscaux" },
    { label: "Liasse AFOR + frais d'enregistrement", amount: 55000, description: "Liasse + droits d'enregistrement au Trésor" },
  ],
  frais_geometre: [
    { label: "Levé topographique (< 1 ha)", amount: 150000, description: "Terrain résidentiel urbain" },
    { label: "Levé topographique (1-5 ha)", amount: 300000, description: "Terrain agricole ou péri-urbain" },
    { label: "Levé topographique (> 5 ha)", amount: 500000, description: "Grande exploitation rurale" },
    { label: "Bornage contradictoire", amount: 200000, description: "Bornage avec convocation des riverains" },
  ],
  taxe_immatriculation: [
    { label: "Taxe d'immatriculation CF", amount: 200000, description: "Certificat Foncier (rural)" },
    { label: "Taxe d'immatriculation TF", amount: 350000, description: "Titre Foncier (urbain)" },
    { label: "Taxe de mutation", amount: 250000, description: "Transfert de propriété" },
  ],
  frais_dossier: [
    { label: "Frais de dossier standard", amount: 25000, description: "Instruction administrative" },
    { label: "Frais de dossier prioritaire", amount: 50000, description: "Traitement accéléré" },
  ],
};

// ─── Initialize Payment ─────────────────────────────────────────────────────

/**
 * Initialize a payment with TrésorPay
 * Returns paymentToken and paymentUrl for frontend redirect
 */
export async function initTresorPayPayment(params: TresorPayInitParams): Promise<{
  paymentToken: string;
  paymentUrl: string;
  transactionId: string;
  mode: "live" | "sandbox";
  expiresAt: string;
}> {
  if (!isTresorPayConfigured()) {
    // Simulation mode
    const fakeToken = `tpay_sim_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fakeUrl = "";
    return {
      paymentToken: fakeToken,
      paymentUrl: fakeUrl,
      transactionId: params.transactionId,
      mode: "sandbox",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };
  }

  const apiKey = process.env.TRESORPAY_API_KEY!;
  const merchantId = process.env.TRESORPAY_MERCHANT_ID!;

  const body = {
    merchant_id: merchantId,
    transaction_id: params.transactionId,
    amount: params.amount,
    currency: params.currency || "XOF",
    tax_type: params.taxType,
    description: params.description,
    return_url: params.returnUrl,
    notify_url: params.notifyUrl,
    payment_method: params.paymentMethod || "ALL",
    customer: {
      name: params.customerName || "",
      phone: params.customerPhone || "",
      email: params.customerEmail || "",
    },
    metadata: {
      platform: "foncier225",
      dossier_reference: params.dossierReference || "",
      contribuable_id: params.contribuableId || "",
    },
  };

  const response = await fetch(`${TRESORPAY_BASE_URL}/payment/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Merchant-ID": merchantId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TrésorPay init failed (HTTP ${response.status}): ${errorText}`);
  }

  const result: TresorPayInitResponse = await response.json();

  if (!result.success) {
    throw new Error(`TrésorPay init failed: ${result.code} - ${result.message}`);
  }

  return {
    paymentToken: result.data.payment_token,
    paymentUrl: result.data.payment_url,
    transactionId: result.data.transaction_id,
    mode: "live",
    expiresAt: result.data.expires_at,
  };
}

// ─── Verify Payment ─────────────────────────────────────────────────────────

/**
 * Verify a payment status with TrésorPay
 */
export async function verifyTresorPayPayment(transactionId: string): Promise<{
  status: "SUCCESS" | "FAILED" | "PENDING" | "EXPIRED";
  amount: number;
  currency: string;
  paymentMethod: string;
  operator: string;
  operatorTransactionId: string;
  paidAt: string | null;
  metadata: Record<string, string>;
}> {
  if (!isTresorPayConfigured()) {
    // Simulation mode - always return success
    return {
      status: "SUCCESS",
      amount: 0,
      currency: "XOF",
      paymentMethod: "MOBILE_MONEY",
      operator: "orange_money",
      operatorTransactionId: `SIM-TPAY-${Date.now()}`,
      paidAt: new Date().toISOString(),
      metadata: {},
    };
  }

  const apiKey = process.env.TRESORPAY_API_KEY!;
  const merchantId = process.env.TRESORPAY_MERCHANT_ID!;

  const response = await fetch(`${TRESORPAY_BASE_URL}/payment/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Merchant-ID": merchantId,
    },
    body: JSON.stringify({ transaction_id: transactionId }),
  });

  if (!response.ok) {
    throw new Error(`TrésorPay verify failed (HTTP ${response.status})`);
  }

  const result: TresorPayVerifyResponse = await response.json();

  if (!result.success) {
    throw new Error(`TrésorPay verify failed: ${result.code} - ${result.message}`);
  }

  return {
    status: result.data.status,
    amount: result.data.amount,
    currency: result.data.currency,
    paymentMethod: result.data.payment_method,
    operator: result.data.operator,
    operatorTransactionId: result.data.operator_transaction_id,
    paidAt: result.data.paid_at,
    metadata: result.data.metadata,
  };
}

// ─── Map Status ─────────────────────────────────────────────────────────────

/**
 * Map TrésorPay status to internal payment status
 */
export function mapTresorPayStatus(tpStatus: "SUCCESS" | "FAILED" | "PENDING" | "EXPIRED"): "completed" | "failed" | "pending" {
  switch (tpStatus) {
    case "SUCCESS": return "completed";
    case "FAILED": return "failed";
    case "EXPIRED": return "failed";
    case "PENDING": return "pending";
    default: return "pending";
  }
}

// ─── Get Payment Method for TrésorPay ───────────────────────────────────────

export function getTresorPayMethod(method: string): string {
  switch (method) {
    case "orange_money":
    case "mtn_momo":
    case "moov_money":
    case "wave":
      return "MOBILE_MONEY";
    case "card":
      return "CARD";
    default:
      return "ALL";
  }
}
