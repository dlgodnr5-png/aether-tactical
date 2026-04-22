"use client";

/**
 * Persistent tier-unlock state.
 *
 * Tracks the highest distance tier (in km) the user has unlocked across
 * sessions. Persisted to localStorage; on server (Stripe webhook flow)
 * this will be mirrored to a cookie-signed JWT in a later sprint.
 *
 * Usage:
 *   const unlockedKm = useTierStore(s => s.unlockedKm);
 *   const activeT = activeTier(unlockedKm);
 *
 * See lib/tiers.ts for the TIERS catalog.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FREE_TIER_KM } from "@/lib/tiers";

interface TierState {
  unlockedKm: number;
  setUnlockedKm: (km: number) => void;
  unlockTier: (km: number) => void; // monotonic — never decreases
  resetToFree: () => void;
}

export const useTierStore = create<TierState>()(
  persist(
    (set) => ({
      unlockedKm: FREE_TIER_KM,
      setUnlockedKm: (km) => set(() => ({ unlockedKm: Math.max(FREE_TIER_KM, km) })),
      unlockTier: (km) =>
        set((s) => ({ unlockedKm: Math.max(s.unlockedKm, km) })),
      resetToFree: () => set(() => ({ unlockedKm: FREE_TIER_KM })),
    }),
    {
      name: "aether-tier-unlock",
      version: 1,
    },
  ),
);
