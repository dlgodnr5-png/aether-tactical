"use client";

import { create } from "zustand";

export interface TargetInfo {
  lat: number;
  lng: number;
  address: string;
}

export interface GameState {
  credits: number;
  plasmaFuel: number;
  maxAltitude: number;
  selectedPlane: number;
  target: TargetInfo | null;
  addCredits: (n: number) => void;
  addFuel: (n: number) => void;
  consumeFuel: (n: number) => void;
  setMaxAltitude: (n: number) => void;
  setSelectedPlane: (i: number) => void;
  setTarget: (t: TargetInfo | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  credits: 1_500_000,
  plasmaFuel: 87,
  maxAltitude: 50_000,
  selectedPlane: 0,
  target: null,
  addCredits: (n) =>
    set((s) => ({ credits: Math.max(0, s.credits + n) })),
  addFuel: (n) =>
    set((s) => ({ plasmaFuel: Math.min(100, Math.max(0, s.plasmaFuel + n)) })),
  consumeFuel: (n) =>
    set((s) => ({ plasmaFuel: Math.min(100, Math.max(0, s.plasmaFuel - n)) })),
  setMaxAltitude: (n) => set(() => ({ maxAltitude: Math.max(0, n) })),
  setSelectedPlane: (i) => set(() => ({ selectedPlane: i })),
  setTarget: (t) => set(() => ({ target: t })),
}));
