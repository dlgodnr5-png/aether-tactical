/**
 * GET /api/payment-callback/[provider]
 *
 * 사용자가 PayPal/Toss 결제창에서 승인 후 돌아오는 server-side endpoint.
 * 여기서 실제 capture/confirm 을 수행하고 cookie 를 set 한 뒤
 * /exchange?checkout=success 로 redirect.
 *
 * Stripe 는 webhook 단독으로 처리되므로 이 라우트는 paypal/toss 만 사용.
 *
 * Query:
 *   product   = "unlimited" | "missile_pack"
 *   key       = idempotencyKey (중복 처리 방지)
 *
 *   PayPal: token=<orderId>, PayerID=<...>
 *   Toss:   paymentKey=, orderId=, amount=
 */

import { NextRequest, NextResponse } from "next/server";
import { tierById } from "@/lib/tiers";
import { confirmTossPayment } from "@/lib/payments/providers/toss";

export const runtime = "nodejs";

const PAYPAL_MODE = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
const PAYPAL_BASE = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || "";

async function paypalAccessToken(): Promise<string | null> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) return null;
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function setUnlockCookies(res: NextResponse, product: string) {
  if (product === "unlimited") {
    const tier = tierById("unlimited");
    res.cookies.set("aether_unlocked_km", String(tier?.rangeKm ?? 99999), {
      path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
    });
    // 미사일 100발 초기 지급 (클라이언트가 cookie 읽고 store.initializePaid() 호출)
    res.cookies.set("aether_missile_grant", "100", {
      path: "/", maxAge: 60 * 5, sameSite: "lax", // 5분 — 클라가 즉시 소비
    });
  } else if (product === "missile_pack") {
    res.cookies.set("aether_missile_reload", "100", {
      path: "/", maxAge: 60 * 5, sameSite: "lax",
    });
  }
}

function successRedirect(req: NextRequest, product: string, provider: string) {
  const url = new URL(`/exchange?checkout=success&product=${product}&provider=${provider}`, req.nextUrl.origin);
  const res = NextResponse.redirect(url);
  setUnlockCookies(res, product);
  return res;
}

function failRedirect(req: NextRequest, provider: string, reason: string) {
  const url = new URL(`/exchange?checkout=cancel&provider=${provider}&reason=${encodeURIComponent(reason)}`, req.nextUrl.origin);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const product = sp.get("product") ?? "";
  if (product !== "unlimited" && product !== "missile_pack") {
    return failRedirect(req, provider, "invalid_product");
  }

  if (provider === "paypal") {
    const orderId = sp.get("token");
    if (!orderId) return failRedirect(req, "paypal", "missing_token");
    const token = await paypalAccessToken();
    if (!token) return failRedirect(req, "paypal", "paypal_auth_failed");
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!captureRes.ok) {
      const errText = await captureRes.text();
      return failRedirect(req, "paypal", `capture_${captureRes.status}_${errText.slice(0, 80)}`);
    }
    return successRedirect(req, product, "paypal");
  }

  if (provider === "toss") {
    const paymentKey = sp.get("paymentKey");
    const orderId = sp.get("orderId");
    const amountStr = sp.get("amount");
    if (!paymentKey || !orderId || !amountStr) {
      return failRedirect(req, "toss", "missing_params");
    }
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      return failRedirect(req, "toss", "invalid_amount");
    }
    const result = await confirmTossPayment({ paymentKey, orderId, amount });
    if (!result.ok) {
      return failRedirect(req, "toss", `confirm_${(result.error ?? "").slice(0, 80)}`);
    }
    return successRedirect(req, product, "toss");
  }

  return failRedirect(req, provider, "unknown_provider");
}
