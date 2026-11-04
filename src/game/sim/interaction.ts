import type { Simulation, SimCreature, SimProp } from './simulation.ts';
import { BOND_RULES } from '../taming/bond.ts';
import { waterDistance } from '../world/terrain.ts';
import { SPECIES_BY_ID } from '../data/species.ts';
import { region } from '../world/region.ts';
import type { RegionExit } from '../world/region.ts';
export type Interaction =
  | { kind: 'collect'; prop: SimProp }
  | { kind: 'offer'; creature: SimCreature }
  | { kind: 'incubate' }
  | { kind: 'warming' }
  | { kind: 'observe'; creature: SimCreature }
  | { kind: 'drink' }
  | { kind: 'travel'; exit: RegionExit }
  | { kind: 'none' };
const profile = (c: SimCreature) => SPECIES_BY_ID[c.speciesId];
/** The prompt and action use the same target and ranges. */
export function interactionTarget(sim: Simulation): Interaction {
  const distance = (p: { x: number; z: number }) => Math.hypot(p.x - sim.player.x, p.z - sim.player.z);
  const available = sim.props.filter(p => !p.taken && p.depleted <= 0 && distance(p) < (p.kind === 'berry' ? 1.9 : 2.35)).sort((a, b) => distance(a) - distance(b));
  if (available[0]) return { kind: 'collect', prop: available[0] };
  const exit = region().exits.find(e => distance(e) < 2.4);
  if (exit) return { kind: 'travel', exit };
  const incubator = region().camp.incubator;
  if (incubator && distance(incubator) < 2.2) {
    if (sim.incubator) return { kind: 'warming' };
    if (sim.inventory.eggs > 0) return { kind: 'incubate' };
  }
  const offerable = sim.creatures.filter(c => {
    const profile = SPECIES_BY_ID[c.speciesId];
    if (c.tamed || profile.tameMethod === 'none' || !profile.offering) return false;
    return distance(c) < BOND_RULES.range && sim.inventory[profile.offering] > 0;
  }).sort((a, b) => distance(a) - distance(b));
  if (offerable[0]) return { kind: 'offer', creature: offerable[0] };
  const creature = sim.creatures.filter(c => !c.hidden && !(c.tamed && c.born) && distance(c) < (profile(c).traits.flies ? 8 : profile(c).traits.aquatic ? 3.2 : 2.3)).sort((a, b) => distance(a) - distance(b))[0];
  if (creature) return { kind: 'observe', creature };
  if (sim.player.thirst > 2 && (sim.player.swimming || waterDistance(sim.player.x, sim.player.z) < 1.4)) return { kind: 'drink' };
  return { kind: 'none' };
}
