export interface MovementVector {
  x: number;
  y: number;
}

export function normalizeMovement(x: number, y: number): MovementVector {
  const magnitude = Math.max(1, Math.hypot(x, y));
  return { x: x / magnitude, y: y / magnitude };
}
