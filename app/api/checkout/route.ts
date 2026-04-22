/**
 * POST /api/checkout
 *
 * Body: { tierUsd: number }  // one of 1, 5, 10
 * Response: { url: string }   // Stripe Checkout hosted page URL
 *
 * The webhook at /api/stripe-webhook unlocks the tier on successful payment.
 * For MVP the unlocked tier is encoded into a cookie via webhook (see that
 * route). Later we can mirror to Supabase / a user-scoped store.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  resolveTierLineItem,
  getTierByUsd,
  appUrl,
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured (STRIPE_SECRET_KEY missing)" },
      { status: 503 },
    );
  }

  let body: { tierUsd?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tierUsd = Number(body.tierUsd);
  if (!Number.isFinite(tierUsd) || tierUsd <= 0) {
    return NextResponse.json({ error: "tierUsd required" }, { status: 400 });
  }

  const tier = getTierByUsd(tierUsd);
  if (!tier) {
    return NextResponse.json(
      { error: `Unknown tier: $${tierUsd}` },
      { status: 400 },
    );
  }

  const lineItem = resolveTierLineItem(tier);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: lineItem.quantity,
          ...(lineItem.priceId
            ? { price: lineItem.priceId }
            : { price_data: lineItem.priceData! }),
        },
      ],
      success_url: appUrl(`/exchange?checkout=success&tier=${tier.usd}`),
      cancel_url: appUrl(`/exchange?checkout=cancel`),
      metadata: {
        tierUsd: String(tier.usd),
        tierKm: String(tier.km),
        tierId: tier.id,
      },
      payment_intent_data: {
        metadata: {
          tierUsd: String(tier.usd),
          tierKm: String(tier.km),
        },
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Stripe error: ${message}` },
      { status: 500 },
    );
  }
}
