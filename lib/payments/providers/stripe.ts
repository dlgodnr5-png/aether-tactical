/**
 * Stripe provider — 기존 lib/stripe.ts wrapping.
 *
 * 기존 /api/checkout/route.ts 의 로직을 createPayment 안으로 옮긴 것.
 * webhook 검증/파싱은 기존 /api/stripe-webhook/route.ts 와 동일 패턴.
 */

import { stripe, appUrl } from "@/lib/stripe";
import { tierById } from "@/lib/tiers";
import type {
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookOutcome,
} from "../provider-interface";

const PRODUCT_LABELS = {
  unlimited: {
    name: "Aether Tactical UNLIMITED",
    description: "무한 반경 · 무한 미션 + 미사일 100발",
  },
  missile_pack: {
    name: "Missile Pack ×100",
    description: "포탄 100발 충전 (consumable)",
  },
} as const;

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createPayment(req: PaymentRequest): Promise<PaymentResponse> {
    if (!stripe) {
      return { provider: "stripe", status: "failed", error: "STRIPE_SECRET_KEY missing" };
    }
    const label = PRODUCT_LABELS[req.product];
    const tier = tierById("unlimited");
    const tierKm = req.product === "unlimited" ? String(tier?.rangeKm ?? 99999) : "";

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(req.amountUsd * 100),
            product_data: { name: label.name, description: label.description },
          },
        }],
        success_url: appUrl(`/exchange?checkout=success&product=${req.product}&provider=stripe`, req.returnOrigin),
        cancel_url: appUrl(`/exchange?checkout=cancel&provider=stripe`, req.returnOrigin),
        metadata: {
          product: req.product,
          app_id: "aether-tactical",
          idempotency_key: req.idempotencyKey,
          ...(req.product === "unlimited" ? { tierKm, tierId: "unlimited" } : {}),
        },
        payment_intent_data: {
          metadata: {
            product: req.product,
            app_id: "aether-tactical",
            idempotency_key: req.idempotencyKey,
          },
        },
      });
      return {
        provider: "stripe",
        status: "ok",
        url: session.url ?? undefined,
        sessionId: session.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { provider: "stripe", status: "failed", error: message };
    }
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<boolean> {
    if (!stripe) return false;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return false;
    const sig = headers.get("stripe-signature");
    if (!sig) return false;
    try {
      stripe.webhooks.constructEvent(rawBody, sig, secret);
      return true;
    } catch {
      return false;
    }
  },

  async parseWebhookEvent(rawBody: string): Promise<WebhookOutcome | null> {
    if (!stripe) return null;
    let event: { type: string; data: { object: unknown } };
    try { event = JSON.parse(rawBody); } catch { return null; }

    if (event.type !== "checkout.session.completed" && event.type !== "payment_intent.succeeded") {
      return null;
    }
    const obj = event.data.object as {
      id: string;
      amount_total?: number;
      amount?: number;
      metadata?: { product?: string };
    };
    const product = obj.metadata?.product;
    if (product !== "unlimited" && product !== "missile_pack") return null;

    return {
      product,
      paymentId: obj.id,
      amountCents: obj.amount_total ?? obj.amount ?? 100,
      status: "succeeded",
    };
  },
};
