/**
 * Distance tier map — maps USD price to max altitude + max range.
 * Per user spec (2026-04-22 update):
 *   - Free : altitude 5km   · range 5km     (local training only)
 *   - $1   : altitude 10km  · range 5,000km  (continental)
 *   - $5   : altitude 50km  · range 10,000km (hemisphere)
 *   - $10  : altitude ∞     · range ∞        (global, unlimited)
 *
 * `rangeKm` drives reachable-target filtering on the Cesium globe.
 * `altitudeKm` caps the flight ceiling in MissionScene.
 * Use `INFINITE_KM` sentinel for the unlimited tier.
 */

export const INFINITE_KM = 99_999; // sentinel — treated as unlimited in UI/logic

export interface Tier {
  id: string;
  rangeKm: number;
  altitudeKm: number;
  usd: number;
  label: string;
  description: string;
}

export const TIERS: Tier[] = [
  {
    id: "free",
    rangeKm: 5,
    altitudeKm: 5,
    usd: 0,
    label: "SCOUT",
    description: "무료 — 고도 5km · 반경 5km (훈련 모드)",
  },
  {
    id: "t1",
    rangeKm: 5_000,
    altitudeKm: 10,
    usd: 1,
    label: "RECON",
    description: "$1 — 고도 10km · 반경 5,000km (대륙)",
  },
  {
    id: "t5",
    rangeKm: 10_000,
    altitudeKm: 50,
    usd: 5,
    label: "TACTICAL",
    description: "$5 — 고도 50km · 반경 10,000km (반구)",
  },
  {
    id: "t10",
    rangeKm: INFINITE_KM,
    altitudeKm: INFINITE_KM,
    usd: 10,
    label: "STRATEGIC",
    description: "$10 — 고도 · 반경 무제한 (글로벌)",
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
