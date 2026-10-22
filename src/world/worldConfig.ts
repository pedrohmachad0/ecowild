export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldPoint {
  x: number;
  z: number;
}

export interface PathDefinition extends WorldPoint {
  length: number;
  width: number;
  rotation: number;
}

export interface RockDefinition extends WorldPoint {
  scale: number;
}

export interface TreeDefinition extends WorldPoint {
  scale: number;
}

export const MATA_BOUNDS: WorldBounds = {
  minX: -48,
  maxX: 48,
  minZ: -48,
  maxZ: 48,
};

export const MATA_LAKE = {
  x: 15,
  z: -10,
  width: 22,
  depth: 14,
} as const;

export const MATA_PATHS: readonly PathDefinition[] = [
  { x: -12, z: 2, length: 70, width: 4, rotation: 0.24 },
  { x: 9, z: 22, length: 48, width: 3.5, rotation: -0.65 },
  { x: 25, z: -14, length: 32, width: 3, rotation: 1.35 },
];

export const MATA_ROCKS: readonly RockDefinition[] = [
  { x: -20, z: -13, scale: 1.3 },
  { x: -14, z: -16, scale: 0.8 },
  { x: 2, z: 18, scale: 1.1 },
  { x: 32, z: 14, scale: 1.5 },
  { x: 37, z: -27, scale: 0.9 },
  { x: -34, z: 28, scale: 1.2 },
];

export const MATA_TREES: readonly TreeDefinition[] = [
  { x: -38, z: -36, scale: 1.1 },
  { x: -27, z: -31, scale: 0.9 },
  { x: -8, z: -37, scale: 1.2 },
  { x: 12, z: -36, scale: 0.95 },
  { x: 34, z: -37, scale: 1.15 },
  { x: 43, z: -20, scale: 0.8 },
  { x: -39, z: -3, scale: 1.25 },
  { x: -35, z: 16, scale: 0.95 },
  { x: -43, z: 38, scale: 1.15 },
  { x: -19, z: 38, scale: 0.9 },
  { x: 6, z: 39, scale: 1.2 },
  { x: 31, z: 35, scale: 1 },
  { x: 43, z: 29, scale: 0.85 },
];

export function clampToWorldBounds(position: WorldPoint, bounds: WorldBounds = MATA_BOUNDS): WorldPoint {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z)),
  };
}
