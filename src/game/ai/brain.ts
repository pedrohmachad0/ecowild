import type { AiState, Diet, PetCommand, SpeciesId, Temperament } from "../types.ts";

export type Stimulus = {
  speciesId: SpeciesId;
  diet: Diet;
  temperament: Temperament;
  fleeRadius: number;
  hunger: number;
  thirst: number;
  fear: number;
  energy: number;
  threatDist: number | null;
  preyDist: number | null;
  foodDist: number | null;
  waterDist: number;
  playerDist: number;
  playerSprinting: boolean;
  inTerritory: boolean;
  tamed: boolean;
  command: PetCommand | null;
  preferIdle: boolean;
};

/**
 * Priority selector. Deterministic: same stimulus always yields the same state.
 * Ticked by the sim at AI frequency, not every frame.
 */
export function decide(s: Stimulus): AiState {
  if (s.tamed && s.command === "STAY") return "IDLE";
  if (s.tamed && (s.command === "FOLLOW" || s.command === "RETURN")) return "FOLLOW_OWNER";
  if (s.tamed && s.command === "PROTECT") return "PROTECT_OWNER";

  const playerScare =
    (s.temperament === "skittish" && s.playerDist < s.fleeRadius) ||
    (s.temperament === "calm" && s.playerSprinting && s.playerDist < s.fleeRadius) ||
    (s.temperament === "curious" && s.playerSprinting && s.playerDist < s.fleeRadius);

  const predatorClose = s.threatDist != null && s.threatDist < Math.max(6, s.fleeRadius);
  const panicked = s.fear > 0.55 || predatorClose || playerScare;

  if (!s.tamed && panicked) {
    const wolfHolds =
      s.temperament === "territorial" && s.fear < 0.55 && !predatorClose && s.playerDist < 12;
    if (!wolfHolds) return "FLEE";
  }

  if (s.temperament === "territorial" && s.inTerritory && s.playerDist < 8 && s.fear < 0.45) {
    return "DEFEND";
  }

  if (s.diet === "carnivore" && s.preyDist != null && s.preyDist < 16 && s.hunger > 0.42 && s.fear < 0.4) {
    return "CHASE";
  }

  if (s.diet !== "carnivore" && s.hunger > 0.68 && s.foodDist != null) {
    return s.foodDist < 1.25 ? "EAT" : "SEARCH_FOOD";
  }

  if (s.thirst > 0.66) return "DRINK";
  if (s.energy < 0.22) return "REST";
  if (s.preferIdle) return "IDLE";
  return "WANDER";
}
