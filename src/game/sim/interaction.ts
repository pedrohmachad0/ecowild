import type { Simulation, SimCreature, SimProp } from './simulation.ts';
import { BOND_RULES } from '../taming/bond.ts';
import { waterDistance } from '../world/terrain.ts';
export type Interaction = { kind: 'collect'; prop: SimProp } | { kind: 'offer'; creature: SimCreature } | { kind: 'observe'; creature: SimCreature } | { kind: 'drink' } | { kind: 'none' };
/** The prompt and action use the same target and ranges. */
export function interactionTarget(sim: Simulation): Interaction {
  const distance = (p: { x: number; z: number }) => Math.hypot(p.x - sim.player.x, p.z - sim.player.z);
  const available = sim.props.filter(p => !p.taken && p.depleted <= 0 && distance(p) < (p.kind === 'glow' ? 2.35 : 1.9)).sort((a, b) => distance(a) - distance(b));
  if (available[0]) return { kind: 'collect', prop: available[0] };
  const auryn = sim.creatures.find(c => c.speciesId === 'auryn' && !c.tamed);
  if (auryn && distance(auryn) < BOND_RULES.range && sim.inventory.glowfruit > 0) return { kind: 'offer', creature: auryn };
  const creature = sim.creatures.filter(c => distance(c) < (c.speciesId === 'eagle' ? 8 : 2.3)).sort((a, b) => distance(a) - distance(b))[0];
  if (creature) return { kind: 'observe', creature };
  if (sim.player.thirst > 2 && (sim.player.swimming || waterDistance(sim.player.x, sim.player.z) < 1.4)) return { kind: 'drink' };
  return { kind: 'none' };
}
