#!/usr/bin/env node
/**
 * Generate 5 photorealistic aircraft-carrier deck scenes showing each fighter
 * on standby with a pilot in flight gear nearby.
 * Saves to public/images/carrier/{slug}.jpg (16:9).
 *
 * Usage:
 *   GROK_API_KEY=xai-... node scripts/generate-carrier-images.mjs
 *   (key is auto-loaded from .env.local)
 *
 * Cost: 5 × $0.07 = $0.35 (grok-imagine-image-pro)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/images/carrier");
const MODEL = process.env.MODEL || "grok-imagine-image-pro";
const ASPECT = "16:9";

function loadKey() {
  if (process.env.GROK_API_KEY) return process.env.GROK_API_KEY;
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    console.error("✗ .env.local not found. Add `GROK_API_KEY=xai-...` there.");
    process.exit(1);
  }
  const contents = readFileSync(envPath, "utf8");
  const m = contents.match(/^GROK_API_KEY\s*=\s*(.+)$/m);
  if (!m) {
    console.error("✗ GROK_API_KEY missing from .env.local");
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const COMMON_SCENE =
  "on the flight deck of a modern US-Navy-style nuclear aircraft carrier at dusk, " +
  "catapult track visible, deck crew in colored jerseys in the background, " +
  "steam venting softly from the deck, tower island with radar arrays visible far background, " +
  "ocean horizon with fading orange sky, cinematic aviation photography, " +
  "shallow depth of field, dramatic rim lighting, ultra-detailed, 16:9. " +
  "In the foreground right side: a fighter pilot in a full flight suit and helmet " +
  "(oxygen mask lifted, visor up) standing next to the jet, three-quarter rear view, " +
  "hand resting on the fuselage, ready for launch.";

const VARIANTS = [
  {
    id: "f35",
    prompt:
      "Photorealistic Lockheed-Martin-style fifth-generation multirole stealth fighter, " +
      "single-seat single-engine, smooth rounded fuselage, bubble canopy open, " +
      "chin-mounted electro-optical sensor, twin canted vertical tails, matte medium gray coating, " +
      "parked on launch catapult in standby. " + COMMON_SCENE,
  },
  {
    id: "f22",
    prompt:
      "Photorealistic twin-engine stealth air-superiority fighter, angular faceted fuselage, " +
      "trapezoidal swept wings, twin tall vertical tails, thrust-vectoring nozzles visible, " +
      "matte dark gray low-observable coating, canopy open, " +
      "parked on catapult track in standby. " + COMMON_SCENE,
  },
  {
    id: "j20",
    prompt:
      "Photorealistic long slender twin-engine fifth-generation stealth fighter with canard-delta configuration, " +
      "forward canards near cockpit, twin inward-canted vertical stabilizers, " +
      "dark metallic blue-gray coating, canopy open, parked on flight deck in standby. " +
      COMMON_SCENE,
  },
  {
    id: "kf21",
    prompt:
      "Photorealistic 4.5-generation twin-engine multirole fighter, conventional fighter proportions, " +
      "trapezoidal wings, twin vertical tails, matte two-tone gray camouflage, canopy open, " +
      "under-wing hardpoints loaded with missiles, parked on catapult in standby. " + COMMON_SCENE,
  },
  {
    id: "kaan",
    prompt:
      "Photorealistic twin-engine fifth-generation stealth fighter prototype with sleek angular fuselage, " +
      "diamond wing planform, twin canted vertical stabilizers, bubble canopy open, " +
      "matte pearlescent blue-gray low-observable coating, parked on flight deck in standby. " +
      COMMON_SCENE,
  },
];

async function generateOne(key, prompt) {
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      aspect_ratio: ASPECT,
      n: 1,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  const url =
    json?.data?.[0]?.url ||
    json?.data?.[0]?.image_url ||
    json?.images?.[0]?.url ||
    json?.image_url;
  const b64 = json?.data?.[0]?.b64_json || json?.data?.[0]?.b64;
  if (url) return { kind: "url", value: url };
  if (b64) return { kind: "b64", value: b64 };
  throw new Error(`Unexpected response: ${JSON.stringify(json).slice(0, 300)}`);
}

async function downloadTo(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
}

async function main() {
  const key = loadKey();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  console.log(`→ Model: ${MODEL}`);
  console.log(`→ Output: ${OUT_DIR}\n`);

  for (const v of VARIANTS) {
    const outPath = resolve(OUT_DIR, `${v.id}.jpg`);
    console.log(`[${v.id}] generating…`);
    try {
      const result = await generateOne(key, v.prompt);
      if (result.kind === "url") {
        await downloadTo(result.value, outPath);
      } else {
        writeFileSync(outPath, Buffer.from(result.value, "base64"));
      }
      console.log(`  ✓ saved ${outPath}`);
    } catch (err) {
      console.error(`  ✗ ${v.id} failed:`, err.message);
    }
  }
  console.log("\nDone. Commit public/images/carrier/*.jpg and redeploy.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
