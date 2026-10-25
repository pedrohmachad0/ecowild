import { heightAt } from "./terrain.ts";
import { CONFIG } from "../config.ts";

export type Obstacle = { x: number; z: number; r: number; kind: "tree" | "rock" };
export type Prop = { id: string; kind: "glow" | "berry"; x: number; z: number };

const TREE_SPOTS: readonly (readonly [number, number, number])[] = [
  [-7, 23, 1.05],
  [-15, 19, 1.2],
  [9, 24, 0.95],
  [17, 19, 1.15],
  [20, 11, 1],
  [-21, 9, 1.25],
  [-23, 0, 1.1],
  [-24, -8, 1.2],
  [-16, -11, 1],
  [21, -2, 1.15],
  [23, 7, 0.9],
  [-8, -20, 1.2],
  [1, -22, 1.05],
  [14, -16, 1.1],
  [-5, 7, 0.85],
  [16, -8, 1],
  [-19, 15, 1.15],
  [7, -12, 0.95],
  [-11, 3, 1.05],
  [25, -12, 1.1],
  [-27, 4, 1.2],
  [3, 27, 1],
  [12, 9, 0.8],
  [-2, -14, 1.1],
];

const ROCK_SPOTS: readonly (readonly [number, number, number])[] = [
  [5, 16, 0.7],
  [-3, 9, 0.55],
  [15, 4, 0.8],
  [-13, -1, 0.65],
  [1, -8, 0.5],
  [-20, -13, 0.9],
  [18, 14, 0.6],
];

export function treeList(): Obstacle[] {
  const out: Obstacle[] = [];
  for (const [x, z] of TREE_SPOTS) {
    if (heightAt(x, z) < CONFIG.waterY + 0.25) continue;
    if (Math.hypot(x - 0, z - 18) < 3.2) continue;
    out.push({ x, z, r: 0.55, kind: "tree" });
  }
  return out;
}

export function rockList(): Obstacle[] {
  return ROCK_SPOTS.filter(([x, z]) => heightAt(x, z) > CONFIG.waterY + 0.1).map(([x, z, r]) => ({
    x,
    z,
    r,
    kind: "rock" as const,
  }));
}

export function obstacles(): Obstacle[] {
  return [...treeList(), ...rockList()];
}

export function props(): Prop[] {
  return [
    { id: "glow-0", kind: "glow", x: -8, z: -4 },
    { id: "glow-1", kind: "glow", x: -13, z: -8 },
    { id: "glow-2", kind: "glow", x: -6.5, z: -10 },
    { id: "berry-0", kind: "berry", x: -2, z: 12 },
    { id: "berry-1", kind: "berry", x: 11, z: 14 },
    { id: "berry-2", kind: "berry", x: -16, z: 6 },
    { id: "berry-3", kind: "berry", x: 3, z: -2 },
  ];
}

export const SPAWNS = {
  player: { x: 0, z: 18 },
  capybara: [
    { id: "capy-1", x: 6.2, z: 5.2 },
    { id: "capy-2", x: 10.4, z: 0.4 },
    { id: "capy-3", x: 4.2, z: -0.6 },
  ],
  rabbit: [
    { id: "rabbit-1", x: -2, z: 14 },
    { id: "rabbit-2", x: 3.2, z: 11 },
    { id: "rabbit-3", x: -7, z: 12.5 },
    { id: "rabbit-4", x: 12, z: 16 },
  ],
  wolf: [
    { id: "wolf-1", x: -18, z: -14 },
    { id: "wolf-2", x: -15, z: -17.2 },
  ],
  eagle: { id: "eagle-1", x: 2, z: 4 },
  auryn: { id: "auryn-1", x: -10, z: -6 },
  territory: { x: -16.5, z: -15.5, r: 9 },
} as const;
