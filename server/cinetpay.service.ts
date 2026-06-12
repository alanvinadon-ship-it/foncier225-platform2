/**
 * CinetPay Payment Gateway Service
 * 
 * Handles payment initialization, verification, and webhook processing.
 * Falls back to simulation mode if CINETPAY_API_KEY is not configured.
 * 
 * API Reference:
 * - Initialize: POST https://api-checkout.cinetpay.com/v2/payment
 * - Verify: POST https://api-checkout.cinetpay.com/v2/payment/check
 * - Webhook: notify_url receives POST with transaction_id, cpm_site_id, etc.
 */

const CINETPAY_BASE_URL = "https://api-checkout.cinetpay.com/v2";

interface CinetPayInitParams {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  notifyUrl: string;
  channels?: string; // MOBILE_MONEY, CREDIT_CARD, WALLET, ALL
  customerName?: string;
  customerSurname?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface CinetPayInitResponse {
  code: string;
  message: string;
  description: string;
  data: {
    payment_token: string;
    payment_url: string;
  };
}

interface CinetPayVerifyResponse {
  code: string;
  message: string;
  data: {
    amount: string;
    currency: string;
    status: "ACCEPTED" | "REFUSED" | "PENDING";
    payment_method: string;
    description: string;
    metadata: string;
    operator_id: string;
    payment_date: string;
  };
}

// Check if CinetPay is configured
export function isCinetPayConfigured(): boolean {
  return !!(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID);
}

/**
 * Initialize a payment with CinetPay
 * Returns paymentToken and paymentUrl for frontend redirect/popup
 */
export async function initCinetPayPayment(params: CinetPayInitParams): Promise<{
  paymentToken: string;
  paymentUrl: string;
  mode: "live" | "sandbox";
}> {
  if (!isCinetPayConfigured()) {
    // Simulation mode - generate fake token
    const fakeToken = `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return {
      paymentToken: fakeToken,
      paymentUrl: "",
      mode: "sandbox",
    };
  }

  const apiKey = process.env.CINETPAY_API_KEY!;
  const siteId = process.env.CINETPAY_SITE_ID!;

  const body = {
    apikey: apiKey,
    site_id: siteId,
    transaction_id: params.transactionId,
    amount: params.amount,
    currency: params.currency,
    description: params.description,
    return_url: params.returnUrl,
    notify_url: params.notifyUrl,
    channels: params.channels || "ALL",
    customer_name: params.customerName || "",
    customer_surname: params.customerSurname || "",
    customer_email: params.customerEmail || "",
    customer_phone_number: params.customerPhone || "",
    // Metadata
    metadata: JSON.stringify({ platform: "foncier225" }),
  };

  const response = await fetch(`${CINETPAY_BASE_URL}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result: CinetPayInitResponse = await response.json();

  if (result.code !== "201") {
    throw new Error(`CinetPay init failed: ${result.message} - ${result.description}`);
  }

  return {
    paymentToken: result.data.payment_token,
    paymentUrl: result.data.payment_url,
    mode: apiKey.startsWith("sk_test_") ? "sandbox" : "live",
  };
}

/**
 * Verify a payment status with CinetPay
 */
export async function verifyCinetPayPayment(transactionId: string): Promise<{
  status: "ACCEPTED" | "REFUSED" | "PENDING";
  amount: number;
  currency: string;
  paymentMethod: string;
  operatorId: string;
  paymentDate: string;
}> {
  if (!isCinetPayConfigured()) {
    // Simulation mode - always return accepted
    return {
      status: "ACCEPTED",
      amount: 0,
      currency: "XOF",
      paymentMethod: "SIMULATION",
      operatorId: `SIM-${Date.now()}`,
      paymentDate: new Date().toISOString(),
    };
  }

  const apiKey = process.env.CINETPAY_API_KEY!;
  const siteId = process.env.CINETPAY_SITE_ID!;

  const response = await fetch(`${CINETPAY_BASE_URL}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
    }),
  });

  const result: CinetPayVerifyResponse = await response.json();

  if (result.code !== "00") {
    throw new Error(`CinetPay verify failed: ${result.message}`);
  }

  return {
    status: result.data.status,
    amount: parseFloat(result.data.amount),
    currency: result.data.currency,
    paymentMethod: result.data.payment_method,
    operatorId: result.data.operator_id,
    paymentDate: result.data.payment_date,
  };
}

/**
 * Map CinetPay status to internal payment status
 */
export function mapCinetPayStatus(cpStatus: "ACCEPTED" | "REFUSED" | "PENDING"): "completed" | "failed" | "pending" {
  switch (cpStatus) {
    case "ACCEPTED": return "completed";
    case "REFUSED": return "failed";
    case "PENDING": return "pending";
    default: return "pending";
  }
}

/**
 * Get channel string based on payment method
 */
export function getChannelForMethod(method: string): string {
  switch (method) {
    case "orange_money":
    case "mtn_momo":
    case "wave":
      return "MOBILE_MONEY";
    case "card":
      return "CREDIT_CARD";
    case "bank_transfer":
      return "WALLET";
    default:
      return "ALL";
  }
}
