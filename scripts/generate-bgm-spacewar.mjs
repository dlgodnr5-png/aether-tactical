#!/usr/bin/env node
/**
 * 우주 전쟁 BGM 6트랙 일괄 생성 (Lyria, 비결정적).
 *
 * generate-bgm.mjs 를 6번 호출 — 각 트랙 30초 (clip 모드, ~$0).
 * 페이즈 매핑:
 *   menu/lobby   → cyber-news (기존)
 *   flight/cruise → epic-space-battle, tense-ambient
 *   strike/combat → alien-combat
 *   space         → interstellar-drama, space-opera, deep-space
 *
 * 사용:
 *   node scripts/generate-bgm-spacewar.mjs            # 모두 생성
 *   node scripts/generate-bgm-spacewar.mjs --only=2,4 # 2번, 4번만 (재시도)
 *
 * 결과 후 lib/audio.ts 의 BGM_BY_PHASE 에 경로 추가 (이 스크립트는 파일만 생성).
 */

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, "generate-bgm.mjs");

const TRACKS = [
  {
    n: 1,
    output: "epic-space-battle",
    category: "flight",
    prompt: "epic space battle orchestral 110bpm with brass swells, choir hits, percussion, cinematic",
  },
  {
    n: 2,
    output: "tense-ambient",
    category: "flight",
    prompt: "sci-fi tense ambient 90bpm low strings synthesizer pulses, dark, suspenseful",
  },
  {
    n: 3,
    output: "alien-combat",
    category: "strike",
    prompt: "aggressive alien combat 130bpm electronic + orchestra, distorted brass, frantic percussion",
  },
  {
    n: 4,
    output: "interstellar-drama",
    category: "space",
    prompt: "interstellar dramatic piano + sweeping strings building tension, cinematic 80bpm",
  },
  {
    n: 5,
    output: "space-opera",
    category: "space",
    prompt: "space opera fanfare brass triumphant 100bpm, choir, orchestral hits, heroic",
  },
  {
    n: 6,
    output: "deep-space",
    category: "space",
    prompt: "deep space loneliness cinematic ambient 60bpm, soft pad, distant signals, vast",
  },
];

function parseOnly(arg) {
  if (!arg) return null;
  return new Set(arg.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)));
}

const { values } = parseArgs({
  options: {
    only: { type: "string", short: "o" },
    overwrite: { type: "boolean", default: false },
  },
});

const onlySet = parseOnly(values.only);
const ROOT = resolve(__dirname, "..");
const BGM_ROOT = resolve(ROOT, "public/audio/bgm");

console.log(`🎵 Lyria 우주전 BGM 일괄 생성 (${TRACKS.length}트랙)`);
console.log(`출력: ${BGM_ROOT}/{flight,strike,space}/`);
if (onlySet) console.log(`필터: 트랙 ${[...onlySet].sort().join(", ")} 만 생성`);

const results = [];
for (const t of TRACKS) {
  if (onlySet && !onlySet.has(t.n)) continue;

  const outFile = resolve(BGM_ROOT, t.category, `${t.output}.mp3`);
  if (existsSync(outFile) && !values.overwrite) {
    console.log(`\n[${t.n}/6] ⏭  이미 존재: ${t.category}/${t.output}.mp3 (--overwrite 로 강제)`);
    results.push({ n: t.n, status: "skipped", path: outFile });
    continue;
  }

  console.log(`\n[${t.n}/6] 🎶 ${t.category}/${t.output}`);
  console.log(`     prompt: ${t.prompt.slice(0, 70)}...`);

  const result = spawnSync(
    process.execPath,
    [SCRIPT, "-p", t.prompt, "-o", t.output, "-c", t.category, "-m", "clip"],
    { stdio: "inherit", cwd: ROOT },
  );

  if (result.status === 0) {
    console.log(`     ✓ 완료`);
    results.push({ n: t.n, status: "ok", path: outFile });
  } else {
    console.log(`     ✗ 실패 (exit ${result.status})`);
    results.push({ n: t.n, status: "fail", path: outFile });
  }
}

console.log("\n━━━ 결과 ━━━");
const ok = results.filter((r) => r.status === "ok").length;
const skipped = results.filter((r) => r.status === "skipped").length;
const fail = results.filter((r) => r.status === "fail").length;
console.log(`✓ ${ok} 생성, ⏭ ${skipped} 스킵, ✗ ${fail} 실패`);

if (fail > 0) {
  console.log(`\n실패 트랙 재시도: node scripts/generate-bgm-spacewar.mjs --only=${results.filter((r) => r.status === "fail").map((r) => r.n).join(",")}`);
  process.exit(1);
}

console.log(`\n다음 단계: lib/audio.ts 의 BGM_BY_PHASE 에 다음 경로 추가:`);
console.log(`  flight: ['/audio/bgm/flight/epic-space-battle.mp3', '/audio/bgm/flight/tense-ambient.mp3']`);
console.log(`  strike: ['/audio/bgm/strike/alien-combat.mp3']`);
console.log(`  space:  ['/audio/bgm/space/interstellar-drama.mp3', '/audio/bgm/space/space-opera.mp3', '/audio/bgm/space/deep-space.mp3']`);
