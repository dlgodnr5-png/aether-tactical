#!/usr/bin/env node
/**
 * Generate 5 photorealistic fighter-jet images via xAI Grok Imagine API,
 * save to public/images/fleet/{variant}.jpg.
 *
 * Usage:
 *   1. Add `GROK_API_KEY=xai-...` to .env.local in this project root.
 *   2. `node scripts/generate-fleet-images.mjs`
 *   3. Commit public/images/fleet/*.jpg
 *
 * Cost: 5 × $0.07 = $0.35 (grok-imagine-image-pro)
 *       or 5 × $0.02 = $0.10 (grok-imagine-image)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/images/fleet");
const MODEL = process.env.MODEL || "grok-imagine-image-pro"; // or "grok-imagine-image"
const ASPECT = "16:9";

// Load key from .env.local
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

// Prompts describe publicly known visual characteristics of each modern
// fighter type — no specific photo is copied. Grok generates original
// renderings from text descriptions.
const VARIANTS = [
  {
    id: "f35",
    prompt:
      "Photorealistic modern fifth-generation multirole stealth fighter aircraft in flight, single-seat single-engine configuration, rounded smooth fuselage, bubble canopy, chin-mounted electro-optical sensor, twin vertical tails canted slightly outward, matte medium gray low-observable coating, banking left above cloud layer at golden hour, dramatic rim lighting, aviation photography, ultra-detailed, shallow depth of field, cinematic, 16:9",
  },
  {
    id: "j20",
    prompt:
      "Photorealistic modern fifth-generation twin-engine stealth air-superiority fighter aircraft, long slender fuselage with canard-delta wing configuration, forward canards near the cockpit, twin inward-canted vertical stabilizers, dark metallic blue-gray low-observable coating, cruising above overcast cloud deck at high altitude, side three-quarter view, dramatic sky, aviation photography, cinematic, 16:9",
  },
  {
    id: "kf21",
    prompt:
      "Photorealistic modern 4.5-generation twin-engine multirole fighter aircraft, conventional fighter proportions with trapezoidal wings, single-seat canopy, twin vertical tails, under-wing hardpoints with air-to-air missiles, matte two-tone gray camouflage paint scheme, banking maneuver over rugged mountain terrain at dusk, dynamic aviation photography, dramatic lighting, cinematic, 16:9",
  },
  {
    id: "f22",
    prompt:
      "Photorealistic modern fifth-generation twin-engine stealth air-superiority fighter, sharp angular faceted fuselage, trapezoidal wings with swept leading edges, two tall vertical tails, thrust-vectoring exhaust nozzles, matte dark gray low-observable coating, banking hard into a climb with condensation vapor cones forming over wings, dramatic sky backdrop, aviation photography, cinematic, 16:9",
  },
  {
    id: "kaan",
    prompt:
      "Photorealistic modern fifth-generation twin-engine stealth air-superiority fighter aircraft, sleek angular fuselage, diamond wing planform, twin canted vertical stabilizers, bubble canopy, matte pearlescent blue-gray low-observable coating, cruising at high altitude above clean blue sky and distant cloud layer, cinematic composition, aviation photography, ultra-detailed, 16:9",
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
  console.log("\nDone. Commit public/images/fleet/*.jpg and redeploy.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
