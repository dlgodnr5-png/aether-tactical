/**
 * POST /api/payment-webhook/[provider]
 *
 * Stripe / PayPal / Toss webhook 통합 엔드포인트.
 * 각 provider 의 verifyWebhook + parseWebhookEvent 호출 → cookie set 반환.
 *
 * 현재 cookie 는 callback 라우트에서 이미 set 되므로 webhook 은
 * 중복 처리 방지 + 백업/감사 용도. (provider 가 callback 에 도달하지 못한
 * 케이스 — 예: 사용자 브라우저 닫음 — 만 webhook 으로 복구)
 *
 * Stripe 는 callback 이 없으므로 webhook 이 유일한 경로.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/payments/registry";
import { isValidProvider } from "@/lib/payments/detect-locale";
import { tierById } from "@/lib/tiers";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await ctx.params;
  if (!isValidProvider(providerName)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  const provider = getProvider(providerName);

  const rawBody = await req.text();
  const verified = await provider.verifyWebhook(rawBody, req.headers);
  if (!verified) {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  const outcome = await provider.parseWebhookEvent(rawBody);
  if (!outcome || outcome.status !== "succeeded") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const res = NextResponse.json({ received: true, ...outcome });
  if (outcome.product === "unlimited") {
    const tier = tierById("unlimited");
    res.cookies.set("aether_unlocked_km", String(tier?.rangeKm ?? 99999), {
      path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
    });
    res.cookies.set("aether_missile_grant", "100", {
      path: "/", maxAge: 60 * 5, sameSite: "lax",
    });
  } else if (outcome.product === "missile_pack") {
    res.cookies.set("aether_missile_reload", "100", {
      path: "/", maxAge: 60 * 5, sameSite: "lax",
    });
  }
  return res;
}
