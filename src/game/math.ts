export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Camera-relative basis. yaw 0 faces world −Z; +yaw turns the nose left. */
export function basis(yaw: number): { fx: number; fz: number; rx: number; rz: number } {
  return {
    fx: -Math.sin(yaw),
    fz: -Math.cos(yaw),
    rx: Math.cos(yaw),
    rz: -Math.sin(yaw),
  };
}

export function radialDeadzone(x: number, y: number, dz = 0.18): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m < dz || m === 0) return { x: 0, y: 0 };
  const mag = Math.min(1, (m - dz) / (1 - dz));
  return { x: (x / m) * mag, y: (y / m) * mag };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function distToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1;
  const t = clamp(((px - ax) * abx + (pz - az) * abz) / len2, 0, 1);
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  obstacles: readonly { x: number; z: number; r: number }[],
  worldRadius: number,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const o of obstacles) {
    const dx = px - o.x;
    const dz = pz - o.z;
    const min = radius + o.r;
    const d = Math.hypot(dx, dz);
    if (d < min) {
      if (d < 1e-4) {
        px += min;
      } else {
        const push = (min - d) / d;
        px += dx * push;
        pz += dz * push;
      }
    }
  }
  const w = Math.hypot(px, pz);
  if (w > worldRadius) {
    px = (px / w) * worldRadius;
    pz = (pz / w) * worldRadius;
  }
  return { x: px, z: pz };
}
