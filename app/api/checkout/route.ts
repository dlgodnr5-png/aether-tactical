/**
 * POST /api/checkout
 *
 * Body:
 *   {
 *     product?: "unlimited" | "missile_pack",  // (legacy: tierUsd 도 받음)
 *     provider?: "stripe" | "paypal" | "toss", // 미지정 시 locale 추천
 *     idempotencyKey?: string,                  // 미지정 시 server 생성
 *   }
 *
 * Response:
 *   { provider, status, url?, clientPayload?, sessionId? }
 *
 * 분기:
 *   - status="ok"                       → 클라가 url 로 redirect
 *   - status="client_action_required"   → 클라가 clientPayload 로 SDK 호출 (Toss)
 *   - status="failed"                   → error 메시지 표시
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getProvider } from "@/lib/payments/registry";
import {
  isValidProvider,
  recommendProviderFromHeaders,
} from "@/lib/payments/detect-locale";
import type {
  PaymentProviderName,
  ProductKind,
} from "@/lib/payments/provider-interface";

export const runtime = "nodejs";

interface CheckoutBody {
  product?: ProductKind;
  provider?: PaymentProviderName;
  idempotencyKey?: string;
  /** legacy 4-tier API */
  tierUsd?: number;
}

export async function POST(req: NextRequest) {
  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // product 결정 (legacy 호환)
  const product: ProductKind | null =
    body.product === "unlimited" || body.product === "missile_pack"
      ? body.product
      : body.tierUsd && body.tierUsd > 0
      ? "unlimited"
      : null;
  if (!product) {
    return NextResponse.json(
      { error: "product required: 'unlimited' or 'missile_pack'" },
      { status: 400 },
    );
  }

  // provider 결정: body 명시 → locale 추천 → stripe 폴백
  const requestedProvider = isValidProvider(body.provider)
    ? body.provider
    : recommendProviderFromHeaders(req.headers);
  const provider = getProvider(requestedProvider);

  const idempotencyKey = body.idempotencyKey || randomUUID();

  const result = await provider.createPayment({
    product,
    amountUsd: 1.0,
    returnOrigin: req.nextUrl.origin,
    idempotencyKey,
  });

  if (result.status === "failed") {
    return NextResponse.json(
      { error: result.error ?? "createPayment failed", provider: result.provider },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
