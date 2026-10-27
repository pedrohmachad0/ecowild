import type { CameraMode } from "../types.ts";

export type CameraPoint = { x: number; y: number; z: number };
export type CameraVolume =
  | { kind: "ellipsoid"; center: CameraPoint; radii: CameraPoint }
  | { kind: "cylinder"; center: CameraPoint; radius: number; halfHeight: number };
export type TerrainHeight = (x: number, z: number) => number;
export type CameraBoom = {
  position: CameraPoint;
  distance: number;
  blocked: boolean;
  startedInside: boolean;
};

const EPSILON = 1e-7;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** First intersection of an orbit segment with a finite vertical cylinder. */
function cylinderEntry(origin: CameraPoint, delta: CameraPoint, volume: Extract<CameraVolume, { kind: "cylinder" }>, padding: number): number | null {
  const radius = volume.radius + padding;
  const halfHeight = volume.halfHeight + padding;
  const x = origin.x - volume.center.x, z = origin.z - volume.center.z;
  const y = origin.y - volume.center.y;
  let low = 0, high = 1;
  if (Math.abs(delta.y) < EPSILON) {
    if (Math.abs(y) > halfHeight) return null;
  } else {
    const a = (-halfHeight - y) / delta.y, b = (halfHeight - y) / delta.y;
    low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b));
  }
  const a = delta.x * delta.x + delta.z * delta.z;
  const b = 2 * (x * delta.x + z * delta.z);
  const c = x * x + z * z - radius * radius;
  if (a < EPSILON) {
    if (c > 0) return null;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant);
    low = Math.max(low, (-b - root) / (2 * a));
    high = Math.min(high, (-b + root) / (2 * a));
  }
  return low <= high && high >= 0 && low <= 1 ? clamp01(low) : null;
}

/** Inflate uniformly in normalized space: conservatively contains a clearance sphere. */
function ellipsoidEntry(origin: CameraPoint, delta: CameraPoint, volume: Extract<CameraVolume, { kind: "ellipsoid" }>, padding: number): number | null {
  const factor = 1 + padding / Math.min(volume.radii.x, volume.radii.y, volume.radii.z);
  const rx = volume.radii.x * factor, ry = volume.radii.y * factor, rz = volume.radii.z * factor;
  const x = (origin.x - volume.center.x) / rx;
  const y = (origin.y - volume.center.y) / ry;
  const z = (origin.z - volume.center.z) / rz;
  const dx = delta.x / rx, dy = delta.y / ry, dz = delta.z / rz;
  const a = dx * dx + dy * dy + dz * dz;
  const b = 2 * (x * dx + y * dy + z * dz);
  const c = x * x + y * y + z * z - 1;
  if (c <= 0) return 0;
  if (a < EPSILON) return null;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
  return entry >= 0 && entry <= 1 ? entry : null;
}

/**
 * Conservative geometric proxies, including the camera near-plane clearance.
 * Terrain is sampled every <= 25 cm and bisected at the first crossing. This is
 * not a triangle raycast; matching the visible scene volumes keeps it inexpensive.
 * If the pivot starts inside geometry, retract to it rather than jump through it.
 */
export function resolveBoom(
  pivot: CameraPoint,
  desired: CameraPoint,
  volumes: readonly CameraVolume[],
  terrain?: TerrainHeight,
  clearance = 0.24,
): CameraBoom {
  const delta = { x: desired.x - pivot.x, y: desired.y - pivot.y, z: desired.z - pivot.z };
  const length = Math.hypot(delta.x, delta.y, delta.z);
  let nearest = 1;
  for (const volume of volumes) {
    const entry = volume.kind === "ellipsoid"
      ? ellipsoidEntry(pivot, delta, volume, clearance)
      : cylinderEntry(pivot, delta, volume, clearance);
    if (entry !== null) nearest = Math.min(nearest, entry);
  }
  if (terrain) {
    const below = (t: number) => pivot.y + delta.y * t < terrain(pivot.x + delta.x * t, pivot.z + delta.z * t) + clearance;
    if (below(0)) nearest = 0;
    else {
      const steps = Math.max(1, Math.min(128, Math.ceil(length * nearest / 0.25)));
      let previous = 0;
      for (let i = 1; i <= steps; i++) {
        const t = nearest * i / steps;
        if (below(t)) {
          let low = previous, high = t;
          for (let j = 0; j < 9; j++) {
            const mid = (low + high) / 2;
            if (below(mid)) high = mid; else low = mid;
          }
          nearest = low;
          break;
        }
        previous = t;
      }
    }
  }
  // Stay just ahead of a hit plane; avoids precision flicker on contact.
  const safe = nearest < 1 && length > EPSILON ? Math.max(0, nearest - 0.015 / length) : nearest;
  return {
    position: { x: pivot.x + delta.x * safe, y: pivot.y + delta.y * safe, z: pivot.z + delta.z * safe },
    distance: length * safe,
    blocked: nearest < 1,
    startedInside: nearest === 0,
  };
}

/**
 * Smooth only the boom's length, not its world position. Retract immediately,
 * extend gently, and use the current orbit so interpolation never cuts a corner
 * through a tree while the player rotates or walks around it.
 */
export function advanceBoom(
  pivot: CameraPoint,
  desired: CameraPoint,
  previousDistance: number,
  dt: number,
  volumes: readonly CameraVolume[],
  terrain?: TerrainHeight,
  clearance = 0.24,
): CameraBoom {
  const safe = resolveBoom(pivot, desired, volumes, terrain, clearance);
  const previous = Math.max(0, Number.isFinite(previousDistance) ? previousDistance : safe.distance);
  if (safe.distance <= previous || safe.distance < EPSILON) return safe;
  const rate = 1 - Math.exp(-7 * Math.max(0, Math.min(dt, 0.1)));
  const distance = previous + (safe.distance - previous) * rate;
  const ratio = distance / safe.distance;
  const eased = {
    x: pivot.x + (safe.position.x - pivot.x) * ratio,
    y: pivot.y + (safe.position.y - pivot.y) * ratio,
    z: pivot.z + (safe.position.z - pivot.z) * ratio,
  };
  // Revalidate even the eased position: the player/pivot may have moved this tick.
  const result = resolveBoom(pivot, eased, volumes, terrain, clearance);
  return { ...result, blocked: safe.blocked || result.blocked };
}

/** Call after every look update and when switching modes, even while paused. */
export function clampCameraPitch(pitch: number, mode: CameraMode): number {
  return Math.max(mode === "first" ? -0.9 : 0.12, Math.min(1.15, pitch));
}
