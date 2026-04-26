/**
 * Toss Payments provider — 일회성 결제 (KRW 전용).
 *
 * Flow:
 *   1. createPayment → server 가 idempotencyKey + amount 검증 → clientPayload 반환
 *   2. 클라이언트가 @tosspayments/payment-sdk requestPayment("카드", {...}) 호출
 *   3. Toss 결제창 → 사용자 카드 입력 → successUrl 으로 redirect
 *   4. /api/payment-callback/toss?paymentKey=&orderId=&amount= → 서버 confirm 호출
 *   5. confirm 응답 ok → cookie set + redirect /exchange?checkout=success
 *
 * USD → KRW 환산 단순화: $1 = ₩1,500 고정 (배포 전 환율 API 또는 사용자 결정).
 *
 * Webhook 검증:
 *   Toss webhook 은 IP allowlist 기반 (서명 X). dev 환경에선 통과,
 *   prod 에선 IP 화이트리스트 미들웨어 별도 (Vercel edge) — 일단 confirm
 *   자체가 결정적 캡처라 webhook 미사용으로 충분.
 */

import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookOutcome,
} from "../provider-interface";

const USD_TO_KRW = 1500;

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || process.env.TOSS_CLIENT_KEY || "";
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";

const PRODUCT_LABELS = {
  unlimited: "Aether Tactical UNLIMITED + 미사일 100발",
  missile_pack: "포탄 100발 충전",
} as const;

export const tossProvider: PaymentProvider = {
  name: "toss",

  async createPayment(req: PaymentRequest): Promise<PaymentResponse> {
    if (!TOSS_CLIENT_KEY) {
      return { provider: "toss", status: "failed", error: "TOSS_CLIENT_KEY missing" };
    }
    const amountKrw = Math.round(req.amountUsd * USD_TO_KRW);
    const orderName = PRODUCT_LABELS[req.product];
    // orderId 는 영문/숫자/-/_ 만, 6~64자 (Toss 제약)
    const orderId = `aether-${req.product}-${req.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)}`;

    return {
      provider: "toss",
      status: "client_action_required",
      clientPayload: {
        sdk: "toss",
        clientKey: TOSS_CLIENT_KEY,
        method: "카드",
        amount: amountKrw,
        orderId,
        orderName,
        successUrl: `${req.returnOrigin}/api/payment-callback/toss?product=${req.product}&key=${encodeURIComponent(req.idempotencyKey)}`,
        failUrl: `${req.returnOrigin}/exchange?checkout=cancel&provider=toss`,
      },
      sessionId: orderId,
    };
  },

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<boolean> {
    // Toss 는 IP allowlist 방식 — 서명 검증 없음. dev/staging 통과.
    // prod: Vercel/Cloudflare edge 에서 IP 필터링 (별도 미들웨어).
    return true;
  },

  async parseWebhookEvent(rawBody: string): Promise<WebhookOutcome | null> {
    let event: { eventType?: string; data?: Record<string, unknown> };
    try { event = JSON.parse(rawBody); } catch { return null; }
    if (event.eventType !== "PAYMENT_STATUS_CHANGED") return null;
    const data = event.data ?? {};
    const status = data["status"] as string | undefined;
    if (status !== "DONE") return null;
    const orderId = (data["orderId"] as string) || "";
    const product = orderId.startsWith("aether-unlimited-")
      ? "unlimited"
      : orderId.startsWith("aether-missile_pack-")
      ? "missile_pack"
      : null;
    if (!product) return null;
    const totalAmount = (data["totalAmount"] as number) || 0;
    return {
      product,
      paymentId: (data["paymentKey"] as string) || "",
      amountCents: Math.round((totalAmount / USD_TO_KRW) * 100),
      status: "succeeded",
    };
  },
};

/**
 * Server-side confirm — /api/payment-callback/toss 에서 호출.
 * Toss successUrl 도착 시 paymentKey/orderId/amount 받아 실제 capture.
 */
export async function confirmTossPayment(args: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  if (!TOSS_SECRET_KEY) {
    return { ok: false, error: "TOSS_SECRET_KEY missing" };
  }
  try {
    const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "Idempotency-Key": args.orderId,
      },
      body: JSON.stringify({
        paymentKey: args.paymentKey,
        orderId: args.orderId,
        amount: args.amount,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: `Toss confirm: ${res.status} ${JSON.stringify(data)}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
