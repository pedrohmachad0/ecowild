import type { AppliedTier, QualityName } from "../types.ts";

export function initialTier(coarsePointer: boolean, cores: number): AppliedTier {
  if (coarsePointer) return "low";
  if (cores <= 4) return "medium";
  return "high";
}

/** AUTO follows measured FPS, not the device name. Locked tiers stay put. */
export function adaptTier(mode: QualityName, tier: AppliedTier, avgFps: number): AppliedTier {
  if (mode !== "auto") return mode;
  if (avgFps > 0 && avgFps < 28) {
    if (tier === "high") return "medium";
    if (tier === "medium") return "low";
  } else if (avgFps > 55) {
    if (tier === "low") return "medium";
    if (tier === "medium") return "high";
  }
  return tier;
}

export function scalingFor(tier: AppliedTier, dpr: number): number {
  const cap = tier === "high" ? Math.min(dpr, 1.75) : tier === "medium" ? Math.min(dpr, 1.15) : Math.min(dpr, 0.9);
  return dpr / Math.max(0.7, cap);
}

export function grassCount(tier: AppliedTier): number {
  if (tier === "low") return 0;
  if (tier === "medium") return 260;
  return 640;
}
