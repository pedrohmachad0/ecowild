import type { SimCreature, Simulation } from "../sim/simulation.ts";
import type { AiState, SpeciesId } from "../types.ts";
import { SPECIES_BY_ID } from "../data/species.ts";
import { BOND_RULES, bondReadiness } from "../taming/bond.ts";
import { observationRange } from "../catalog/discoveries.ts";
import { interactionTarget } from "../sim/interaction.ts";

export const PORTRAIT_HEIGHT: Record<SpeciesId, number> = { capybara: 0.6, rabbit: 0.38, wolf: 0.75, eagle: 0, auryn: 0.65 };
const STATES: Record<AiState, string> = { IDLE: "Atento", WANDER: "Explorando", SEARCH_FOOD: "Procurando alimento", EAT: "Comendo", DRINK: "Bebendo", REST: "Descansando", FLEE: "Assustado", CHASE: "Perseguindo", DEFEND: "Defendendo território", FOLLOW_OWNER: "Seguindo você", PROTECT_OWNER: "Protegendo você", RETURN_HOME: "Voltando" };

/** Focus never discovers species or makes an animal safe. It only frames an encounter. */
export function observationTarget(sim: Simulation, focusedId: string | null, visible: (creature: SimCreature) => boolean): SimCreature | null {
  let best: SimCreature | null = null, nearest = focusedId ? 12 : 8;
  for (const creature of sim.creatures) {
    if (focusedId && creature.id !== focusedId) continue;
    if (!sim.discoveries[creature.speciesId]?.seen) continue;
    const distance = Math.hypot(creature.x - sim.player.x, creature.z - sim.player.z, creature.y - sim.player.y);
    if (distance < nearest && visible(creature)) { nearest = distance; best = creature; }
  }
  return best;
}

export function encounterNote(sim: Simulation, creature: SimCreature, focused: boolean) {
  const profile = SPECIES_BY_ID[creature.speciesId];
  const dist = Math.hypot(creature.x - sim.player.x, creature.z - sim.player.z);
  const bond = creature.speciesId === "auryn" ? bondReadiness({ trust: creature.trust, observedSeconds: creature.observe, dist, sprinting: sim.player.sprinting, threatened: creature.fear > BOND_RULES.fear, hasFruit: sim.inventory.glowfruit > 0, tamed: creature.tamed }) : null;
  // Collection keeps its existing priority. Do not advertise an offer until E
  // actually targets this animal, even when its trust requirements are met.
  const target = bond?.ready ? interactionTarget(sim) : null;
  const offerBlocked = bond?.ready && (target?.kind !== "offer" || target.creature.id !== creature.id);
  const observationMessage = sim.discoveries[creature.speciesId]?.behavior ? "Comportamento registrado. Consulte o diário." : dist >= observationRange(creature.speciesId) ? "Aproxime-se andando para registrar o comportamento." : "Fique parado para registrar o comportamento no diário.";
  return {
    id: creature.id,
    name: creature.tamed ? creature.name || profile.name : profile.name,
    state: STATES[creature.state],
    focused,
    ready: (bond?.ready ?? false) && !offerBlocked,
    message: offerBlocked ? "Há um fruto ao alcance. Colha-o ou afaste-se dele antes de oferecer." : bond?.message ?? (creature.speciesId === "wolf" ? "Mantenha distância. Observar não impede ataques." : observationMessage),
  };
}
