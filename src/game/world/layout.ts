import { heightAt } from "./terrain.ts";
import { CONFIG } from "../config.ts";
import { region } from "./region.ts";
import type { PropKind } from "./region.ts";
import { MATA_CAMP, MATA_NESTS, MATA_PERCH, MATA_SPAWNS } from "./regions/mata.ts";

export type Obstacle = { x: number; z: number; r: number; kind: "tree" | "rock" | "mound" };
export type Prop = { id: string; kind: PropKind; x: number; z: number };

/** Layout queries for the active region (see world/region.ts). */
export function treeList(): Obstacle[] {
  return region().trees
    .filter(t => heightAt(t.x, t.z) >= CONFIG.waterY + 0.25)
    .map(t => ({ x: t.x, z: t.z, r: t.kind === "buriti" ? 0.4 : 0.55, kind: "tree" as const }));
}

export function rockList(): Obstacle[] {
  return region().rocks.filter(([x, z]) => heightAt(x, z) > CONFIG.waterY + 0.1).map(([x, z, r]) => ({ x, z, r, kind: "rock" as const }));
}

export function moundList(): Obstacle[] {
  return region().mounds.map(([x, z, r]) => ({ x, z, r, kind: "mound" as const }));
}

export function obstacles(): Obstacle[] {
  const tent = region().camp.tent;
  return [...treeList(), ...rockList(), ...moundList(), ...(tent ? [{ x: tent.x, z: tent.z, r: 0.95, kind: "rock" as const }] : [])];
}

export function props(): Prop[] {
  return region().props.map(p => ({ ...p }));
}

// Mata constants kept for existing callers and tests; runtime code uses region().
export const SPAWNS = MATA_SPAWNS;
export const NESTS = MATA_NESTS;
export const CAMP = MATA_CAMP;
export const PERCH = MATA_PERCH;
