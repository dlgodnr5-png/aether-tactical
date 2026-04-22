/**
 * Server-side Stripe client and tier price mapping.
 *
 * Prices live in the Stripe Dashboard (or Stripe CLI via `stripe products
 * create`). The `tierUsdToPriceId` map resolves our tier USD amount to the
 * Stripe Price ID configured via environment. Missing configs fall back to
 * inline price_data for the test mode.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY                  — test (sk_test_...) or live (sk_live_...)
 *   STRIPE_WEBHOOK_SECRET              — whsec_... from stripe listen or dashboard
 *   STRIPE_PRICE_TIER_1                — Price ID for $1 (10km)
 *   STRIPE_PRICE_TIER_5                — Price ID for $5 (400km)
 *   STRIPE_PRICE_TIER_10               — Price ID for $10 (1000km)
 *   NEXT_PUBLIC_APP_URL                — absolute URL for success/cancel redirects
 */

import Stripe from "stripe";
import { TIERS, type Tier } from "@/lib/tiers";

const KEY = process.env.STRIPE_SECRET_KEY;

// Module-scoped singleton. Only import from server code.
// Let the SDK default to its bundled apiVersion — avoids brittle string drift
// across Stripe SDK upgrades.
export const stripe: Stripe | null = KEY ? new Stripe(KEY) : null;

/**
 * Minimal checkout line-item shape we need. Kept loose to avoid coupling to
 * Stripe SDK's deep type paths (which have shifted across versions).
 */
export interface CheckoutLineItem {
  priceId?: string;
  priceData?: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; description?: string };
  };
  quantity: number;
}

/** Resolve Stripe Price ID for a tier USD amount, or fall back to inline price. */
export function resolveTierLineItem(tier: Tier): CheckoutLineItem {
  const envKey = `STRIPE_PRICE_TIER_${tier.usd}` as const;
  const priceId = process.env[envKey];
  if (priceId) {
    return { priceId, quantity: 1 };
  }

  // Fallback: inline price (works in test mode without dashboard product setup)
  return {
    priceData: {
      currency: "usd",
      unit_amount: tier.usd * 100,
      product_data: {
        name: `Aether Tactical — ${tier.label} (${tier.km}km)`,
        description: tier.description,
      },
    },
    quantity: 1,
  };
}

export function getTierByUsd(usd: number): Tier | undefined {
  return TIERS.find((t) => t.usd === usd);
}

export function appUrl(path: string = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return base.replace(/\/$/, "") + path;
}
