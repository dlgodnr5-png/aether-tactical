/**
 * Runs at module load, BEFORE any `cesium` or `resium` import resolves.
 *
 * `CESIUM_BASE_URL` tells Cesium where to fetch Workers / Widgets / Assets /
 * ThirdParty at runtime — we serve those from `/cesium/*` via
 * `scripts/copy-cesium-assets.mjs`.
 *
 * `CESIUM_ION_TOKEN` (public env, `NEXT_PUBLIC_CESIUM_ION_TOKEN`) enables
 * satellite imagery + 3D terrain. Without it the globe still renders with
 * the bundled offline Natural Earth imagery.
 *
 * Import this file BEFORE importing from `cesium` or `resium`.
 */

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).CESIUM_BASE_URL = "/cesium";
}

export const CESIUM_ION_TOKEN =
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim() || "";
