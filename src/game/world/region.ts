import type { SpeciesId } from "../types.ts";

/**
 * Regions are data. Adding a biome means adding one RegionDef file and registering it
 * here; simulation, rendering, minimap, save and camera read everything from the
 * active region. Only one region is loaded at a time (the player travels between them).
 */
export type RegionId = "mata" | "vereda" | "pantanal" | "gruta";

export type TreeKind = "broadleaf" | "buriti" | "twisted" | "caranda";
export type PropKind = "glow" | "berry" | "egg" | "wolfapple";
export type RegionProp = { id: string; kind: PropKind; x: number; z: number };
export type RegionCreature = { id: string; speciesId: SpeciesId; x: number; z: number; hunger: number; thirst: number };
export type RegionExit = { id: string; x: number; z: number; to: RegionId; arrive: { x: number; z: number; yaw: number }; label: string };
export type Circle = { x: number; z: number; r: number };

export type RegionPalette = {
  grassA: [number, number, number];
  grassB: [number, number, number];
  sand: [number, number, number];
  dirt: [number, number, number];
  sky: [number, number, number];
  leaves: [string, string, string];
  trunk: string;
  grass: string;
  water: string;
};

export type RegionDef = {
  id: RegionId;
  name: string;
  biome: string;
  description: string;
  /** Terrain height including the water basin. Pure and deterministic. */
  heightAt: (x: number, z: number) => number;
  water: { x: number; z: number; disc: number; swimRadius: number };
  trail: readonly (readonly [number, number])[];
  trees: readonly { x: number; z: number; kind: TreeKind }[];
  rocks: readonly (readonly [number, number, number])[];
  /** Termite mounds and other solid landmarks: block movement and sight. */
  mounds: readonly (readonly [number, number, number])[];
  props: readonly RegionProp[];
  creatures: readonly RegionCreature[];
  spawn: { x: number; z: number; yaw: number };
  /** Respawn point after fainting; also where born creatures settle. */
  camp: { x: number; z: number; incubator: { x: number; z: number } | null; tent: { x: number; z: number } | null };
  territory: Circle | null;
  /** Where flyers rest outside their activity window; height is above the ground there. */
  perch: { x: number; z: number; height?: number } | null;
  nests: readonly { id: string; x: number; z: number }[];
  burrows: readonly { id: string; x: number; z: number }[];
  /** Flight loop for flying species while active; y is the cruise height above ground. */
  eagleCircuit: { x: number; z: number; rx: number; rz: number; y?: number } | null;
  /** Enclosed regions (caves): a ceiling, walls and constant dim light regardless of the hour. */
  enclosed?: { ceiling: number; light: number };
  exits: readonly RegionExit[];
  sign: { x: number; z: number; text: string };
  palette: RegionPalette;
  labels: readonly { x: number; z: number; text: string; danger?: boolean }[];
  /** Soft circles on the map (groves, feeding grounds). */
  highlights: readonly Circle[];
  guide: string;
};

const registry = new Map<RegionId, RegionDef>();
let active: RegionDef | null = null;

export function registerRegion(def: RegionDef): void {
  registry.set(def.id, def);
  active ??= def;
}

export function regionById(id: RegionId): RegionDef {
  const def = registry.get(id);
  if (!def) throw new Error(`Região desconhecida: ${id}`);
  return def;
}

export function allRegions(): RegionDef[] { return [...registry.values()]; }

/** The region currently loaded. The game sets it on start and on every trip. */
export function region(): RegionDef {
  if (!active) throw new Error("Nenhuma região registrada");
  return active;
}

export function setActiveRegion(id: RegionId): RegionDef {
  active = regionById(id);
  return active;
}

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && registry.has(value as RegionId);
}
