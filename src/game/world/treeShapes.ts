import type { TreeKind } from "./region.ts";

/**
 * Tree proportions shared by the renderer and the camera collision proxies, so a new
 * tree kind only needs one entry here. Values are at scale 1; y is above the ground.
 */
export type TreeShape = {
  trunk: { height: number; diameter: number; topScale: number };
  crowns: readonly { x: number; y: number; z: number; diameter: number; sx: number; sy: number; sz: number }[];
  /** Collision radius at the feet. */
  radius: number;
};

export const TREE_SHAPES: Record<TreeKind, TreeShape> = {
  broadleaf: {
    trunk: { height: 3.7, diameter: 0.85, topScale: 1 },
    crowns: [{ x: 0, y: 4.1, z: 0, diameter: 3.4, sx: 1.05, sy: 0.85, sz: 1 }, { x: 0.35, y: 3.4, z: 0.2, diameter: 2.4, sx: 1, sy: 0.8, sz: 1 }],
    radius: 0.55,
  },
  // Buriti (Mauritia flexuosa): tall straight stipe with a round fan crown.
  buriti: {
    trunk: { height: 6.4, diameter: 0.5, topScale: 0.8 },
    crowns: [{ x: 0, y: 6.6, z: 0, diameter: 3.4, sx: 1, sy: 0.42, sz: 1 }, { x: 0, y: 6.2, z: 0, diameter: 1.4, sx: 1, sy: 1, sz: 1 }],
    radius: 0.4,
  },
  // Carandá (Copernicia alba): Pantanal fan palm, shorter and slimmer than the buriti.
  caranda: {
    trunk: { height: 4.6, diameter: 0.38, topScale: 0.85 },
    crowns: [{ x: 0, y: 4.8, z: 0, diameter: 2.4, sx: 1, sy: 0.5, sz: 1 }, { x: 0, y: 4.5, z: 0, diameter: 1, sx: 1, sy: 1, sz: 1 }],
    radius: 0.35,
  },
  // Cerrado tree: short, crooked trunk with a wide, flat crown.
  twisted: {
    trunk: { height: 2.5, diameter: 0.55, topScale: 0.7 },
    crowns: [{ x: 0.2, y: 2.9, z: 0, diameter: 3.4, sx: 1.15, sy: 0.48, sz: 0.95 }, { x: -0.6, y: 2.5, z: -0.3, diameter: 2, sx: 1, sy: 0.55, sz: 1 }],
    radius: 0.5,
  },
};

export function treeScale(index: number): number {
  return 0.9 + ((index * 17) % 5) * 0.08;
}

/** Termite mound height for a given footprint radius. */
export const moundHeight = (r: number) => r * 2.3;
