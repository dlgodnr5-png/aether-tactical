/**
 * PayPal provider — Orders API v2 (일회성 결제, NOT Subscriptions API).
 *
 * Sandbox vs Live 는 PAYPAL_MODE env 로 결정. 기본 sandbox.
 *
 * Flow:
 *   1. createPayment → POST /v2/checkout/orders → approve URL 반환
 *   2. 사용자가 approve URL 로 이동 → PayPal 동의 → returnUrl 으로 redirect
 *   3. /api/payment-webhook/paypal 가 PAYMENT.CAPTURE.COMPLETED 이벤트 수신
 *   4. /exchange?checkout=success 가 cookie 읽고 클라이언트 store 갱신
 *
 * Webhook 검증:
 *   PayPal 은 라이브 webhook 검증 API (POST /v1/notifications/verify-webhook-signature)
 *   를 호출해야 함. PAYPAL_WEBHOOK_ID 필수.
 */

import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookOutcome,
} from "../provider-interface";
import { tierById } from "@/lib/tiers";

const PAYPAL_MODE = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
const PAYPAL_BASE = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";

const PRODUCT_LABELS = {
  unlimited: { name: "Aether Tactical UNLIMITED", description: "무한 반경 + 미사일 100발" },
  missile_pack: { name: "Missile Pack ×100", description: "포탄 100발 충전" },
} as const;

interface PayPalAccessToken {
  access_token: string;
  expires_at: number; // ms epoch
}

let cachedToken: PayPalAccessToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token;
  }
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_SECRET missing");
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal token fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export const paypalProvider: PaymentProvider = {
  name: "paypal",

  async createPayment(req: PaymentRequest): Promise<PaymentResponse> {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      return { provider: "paypal", status: "failed", error: "PAYPAL_CLIENT_ID/SECRET missing" };
    }
    const label = PRODUCT_LABELS[req.product];
    const tier = tierById("unlimited");

    try {
      const token = await getAccessToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": req.idempotencyKey,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: req.idempotencyKey,
            description: label.description,
            custom_id: JSON.stringify({
              product: req.product,
              app_id: "aether-tactical",
              tierKm: req.product === "unlimited" ? String(tier?.rangeKm ?? 99999) : "",
            }),
            amount: {
              currency_code: "USD",
              value: req.amountUsd.toFixed(2),
            },
          }],
          application_context: {
            brand_name: "Aether Tactical",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${req.returnOrigin}/api/payment-callback/paypal?product=${req.product}&key=${encodeURIComponent(req.idempotencyKey)}`,
            cancel_url: `${req.returnOrigin}/exchange?checkout=cancel&provider=paypal`,
          },
        }),
      });
      if (!orderRes.ok) {
        const errText = await orderRes.text();
        return { provider: "paypal", status: "failed", error: `PayPal order create: ${orderRes.status} ${errText}` };
      }
      const order = await orderRes.json() as {
        id: string;
        links: { href: string; rel: string; method: string }[];
      };
      const approveLink = order.links.find((l) => l.rel === "approve");
      if (!approveLink) {
        return { provider: "paypal", status: "failed", error: "PayPal approve link missing" };
      }
      return {
        provider: "paypal",
        status: "ok",
        url: approveLink.href,
        sessionId: order.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { provider: "paypal", status: "failed", error: message };
    }
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    if (!PAYPAL_WEBHOOK_ID) {
      // Sandbox 개발 단계에선 검증 없이 통과 (LEARNING-LOG: webhook 미설정 시 dev 차단)
      return process.env.NODE_ENV !== "production";
    }
    try {
      const token = await getAccessToken();
      const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_algo: headers.get("paypal-auth-algo"),
          cert_url: headers.get("paypal-cert-url"),
          transmission_id: headers.get("paypal-transmission-id"),
          transmission_sig: headers.get("paypal-transmission-sig"),
          transmission_time: headers.get("paypal-transmission-time"),
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: JSON.parse(rawBody),
        }),
      });
      if (!verifyRes.ok) return false;
      const data = await verifyRes.json() as { verification_status: string };
      return data.verification_status === "SUCCESS";
    } catch {
      return false;
    }
  },

  async parseWebhookEvent(rawBody: string): Promise<WebhookOutcome | null> {
    let event: { event_type?: string; resource?: Record<string, unknown> };
    try { event = JSON.parse(rawBody); } catch { return null; }
    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED" && event.event_type !== "CHECKOUT.ORDER.APPROVED") {
      return null;
    }
    const resource = event.resource ?? {};
    const customIdRaw = resource["custom_id"] as string | undefined;
    if (!customIdRaw) return null;
    let custom: { product?: string };
    try { custom = JSON.parse(customIdRaw); } catch { return null; }
    if (custom.product !== "unlimited" && custom.product !== "missile_pack") return null;

    const amount = resource["amount"] as { value?: string } | undefined;
    const cents = amount?.value ? Math.round(parseFloat(amount.value) * 100) : 100;
    return {
      product: custom.product,
      paymentId: (resource["id"] as string) ?? "",
      amountCents: cents,
      status: "succeeded",
    };
  },
};
