/**
 * Distance tier map — maps USD price to max km range.
 * Per user spec:
 *   - Free: 5km (altitude cap, local radius)
 *   - $1  : 10km
 *   - $5  : 400km
 *   - $10 : 1,000km
 *
 * The `km` drives reachable-target filtering on the Cesium globe and
 * mission flight duration (time-skip length ~ log(km)).
 */

export interface Tier {
  id: string;
  km: number;
  usd: number;
  label: string;
  description: string;
}

export const TIERS: Tier[] = [
  {
    id: "free",
    km: 5,
    usd: 0,
    label: "SCOUT",
    description: "무료 — 5km 반경 / 고도 5km 상한",
  },
  {
    id: "t10",
    km: 10,
    usd: 1,
    label: "RECON",
    description: "$1 — 반경 10km 확장",
  },
  {
    id: "t400",
    km: 400,
    usd: 5,
    label: "TACTICAL",
    description: "$5 — 반경 400km · 해외 목표 가능",
  },
  {
    id: "t1000",
    km: 1000,
    usd: 10,
    label: "STRATEGIC",
    description: "$10 — 반경 1,000km · 대륙 간",
  },
];

export const FREE_TIER_KM = 5;
export const FREE_ALTITUDE_CAP_METERS = 5_000;

/** Find tier by USD amount (exact match). */
export function tierByUsd(usd: number): Tier | undefined {
  return TIERS.find((t) => t.usd === usd);
}

/** Find tier by id. */
export function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

/** Largest tier the user has unlocked (by kmCap). */
export function activeTier(unlockedKm: number): Tier {
  return [...TIERS]
    .reverse()
    .find((t) => unlockedKm >= t.km) ?? TIERS[0];
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
