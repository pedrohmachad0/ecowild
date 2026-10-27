import { OBSERVATION_RULES, observationRange } from "../catalog/discoveries.ts";

export const BOND_RULES = { range: 2.4, calmRange: 5.4, trust: 58, observation: OBSERVATION_RULES.seconds, fear: 0.45 } as const;
export function bondReadiness(p: { trust: number; observedSeconds: number; dist: number; sprinting: boolean; threatened: boolean; hasFruit: boolean; tamed: boolean }): { ready: boolean; message: string } {
  if (p.tamed) return { ready: false, message: "Vínculo formado. Use os comandos na pausa." };
  if (p.sprinting || p.threatened) return { ready: false, message: "Ela está assustada. Pare de correr e afaste as ameaças." };
  if (p.observedSeconds < BOND_RULES.observation) return { ready: false, message: p.dist >= observationRange("auryn") ? "Aproxime-se andando para observar a Auryn." : `Observe sem se mover: ${Math.floor(p.observedSeconds)}/${BOND_RULES.observation} s.` };
  if (p.trust < BOND_RULES.trust) return { ready: false, message: p.dist >= BOND_RULES.calmRange ? "Aproxime-se andando para conquistar confiança." : `Aguarde com calma. Confiança ${Math.floor(p.trust)}/${BOND_RULES.trust}.` };
  if (!p.hasFruit) return { ready: false, message: "Ela confia em você. Colha um frutiluz no bosque." };
  if (p.dist >= BOND_RULES.range) return { ready: false, message: "Aproxime-se andando para oferecer o frutiluz." };
  return { ready: true, message: "Ela está pronta. Interaja para oferecer um frutiluz." };
}

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
  } else if (p.dist < BOND_RULES.calmRange && !p.sprinting) {
    const gain = (p.moving ? 4.5 : 9.5) * p.dt * 1;
    if (trust < 68) trust = Math.min(68, trust + gain);
  }
  if (p.offer && p.dist < BOND_RULES.range && !p.sprinting && !p.threatened && p.observed && trust >= BOND_RULES.trust) {
    trust = 100;
    consumed = true;
  }
  trust = Math.max(0, Math.min(100, trust));
  const tamed = trust >= 100;
  return { trust, tamed, consumed, startled, bonded: tamed };
}
