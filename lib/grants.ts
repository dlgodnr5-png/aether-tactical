/**
 * 사용자 결제 grant 영속화 — Upstash Redis (서버 전용).
 *
 * 키 구조:
 *   aether:grants:{email}       → JSON { tier, missiles, history[] }
 *
 * 환경변수:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * 두 환경변수 모두 비면 in-memory fallback (dev 단독 사용, 재시작 시 소실).
 * production 배포 전 반드시 Upstash 가입 + 환경변수 설정.
 */

import { Redis } from "@upstash/redis";

export interface GrantHistoryEntry {
  at: number;                // ms epoch
  product: "unlimited" | "missile_pack";
  provider: "stripe" | "paypal" | "toss";
  paymentId: string;
  amountCents: number;
}

export interface UserGrants {
  email: string;
  tier: "free" | "unlimited";
  unlockedKm: number;        // tier rangeKm 값
  missiles: number;          // 잔량
  history: GrantHistoryEntry[];
  updatedAt: number;
}

const URL = process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

const redis = (URL && TOKEN) ? new Redis({ url: URL, token: TOKEN }) : null;

// in-memory fallback (Upstash 미설정 시 dev 한정)
const memStore = new Map<string, UserGrants>();

const FREE_DEFAULT: Omit<UserGrants, "email"> = {
  tier: "free",
  unlockedKm: 5,
  missiles: 5,
  history: [],
  updatedAt: 0,
};

function key(email: string): string {
  return `aether:grants:${email.toLowerCase()}`;
}

export async function getGrants(email: string): Promise<UserGrants> {
  if (redis) {
    const raw = await redis.get<UserGrants>(key(email));
    if (raw) return raw;
  } else {
    const cached = memStore.get(email.toLowerCase());
    if (cached) return cached;
  }
  return { email, ...FREE_DEFAULT };
}

export async function saveGrants(grants: UserGrants): Promise<void> {
  const next = { ...grants, updatedAt: Date.now() };
  if (redis) {
    await redis.set(key(grants.email), next);
  } else {
    memStore.set(grants.email.toLowerCase(), next);
  }
}

/** 결제 성공 시 호출 — product 별 grant 반영 + history append. */
export async function applyPurchase(args: {
  email: string;
  product: "unlimited" | "missile_pack";
  provider: "stripe" | "paypal" | "toss";
  paymentId: string;
  amountCents: number;
  unlimitedRangeKm: number; // tier 값 (lib/tiers.ts 참조)
  missilePackQty?: number;  // default 100
}): Promise<UserGrants> {
  const current = await getGrants(args.email);

  // idempotency — 같은 paymentId 가 history 에 있으면 중복 처리 X
  if (current.history.some((h) => h.paymentId === args.paymentId)) {
    return current;
  }

  const entry: GrantHistoryEntry = {
    at: Date.now(),
    product: args.product,
    provider: args.provider,
    paymentId: args.paymentId,
    amountCents: args.amountCents,
  };

  let next: UserGrants;
  if (args.product === "unlimited") {
    next = {
      ...current,
      tier: "unlimited",
      unlockedKm: args.unlimitedRangeKm,
      missiles: current.missiles + 100,
      history: [...current.history, entry],
      updatedAt: Date.now(),
    };
  } else {
    next = {
      ...current,
      missiles: current.missiles + (args.missilePackQty ?? 100),
      history: [...current.history, entry],
      updatedAt: Date.now(),
    };
  }
  await saveGrants(next);
  return next;
}

/**
 * 결제 시작 시 임시 메타 저장 (idempotencyKey → {email, product, provider}).
 * callback/webhook 에서 이 메타로 user 식별 + grant 적용.
 * TTL 30분 — 결제 완료 후 즉시 delete.
 */
export interface CheckoutSession {
  email: string;
  product: "unlimited" | "missile_pack";
  provider: "stripe" | "paypal" | "toss";
}

const SESSION_TTL_SEC = 1800;
const sessionMemStore = new Map<string, { value: CheckoutSession; expires: number }>();

function sessionKey(idempotencyKey: string): string {
  return `aether:checkout:${idempotencyKey}`;
}

export async function saveCheckoutSession(idempotencyKey: string, session: CheckoutSession): Promise<void> {
  if (redis) {
    await redis.set(sessionKey(idempotencyKey), session, { ex: SESSION_TTL_SEC });
  } else {
    sessionMemStore.set(sessionKey(idempotencyKey), {
      value: session,
      expires: Date.now() + SESSION_TTL_SEC * 1000,
    });
  }
}

export async function loadCheckoutSession(idempotencyKey: string): Promise<CheckoutSession | null> {
  if (redis) {
    const v = await redis.get<CheckoutSession>(sessionKey(idempotencyKey));
    return v ?? null;
  }
  const cached = sessionMemStore.get(sessionKey(idempotencyKey));
  if (!cached) return null;
  if (cached.expires < Date.now()) {
    sessionMemStore.delete(sessionKey(idempotencyKey));
    return null;
  }
  return cached.value;
}

export async function deleteCheckoutSession(idempotencyKey: string): Promise<void> {
  if (redis) {
    await redis.del(sessionKey(idempotencyKey));
  } else {
    sessionMemStore.delete(sessionKey(idempotencyKey));
  }
}

/** 미사일 1발 소비 — 잔량 0 시 false. */
export async function consumeMissile(email: string): Promise<boolean> {
  const current = await getGrants(email);
  if (current.missiles <= 0) return false;
  await saveGrants({ ...current, missiles: current.missiles - 1 });
  return true;
}
