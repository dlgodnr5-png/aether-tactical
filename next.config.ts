import type { NextConfig } from "next";

/**
 * Cesium is a browser-only library — it references `self`/`window`/`document`
 * at module load. To keep it out of server bundles we:
 *   1. Only import it from components wrapped in `dynamic(..., { ssr: false })`.
 *   2. Mark the top-level `cesium` package as external for the server compile,
 *      which stops Next from following its deep imports during SSR.
 *
 * Asset loading: static files (Workers, Widgets, Assets, ThirdParty) are
 * copied to `public/cesium/` by `scripts/copy-cesium-assets.mjs`
 * (runs on `postinstall` and before `next build`). Runtime code sets
 * `window.CESIUM_BASE_URL = "/cesium"` before any Cesium import.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["cesium"],
};

export default nextConfig;
