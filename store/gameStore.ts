"use client";

import { create } from "zustand";

export interface TargetInfo {
  lat: number;
  lng: number;
  address: string;
}

/**
 * 9-phase game loop state machine.
 * See plans/lively-waddling-teapot.md for the full flow.
 *
 *   menu → fleet → target → tier → launch → cruise → zoom → strike → debrief → menu
 */
export type GamePhase =
  | "menu"
  | "fleet"
  | "target"
  | "tier"
  | "launch"
  | "cruise"
  | "zoom"
  | "strike"
  | "debrief";

export interface MissionResult {
  hit: boolean;
  enemiesDowned: number;
  creditsEarned: number;
  rankDelta: number;
}

export interface GameState {
  // Existing persistent state
  credits: number;
  plasmaFuel: number;
  maxAltitude: number;
  selectedPlane: number;
  target: TargetInfo | null;

  // Game loop phase
  phase: GamePhase;

  // Current mission scratch state (reset per mission)
  currentTierKm: number | null;
  lastResult: MissionResult | null;

  // Actions
  addCredits: (n: number) => void;
  addFuel: (n: number) => void;
  consumeFuel: (n: number) => void;
  setMaxAltitude: (n: number) => void;
  setSelectedPlane: (i: number) => void;
  setTarget: (t: TargetInfo | null) => void;
  setPhase: (p: GamePhase) => void;
  advancePhase: () => void;
  resetMission: () => void;
  setTierKm: (km: number | null) => void;
  setResult: (r: MissionResult | null) => void;
}

const PHASE_ORDER: GamePhase[] = [
  "menu", "fleet", "target", "tier", "launch",
  "cruise", "zoom", "strike", "debrief",
];

export const useGameStore = create<GameState>((set) => ({
  credits: 1_500_000,
  plasmaFuel: 87,
  maxAltitude: 50_000,
  selectedPlane: 0,
  target: null,
  phase: "menu",
  currentTierKm: null,
  lastResult: null,

  addCredits: (n) =>
    set((s) => ({ credits: Math.max(0, s.credits + n) })),
  addFuel: (n) =>
    set((s) => ({ plasmaFuel: Math.min(100, Math.max(0, s.plasmaFuel + n)) })),
  consumeFuel: (n) =>
    set((s) => ({ plasmaFuel: Math.min(100, Math.max(0, s.plasmaFuel - n)) })),
  setMaxAltitude: (n) => set(() => ({ maxAltitude: Math.max(0, n) })),
  setSelectedPlane: (i) => set(() => ({ selectedPlane: i })),
  setTarget: (t) => set(() => ({ target: t })),
  setPhase: (p) => set(() => ({ phase: p })),
  advancePhase: () =>
    set((s) => {
      const idx = PHASE_ORDER.indexOf(s.phase);
      const next = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
      return { phase: next };
    }),
  resetMission: () =>
    set(() => ({
      phase: "menu",
      currentTierKm: null,
      lastResult: null,
      target: null,
    })),
  setTierKm: (km) => set(() => ({ currentTierKm: km })),
  setResult: (r) => set(() => ({ lastResult: r })),
}));
