import type { Obstacle } from "../world/layout.ts";

/** True if the planar segment a→b passes through no tree trunk or rock (with a margin). */
export function lineOfSight(obstacles: readonly Obstacle[], ax: number, az: number, bx: number, bz: number, margin = 0.1): boolean {
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
  if (len2 < 1e-6) return true;
  for (const o of obstacles) {
    // Trees block with their trunk plus some foliage; rocks with their body.
    const r = (o.kind === "tree" ? o.r + 0.35 : o.r) - margin;
    const t = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.z - az) * dz) / len2));
    if (t <= 0.02 || t >= 0.98) continue; // standing next to an obstacle does not hide yourself
    const px = ax + dx * t - o.x, pz = az + dz * t - o.z;
    if (px * px + pz * pz < r * r) return false;
  }
  return true;
}

/** Sight shrinks in darkness, except for creatures that glow. */
export function sightRange(base: number, daylight: number, glows: boolean): number {
  return glows ? base : base * (0.55 + 0.45 * daylight);
}
