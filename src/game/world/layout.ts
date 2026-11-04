import { heightAt } from "./terrain.ts";
import { CONFIG } from "../config.ts";

export type Obstacle = { x: number; z: number; r: number; kind: "tree" | "rock" };
export type Prop = { id: string; kind: "glow" | "berry" | "egg"; x: number; z: number };

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
  return [...treeList(), ...rockList(), { x: CAMP.tent.x, z: CAMP.tent.z, r: 0.95, kind: "rock" }];
}

export const NESTS = [
  { id: "nest-0", x: 4.5, z: -19.5 },
  { id: "nest-1", x: 16.5, z: -22 },
] as const;

/** Research camp at the clearing: respawn point and warmed nest (incubator). */
export const CAMP = { x: -4.5, z: 20.5, incubator: { x: -3.2, z: 19.2 }, tent: { x: -5.6, z: 21.6 } } as const;

/** Lit perch where the eagle rests at night. */
export const PERCH = { x: 20, z: 11 } as const;

export function props(): Prop[] {
  return [
    { id: "glow-0", kind: "glow", x: -8, z: -4 },
    { id: "glow-1", kind: "glow", x: -13, z: -8 },
    { id: "glow-2", kind: "glow", x: -6.5, z: -10 },
    { id: "berry-0", kind: "berry", x: -2, z: 12 },
    { id: "berry-1", kind: "berry", x: 11, z: 14 },
    { id: "berry-2", kind: "berry", x: -16, z: 6 },
    // Moved out of the lake: at (3, -2) the bush stood in deep water.
    { id: "berry-3", kind: "berry", x: -1, z: -3 },
    { id: "berry-4", kind: "berry", x: 10, z: -20 },
    { id: "berry-5", kind: "berry", x: 22, z: 2 },
    // Fantasy rule: mosslight nests hold one egg each for the forest's warmth to hatch.
    { id: "egg-0", kind: "egg", x: NESTS[0]!.x, z: NESTS[0]!.z },
    { id: "egg-1", kind: "egg", x: NESTS[1]!.x, z: NESTS[1]!.z },
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
  armadillo: [
    { id: "armadillo-1", x: 26, z: 4 },
    { id: "armadillo-2", x: 23.5, z: -6.5 },
  ],
  toad: [
    { id: "toad-1", x: 1.6, z: 5.7 },
    { id: "toad-2", x: 13.8, z: 5.3 },
  ],
  fish: [
    { id: "fish-1", x: 7, z: 1 },
    { id: "fish-2", x: 9, z: 3 },
    { id: "fish-3", x: 8.5, z: 0.5 },
    { id: "fish-4", x: 6.5, z: 3.2 },
  ],
  tegu: [
    { id: "tegu-1", x: 16.8, z: 5.6 },
    { id: "tegu-2", x: -1.4, z: 10.2 },
  ],
  mosslight: [
    { id: "moss-1", x: 9, z: -21 },
    { id: "moss-2", x: 13, z: -24 },
  ],
  territory: { x: -16.5, z: -15.5, r: 9 },
} as const;
