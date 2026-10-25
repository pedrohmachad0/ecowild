import { CONFIG } from "../config.ts";
import { distToSegment, smoothstep } from "../math.ts";

const PATH: readonly (readonly [number, number])[] = [
  [0, 18],
  [1, 12],
  [4, 7],
  [8, 3],
  [2, -1],
  [-6, -4],
  [-10, -6],
];

export function heightAt(x: number, z: number): number {
  const hills =
    Math.sin(x * 0.085) * 1.15 +
    Math.cos(z * 0.07) * 0.95 +
    Math.sin((x + z) * 0.16) * 0.35;
  const dx = x - CONFIG.lakeX;
  const dz = z - CONFIG.lakeZ;
  const lake = Math.exp(-(dx * dx + dz * dz) / 58);
  return hills * (1 - lake * 0.82) - lake * 3.15 + 0.2;
}

export function pathDistance(x: number, z: number): number {
  let best = 99;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i]!;
    const b = PATH[i + 1]!;
    best = Math.min(best, distToSegment(x, z, a[0], a[1], b[0], b[1]));
  }
  return best;
}

export function waterDistance(x: number, z: number): number {
  return Math.max(0, Math.hypot(x - CONFIG.lakeX, z - CONFIG.lakeZ) - 5.6);
}

export function isDeepWater(x: number, z: number): boolean {
  return heightAt(x, z) < CONFIG.waterY - 0.2;
}

/** 0 shore sand → 1 inland grass, for the terrain texture. */
export function shoreBlend(x: number, z: number): number {
  return smoothstep(CONFIG.waterY - 0.05, CONFIG.waterY + 0.55, heightAt(x, z));
}
