import { CONFIG } from "../config.ts";
import { distToSegment, smoothstep } from "../math.ts";
import { region } from "./region.ts";
import "./regions/index.ts";

/** Terrain queries for the active region (see world/region.ts). */
export function heightAt(x: number, z: number): number {
  return region().heightAt(x, z);
}

/** Kept for existing callers: the active region's trail. */
export function trail(): readonly (readonly [number, number])[] {
  return region().trail;
}

export function pathDistance(x: number, z: number): number {
  const path = region().trail;
  let best = 99;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    best = Math.min(best, distToSegment(x, z, a[0], a[1], b[0], b[1]));
  }
  return best;
}

export function waterDistance(x: number, z: number): number {
  const w = region().water;
  const distance = Math.hypot(x - w.x, z - w.z);
  if (distance === 0) return 0;
  let low = 0, high = w.disc;
  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    if (heightAt(w.x + (x - w.x) * mid / distance, w.z + (z - w.z) * mid / distance) < CONFIG.waterY + 0.1) low = mid;
    else high = mid;
  }
  return Math.max(0, distance - high);
}

export function isDeepWater(x: number, z: number): boolean {
  const w = region().water;
  return Math.hypot(x - w.x, z - w.z) <= w.disc && heightAt(x, z) < CONFIG.waterY - 0.2;
}

/** 0 shore sand → 1 inland grass, for the terrain texture. */
export function shoreBlend(x: number, z: number): number {
  return smoothstep(CONFIG.waterY - 0.05, CONFIG.waterY + 0.55, heightAt(x, z));
}
