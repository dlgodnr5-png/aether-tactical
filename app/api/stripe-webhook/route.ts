/**
 * POST /api/stripe-webhook
 *
 * Receives Stripe webhook events. On `checkout.session.completed`, reads the
 * session's metadata (tierKm) and sets a cookie `aether_unlocked_km` that
 * the client reads on next page load to sync the tier store.
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/stripe-webhook
 *   (copy the printed whsec_... into STRIPE_WEBHOOK_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Disable Next.js body parsing — we need the raw body for signature verification
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const tierKm = Number(session.metadata?.tierKm);
    if (Number.isFinite(tierKm) && tierKm > 0) {
      // Set cookie — client picks this up on next navigation and calls
      // useTierStore.getState().unlockTier(tierKm).
      const res = NextResponse.json({ received: true, tierKm });
      res.cookies.set("aether_unlocked_km", String(tierKm), {
        httpOnly: false, // client reads it
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
      });
      return res;
    }
  }

  return NextResponse.json({ received: true });
}
