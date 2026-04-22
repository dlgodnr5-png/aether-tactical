// 2026년 기준 세계 최신 전투기 5종 — Fleet / Home 공용 데이터
// Images: /images/fleet/{slug}.jpg (공중 비행), /images/carrier/{slug}.jpg (항모 출격대기)

export type JetVariant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

/**
 * Numeric gameplay specs — consumed by MissionScene physics.
 * All multipliers are normalized around 1.0 so tuning is relative.
 *
 *   speedMul   : cruise / dogfight velocity (1.0 = baseline Mach 1.8)
 *   hpMul      : hull integrity (1.0 = 100 HP baseline)
 *   damageMul  : missile / cannon damage output
 *   stealth    : 0–1, enemy lock acquisition delay multiplier (higher = harder to lock)
 *   unlockCost : credits required to purchase (0 = default unlock)
 *   rank       : required pilot rank (0 = Recruit, 4 = Ace)
 */
export interface PlaneSpecs {
  speedMul: number;
  hpMul: number;
  damageMul: number;
  stealth: number;
  unlockCost: number;
  rank: number;
}

export interface Plane {
  id: number;
  slug: string;
  name: string;
  origin: string;
  manufacturer: string;
  generation: string;
  role: string;
  speed: string;
  stealth: string;
  payload: string;
  range: string;
  engine: string;
  variant: JetVariant;
  gradient: string;
  pilotCallsign: string;
  pilotName: string;
  specs: PlaneSpecs;
}

export const PLANES: Plane[] = [
  {
    id: 0, slug: "f35",  name: "F-35 LIGHTNING II",  origin: "USA",     manufacturer: "LOCKHEED MARTIN", generation: "5TH GEN", role: "MULTI-ROLE STEALTH",
    speed: "MACH 1.6",  stealth: "VERY HIGH", payload: "4x AIM-120 · 18,000 LB",   range: "2,220 KM",  engine: "P&W F135 · 43K LBF",
    variant: "multirole", gradient: "from-[#102040] via-[#1a3050] to-[#080d22]",
    pilotCallsign: "GHOST-01", pilotName: "LT. SEO HAE-WOOK",
    specs: { speedMul: 0.92, hpMul: 1.10, damageMul: 1.15, stealth: 0.90, unlockCost: 0, rank: 0 },
  },
  {
    id: 1, slug: "f22",  name: "F-22 RAPTOR",        origin: "USA",     manufacturer: "LOCKHEED MARTIN", generation: "5TH GEN", role: "AIR DOMINANCE",
    speed: "MACH 2.25", stealth: "EXTREME",   payload: "6x AIM-120 INTERNAL",      range: "2,960 KM",  engine: "2x P&W F119 · 35K LBF",
    variant: "fighter",   gradient: "from-[#0a1a30] via-[#112542] to-[#040912]",
    pilotCallsign: "RAPTOR-02", pilotName: "MAJ. KANG HYUN-JIN",
    specs: { speedMul: 1.30, hpMul: 1.00, damageMul: 1.20, stealth: 0.98, unlockCost: 250_000, rank: 2 },
  },
  {
    id: 2, slug: "j20",  name: "J-20 MIGHTY DRAGON", origin: "CHINA",   manufacturer: "CHENGDU",         generation: "5TH GEN", role: "AIR SUPERIORITY",
    speed: "MACH 2.0",  stealth: "HIGH",      payload: "6x PL-15 INTERNAL",        range: "5,500 KM",  engine: "WS-15 · 40K LBF",
    variant: "fighter",   gradient: "from-[#0a1430] via-[#0d2050] to-[#04081a]",
    pilotCallsign: "DRAGON-03", pilotName: "CAPT. LI WEI",
    specs: { speedMul: 1.18, hpMul: 0.95, damageMul: 1.10, stealth: 0.82, unlockCost: 100_000, rank: 1 },
  },
  {
    id: 3, slug: "kf21", name: "KF-21 BORAMAE",      origin: "KOREA",   manufacturer: "KAI",             generation: "4.5 GEN", role: "MULTI-ROLE FIGHTER",
    speed: "MACH 1.81", stealth: "MEDIUM",    payload: "10x HARDPOINTS",           range: "2,900 KM",  engine: "2x GE F414 · 22K LBF",
    variant: "multirole", gradient: "from-[#0a2040] via-[#1a3868] to-[#050920]",
    pilotCallsign: "BORAMAE-04", pilotName: "MAJ. PARK MIN-JU",
    specs: { speedMul: 1.05, hpMul: 1.20, damageMul: 1.05, stealth: 0.60, unlockCost: 50_000, rank: 0 },
  },
  {
    id: 4, slug: "kaan", name: "KAAN",               origin: "TÜRKIYE", manufacturer: "TAI",             generation: "5TH GEN", role: "NEXT-GEN STEALTH",
    speed: "MACH 2.0",  stealth: "HIGH",      payload: "INTERNAL BAY + 8 EXT",     range: "2,000+ KM", engine: "2x GE F110 (INTERIM)",
    variant: "fighter",   gradient: "from-[#1a0e30] via-[#261850] to-[#080418]",
    pilotCallsign: "KAAN-05", pilotName: "CAPT. AHMET YILMAZ",
    specs: { speedMul: 1.15, hpMul: 1.05, damageMul: 1.15, stealth: 0.85, unlockCost: 150_000, rank: 1 },
  },
];

/** Baseline physics constants. Multiply by specs.xxxMul to get per-jet values. */
export const BASE_SPEED = 30;     // world units / second in MissionScene
export const BASE_HP = 100;       // hull integrity
export const BASE_MISSILE_DAMAGE = 40;

/** Resolve spec values for a plane id. Safe default if id invalid. */
export function getPlaneSpecs(id: number): PlaneSpecs {
  return PLANES[id]?.specs ?? PLANES[0].specs;
}
