export type BondInput = {
  trust: number;
  tamed: boolean;
  dist: number;
  sprinting: boolean;
  moving: boolean;
  offer: boolean;
  observed: boolean;
  socialAssist: boolean;
  threatened?: boolean;
  dt: number;
};

export type BondResult = {
  trust: number;
  tamed: boolean;
  consumed: boolean;
  startled: boolean;
  bonded: boolean;
};

/**
 * Feeding alone cannot finish a bond. Calm presence fills trust only up to a cap;
 * one frutiluz is accepted only after observation and sufficient calm trust.
 */
export function stepBond(p: BondInput): BondResult {
  if (p.tamed) {
    return { trust: 100, tamed: true, consumed: false, startled: false, bonded: false };
  }
  let trust = p.trust;
  let startled = false;
  let consumed = false;
  if (p.dist < 7 && (p.sprinting || p.threatened)) {
    trust -= 28 * p.dt;
    startled = true;
  } else if (p.dist < 5.4 && !p.sprinting) {
    const gain = (p.moving ? 4.5 : 9.5) * p.dt * 1;
    if (trust < 68) trust = Math.min(68, trust + gain);
  }
  if (p.offer && p.dist < 2.4 && !p.sprinting && !p.threatened && p.observed && trust >= 58) {
    trust = 100;
    consumed = true;
  }
  trust = Math.max(0, Math.min(100, trust));
  const tamed = trust >= 100;
  return { trust, tamed, consumed, startled, bonded: tamed };
}
