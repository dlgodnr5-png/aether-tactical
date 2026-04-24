#!/usr/bin/env node
/**
 * Generate background music via Google Lyria and save to public/audio/bgm/.
 *
 * Uses @google/genai SDK. Requires GOOGLE_GENAI_API_KEY in .env.local.
 * Model reference: https://ai.google.dev/gemini-api/docs/music-generation
 *
 * Usage:
 *   node scripts/generate-bgm.mjs --prompt "120bpm dark cyberpunk synth arpeggio" \
 *                                 --output tension-ambient \
 *                                 --category menu \
 *                                 --model clip   (clip=30s | pro=multi-minute)
 *
 * Examples:
 *   # 30초 메뉴 배경 BGM
 *   node scripts/generate-bgm.mjs -p "calm ambient 80bpm pad" -o lobby-calm -c menu
 *
 *   # 수 분 전투 테마
 *   node scripts/generate-bgm.mjs -p "160bpm electronic war, orchestral hit, tense synth" \
 *     -o electronic-war -c combat -m pro
 *
 * 출력: public/audio/bgm/{category}/{output}.mp3 (또는 --no-category 시 bgm/ 직접)
 *
 * 추가 후 lib/audio.ts BGM_POOL에 경로를 수동으로 넣어야 재생 풀에 편입됨.
 *
 * 규칙:
 *  - 특정 뮤지션 이름 하드코딩 금지 (저작권). 속성 기반 프롬프트만.
 *  - 결과는 비결정적 — 동일 프롬프트도 매번 다름.
 *  - SynthID 워터마크 자동 포함.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BGM_ROOT = resolve(ROOT, "public/audio/bgm");

function loadKey() {
  if (process.env.GOOGLE_GENAI_API_KEY) return process.env.GOOGLE_GENAI_API_KEY;
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    console.error("✗ .env.local not found. Add `GOOGLE_GENAI_API_KEY=...` there.");
    process.exit(1);
  }
  const contents = readFileSync(envPath, "utf8");
  const m = contents.match(/^GOOGLE_GENAI_API_KEY\s*=\s*(.+)$/m);
  if (!m) {
    console.error("✗ GOOGLE_GENAI_API_KEY missing from .env.local");
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const { values } = parseArgs({
  options: {
    prompt: { type: "string", short: "p" },
    output: { type: "string", short: "o" },
    category: { type: "string", short: "c", default: "" },
    model: { type: "string", short: "m", default: "clip" }, // clip | pro
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.prompt || !values.output) {
  console.log(`Usage:
  node scripts/generate-bgm.mjs --prompt "..." --output filename [options]

Required:
  -p, --prompt <text>     음악적 속성 (bpm, 악기, 무드). 뮤지션 이름 금지.
  -o, --output <name>     파일명 (확장자 없이). 예: tension-ambient

Options:
  -c, --category <dir>    하위 폴더 (menu|combat|cinematic|...). 생략 시 bgm/ 직접.
  -m, --model <clip|pro>  clip=30초 (기본) | pro=수 분
  -h, --help              이 도움말.`);
  process.exit(values.help ? 0 : 1);
}

const MODEL_MAP = {
  clip: "lyria-3-clip-preview",
  pro: "lyria-3-pro-preview",
};
const modelName = MODEL_MAP[values.model];
if (!modelName) {
  console.error(`✗ --model은 'clip' 또는 'pro' (받음: ${values.model})`);
  process.exit(1);
}

async function generate(apiKey, prompt, model) {
  const ai = new GoogleGenAI({ apiKey });
  const fullPrompt = `Create a background music track: ${prompt}. No vocals, no lyrics. Instrumental only.`;
  console.log(`→ Model: ${model}`);
  console.log(`→ Prompt: ${fullPrompt}`);
  console.log("→ Generating (this may take 30s~2min)...");

  const response = await ai.models.generateContent({ model, contents: fullPrompt });
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No parts in response");

  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data) {
      return { mimeType: inline.mimeType || "audio/mp3", b64: inline.data };
    }
  }
  throw new Error(`Unexpected response shape: ${JSON.stringify(response).slice(0, 300)}`);
}

async function main() {
  const key = loadKey();
  const outDir = values.category ? resolve(BGM_ROOT, values.category) : BGM_ROOT;
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${values.output}.mp3`);

  try {
    const { b64 } = await generate(key, values.prompt, modelName);
    writeFileSync(outPath, Buffer.from(b64, "base64"));
    const relPath = outPath.replace(ROOT, "").replace(/\\/g, "/");
    console.log(`\n✓ Saved: ${outPath}`);
    console.log(`→ 풀에 추가하려면 lib/audio.ts의 BGM_POOL 배열에 추가:`);
    console.log(`    "${relPath.replace("/public", "")}"`);
  } catch (err) {
    console.error(`✗ Generation failed: ${err.message || err}`);
    process.exit(1);
  }
}

main();
