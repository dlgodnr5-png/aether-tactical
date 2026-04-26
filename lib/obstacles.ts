/**
 * 방해물 procgen — 매 미션마다 다른 알고리즘 (시드 기반).
 *
 * 5종 방해물:
 *  - sam (지대공 미사일): 지면에서 추적 발사
 *  - drone (적 드론): 무리 비행, 자폭 또는 사격
 *  - interceptor (적 전투기): 1대1 도그파이트
 *  - weather (기상 이상): 난기류/번개/폭풍 — 회피만 가능
 *  - alien_ship (외계 우주선): 우주 페이즈 전용, 빔 공격
 *
 * 시드: 날짜 + 미션 회수 + 사용자 ID 해시 → 같은 사용자라도 매번 다른 패턴.
 * 사용:
 *   const events = generateObstacles({ seed: missionSeed(), missionLengthSec: 60, tier: "unlimited", phase: "flight" });
 *   for (const e of events) scheduler.spawnAt(e.spawnAt, e);
 */

export type ObstacleKind = "sam" | "drone" | "interceptor" | "weather" | "alien_ship";
export type ObstacleBehavior = "track" | "random" | "swarm" | "intercept" | "area_denial";
export type GamePhase = "flight" | "globe" | "strike" | "space" | "debrief";

export interface ObstacleEvent {
  id: string;
  kind: ObstacleKind;
  behavior: ObstacleBehavior;
  spawnAt: number;          // mission elapsed time (s)
  lifeSec: number;          // 자동 despawn
  position: [lat: number, lon: number, altMeters: number];
  damage: number;           // 명중 시 player 피해
  reward: { credits: number; missiles: number };
  warning?: string;         // voice id (예: "warning_sam")
}

interface GenerateOptions {
  seed: number;
  missionLengthSec: number;
  tier: "free" | "unlimited";
  phase: GamePhase;
  /** 비행 경로 중심 — 방해물 위치 산출 기준 */
  pathCenter?: [lat: number, lon: number];
  /** 난이도 0.0 ~ 1.0 (default 0.5) — 방해물 수/공격성에 비례 */
  difficulty?: number;
}

// 시드 기반 의사난수 (mulberry32)
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** 미션 시드 — 일자 기반 + 회수. 같은 날 같은 회수면 동일 패턴. */
export function missionSeed(missionCount: number, dateKey?: string): number {
  const today = dateKey ?? new Date().toISOString().slice(0, 10);
  let h = 2166136261;
  for (const ch of today + ":" + missionCount) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const KIND_BY_PHASE: Record<GamePhase, ObstacleKind[]> = {
  flight: ["sam", "drone", "interceptor", "weather"],
  globe: [], // 전환 페이즈 — 방해물 없음
  strike: ["sam", "interceptor"],
  space: ["alien_ship", "drone"],
  debrief: [],
};

const KIND_DEFAULTS: Record<ObstacleKind, Pick<ObstacleEvent, "behavior" | "lifeSec" | "damage" | "reward" | "warning">> = {
  sam: {
    behavior: "track",
    lifeSec: 12,
    damage: 25,
    reward: { credits: 500, missiles: 0 },
    warning: "warning_sam",
  },
  drone: {
    behavior: "swarm",
    lifeSec: 15,
    damage: 10,
    reward: { credits: 200, missiles: 1 },
    warning: "warning_drone",
  },
  interceptor: {
    behavior: "intercept",
    lifeSec: 30,
    damage: 35,
    reward: { credits: 1500, missiles: 2 },
    warning: "warning_drone",
  },
  weather: {
    behavior: "area_denial",
    lifeSec: 20,
    damage: 5,
    reward: { credits: 0, missiles: 0 },
  },
  alien_ship: {
    behavior: "intercept",
    lifeSec: 45,
    damage: 50,
    reward: { credits: 5000, missiles: 5 },
    warning: "warning_drone",
  },
};

/** 메인 생성기. 시드 동일하면 결과 동일 (재현성). */
export function generateObstacles(opts: GenerateOptions): ObstacleEvent[] {
  const { seed, missionLengthSec, phase } = opts;
  const difficulty = Math.max(0, Math.min(1, opts.difficulty ?? 0.5));
  const center = opts.pathCenter ?? [37.5, 127.0]; // 서울 기본
  const r = rng(seed);

  const allowed = KIND_BY_PHASE[phase];
  if (!allowed || allowed.length === 0) return [];

  // 방해물 총 갯수: 미션 길이 × 난이도 비례 (대략 10초당 1건 + 난이도 보정)
  const baseCount = Math.floor(missionLengthSec / 10) + Math.floor(difficulty * 5);
  const count = Math.max(1, baseCount);

  const events: ObstacleEvent[] = [];
  for (let i = 0; i < count; i++) {
    const kind = allowed[Math.floor(r() * allowed.length)];
    const def = KIND_DEFAULTS[kind];

    // spawn 시간: 균등 분포 (0.1 * 길이) ~ (0.95 * 길이)
    const spawnAt = Math.round(missionLengthSec * (0.1 + r() * 0.85));

    // 위치: pathCenter 기준 ±0.5도 무작위 (대략 ±55km)
    const dLat = (r() - 0.5) * 1.0;
    const dLon = (r() - 0.5) * 1.0;
    const altMeters = phase === "space"
      ? 100_000 + r() * 300_000
      : kind === "sam" ? 0 : 1_000 + r() * 9_000;

    events.push({
      id: `${kind}-${i}-${seed.toString(36)}`,
      kind,
      ...def,
      spawnAt,
      position: [center[0] + dLat, center[1] + dLon, altMeters],
    });
  }

  // spawnAt 기준 정렬
  events.sort((a, b) => a.spawnAt - b.spawnAt);
  return events;
}

/** 디버그/요약 — 콘솔 출력용. */
export function summarizeObstacles(events: ObstacleEvent[]): string {
  if (events.length === 0) return "(방해물 없음)";
  const counts = events.reduce((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return `총 ${events.length}건: ` + Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(", ");
}
