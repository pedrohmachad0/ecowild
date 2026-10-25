export type BondInput = {
  trust: number;
  tamed: boolean;
  dist: number;
  sprinting: boolean;
  moving: boolean;
  offer: boolean;
  observed: boolean;
  socialAssist: boolean;
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
 * a frutiluz offered after that study pushes it over the threshold.
 * A nearby social pet increases the rate (domesticação assistida) but still cannot skip the offer.
 */
export function stepBond(p: BondInput): BondResult {
  if (p.tamed) {
    return { trust: 100, tamed: true, consumed: false, startled: false, bonded: false };
  }
  let trust = p.trust;
  let startled = false;
  let consumed = false;
  if (p.dist < 7 && p.sprinting) {
    trust -= 28 * p.dt;
    startled = true;
  } else if (p.dist < 5.4 && !p.sprinting) {
    const gain = (p.moving ? 4.5 : 9.5) * p.dt * (p.socialAssist ? 1.35 : 1);
    if (trust < 68) trust = Math.min(68, trust + gain);
  }
  if (p.offer && p.dist < 2.4 && !p.sprinting) {
    const studied = p.observed || trust >= 24;
    trust += studied ? 42 : 14;
    consumed = true;
  }
  trust = Math.max(0, Math.min(100, trust));
  const tamed = trust >= 100;
  return { trust, tamed, consumed, startled, bonded: tamed };
}
