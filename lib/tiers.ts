/**
 * Distance tier map — 2026-04-25 단일화: FREE / $1 UNLIMITED.
 * 포탄(미사일)은 별도 micro-purchase ($1/100발) — `missilesSlice` 참고.
 *
 * 이전 4-tier ($0/$1/$5/$10) 는 deprecated. 사용자 결정으로 단순화 →
 * 결정 부담 ↓ → 전환률 ↑. 매출 hook 은 미사일 reload 모달.
 *
 * `rangeKm` drives reachable-target filtering on the Cesium globe.
 * `altitudeKm` caps the flight ceiling in MissionScene.
 */

export const INFINITE_KM = 99_999; // sentinel — treated as unlimited in UI/logic

export const FREE_MISSILES = 5;     // 무료 미션당 포탄
export const PAID_MISSILES_INITIAL = 100;  // $1 결제 시 초기 포탄
export const MISSILE_PACK_COUNT = 100;     // reload pack: $1 / 100발

export interface Tier {
  id: string;
  rangeKm: number;
  altitudeKm: number;
  usd: number;
  label: string;
  description: string;
  initialMissiles: number;
}

export const TIERS: Tier[] = [
  {
    id: "free",
    rangeKm: 5,
    altitudeKm: 5,
    usd: 0,
    label: "FREE",
    description: "무료 — 5km 반경 · 미사일 5발",
    initialMissiles: FREE_MISSILES,
  },
  {
    id: "unlimited",
    rangeKm: INFINITE_KM,
    altitudeKm: INFINITE_KM,
    usd: 1,
    label: "UNLIMITED",
    description: "$1 — 무한 반경 · 무한 미션 + 미사일 100발 (이후 100발 / $1 충전)",
    initialMissiles: PAID_MISSILES_INITIAL,
  },
];

export const FREE_TIER_KM = 5;
export const FREE_ALTITUDE_CAP_METERS = 5_000;

/** Backwards-compat alias: old code referenced `tier.km` for range. */
export function tierRangeKm(t: Tier): number {
  return t.rangeKm;
}

/** Human-readable range (handles infinity). */
export function formatRangeKm(km: number): string {
  if (km >= INFINITE_KM) return "∞";
  if (km >= 1000) return `${(km / 1000).toLocaleString()}K km`;
  return `${km} km`;
}

/** Human-readable altitude (handles infinity). */
export function formatAltitudeKm(km: number): string {
  if (km >= INFINITE_KM) return "∞";
  return `${km} km`;
}

/** Find tier by USD amount (exact match). */
export function tierByUsd(usd: number): Tier | undefined {
  return TIERS.find((t) => t.usd === usd);
}

/** Find tier by id. */
export function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

/** Largest tier the user has unlocked (by range cap). */
export function activeTier(unlockedKm: number): Tier {
  return [...TIERS]
    .reverse()
    .find((t) => unlockedKm >= t.rangeKm) ?? TIERS[0];
}

/** Convenience: 결제 완료 여부 (FREE 가 아니면 unlimited 로 간주). */
export function isPaidTier(unlockedKm: number): boolean {
  return unlockedKm >= INFINITE_KM;
}

/** legacy 4-tier 식별자(t1/t5/t10) 를 신규 unlimited 로 매핑. */
export function migrateLegacyTierId(id: string): string {
  if (id === "t1" || id === "t5" || id === "t10") return "unlimited";
  return id;
}

/** Distance in km between two lat/lng points (Haversine, meters → km). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Flight duration in seconds for a given km (compressed logarithmically). */
export function flightDurationSec(km: number): number {
  // 5km → ~4s, 10km → ~5s, 400km → ~12s, 1000km → ~16s
  return Math.max(3, Math.round(4 + Math.log2(Math.max(1, km)) * 2));
}
