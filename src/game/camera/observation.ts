import type { SimCreature, Simulation } from "../sim/simulation.ts";
import { assistHint } from "../sim/simulation.ts";
import type { AiState, SpeciesId } from "../types.ts";
import { SPECIES_BY_ID } from "../data/species.ts";
import { ASSISTED_RULES, BOND_RULES, bondReadiness } from "../taming/bond.ts";
import { observationRange } from "../catalog/discoveries.ts";
import { interactionTarget } from "../sim/interaction.ts";

export const PORTRAIT_HEIGHT = Object.fromEntries(Object.values(SPECIES_BY_ID).map(s => [s.id, s.traits.portrait])) as Record<SpeciesId, number>;
const STATES: Record<AiState, string> = { IDLE: "Atento", WANDER: "Explorando", SEARCH_FOOD: "Procurando alimento", EAT: "Comendo", DRINK: "Bebendo", REST: "Descansando", FLEE: "Assustado", CHASE: "Perseguindo", DEFEND: "Defendendo território", FOLLOW_OWNER: "Seguindo você", PROTECT_OWNER: "Protegendo você", RETURN_HOME: "Voltando" };

/** Focus never discovers species or makes an animal safe. It only frames an encounter. */
export function observationTarget(sim: Simulation, focusedId: string | null, visible: (creature: SimCreature) => boolean): SimCreature | null {
  let best: SimCreature | null = null, nearest = focusedId ? 12 : 8;
  for (const creature of sim.creatures) {
    if (focusedId && creature.id !== focusedId) continue;
    if (!sim.discoveries[creature.speciesId]?.seen || creature.hidden) continue;
    const distance = Math.hypot(creature.x - sim.player.x, creature.z - sim.player.z, creature.y - sim.player.y);
    if (distance < nearest && visible(creature)) { nearest = distance; best = creature; }
  }
  return best;
}

export function encounterNote(sim: Simulation, creature: SimCreature, focused: boolean) {
  const profile = SPECIES_BY_ID[creature.speciesId];
  const dist = Math.hypot(creature.x - sim.player.x, creature.z - sim.player.z);
  const bond = profile.tameMethod === "assisted" ? assistedReadiness(sim, creature, dist) : profile.tameMethod === "bond" ? bondReadiness({ trust: creature.trust, observedSeconds: creature.observe, dist, sprinting: sim.player.sprinting, threatened: creature.fear > BOND_RULES.fear, hasFruit: sim.inventory.glowfruit > 0, tamed: creature.tamed }) : null;
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
    photographed: !!sim.photos[creature.speciesId],
  };
}

function assistedReadiness(sim: Simulation, c: SimCreature, dist: number): { ready: boolean; message: string } {
  if (c.tamed) return { ready: false, message: "Companheiro. Use os comandos na pausa." };
  const assist = SPECIES_BY_ID[c.speciesId].assist!;
  const helper = sim.creatures.find(o => o.speciesId === assist.by && o.tamed);
  if (!helper) return { ready: false, message: `Tímido demais. ${assistHint(c.speciesId)}` };
  if (sim.player.sprinting) return { ready: false, message: "Correr o assusta. Ande devagar." };
  if (c.calm <= 0) return { ready: false, message: assistHint(c.speciesId) };
  if (c.observe < ASSISTED_RULES.observation) return { ready: false, message: "Calmo. Fique parado perto dele para observar." };
  if (c.trust < ASSISTED_RULES.trust) return { ready: false, message: `Calmo. Confiança ${Math.floor(c.trust)}/${ASSISTED_RULES.trust}; não se mova.` };
  const offering = SPECIES_BY_ID[c.speciesId].offering ?? "berries";
  if (sim.inventory[offering] <= 0) return { ready: false, message: `Ele confia em você agora. Falta ${offering === "wolfapple" ? "fruta-do-lobo" : "um fruto da mata"} na bolsa.` };
  if (dist >= ASSISTED_RULES.range) return { ready: false, message: "Aproxime-se devagar para oferecer o fruto." };
  return { ready: true, message: "Pronto. Interaja para oferecer o fruto antes que a calma passe." };
}
