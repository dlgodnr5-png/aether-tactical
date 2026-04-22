/**
 * Copy Cesium's build assets (Workers/Widgets/Assets/ThirdParty) into
 * `public/cesium/` so Next.js serves them statically at `/cesium/*`.
 *
 * Runtime code sets `window.CESIUM_BASE_URL = "/cesium"` before importing
 * any Cesium modules. See components/fx/CesiumGlobe.tsx.
 *
 * Run via `npm run postinstall` (see package.json). Idempotent: clears
 * the destination first so upgrading Cesium doesn't leave stale files.
 */

import { cp, rm, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "node_modules", "cesium", "Build", "Cesium");
const DEST = path.join(ROOT, "public", "cesium");

const FOLDERS = ["Workers", "Widgets", "Assets", "ThirdParty"];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SRC))) {
    console.warn(`[cesium-copy] Cesium not installed at ${SRC} — skipping.`);
    return;
  }

  // Clear destination to avoid stale files after version bumps
  if (await exists(DEST)) {
    await rm(DEST, { recursive: true, force: true });
  }
  await mkdir(DEST, { recursive: true });

  for (const folder of FOLDERS) {
    const from = path.join(SRC, folder);
    const to = path.join(DEST, folder);
    if (!(await exists(from))) {
      console.warn(`[cesium-copy] missing ${folder}, skipping`);
      continue;
    }
    await cp(from, to, { recursive: true });
    console.log(`[cesium-copy] ${folder} → public/cesium/${folder}`);
  }
  console.log("[cesium-copy] done");
}

main().catch((err) => {
  console.error("[cesium-copy] failed:", err);
  process.exitCode = 1;
});
