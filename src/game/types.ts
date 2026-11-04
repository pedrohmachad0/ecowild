import type { RegionId } from "./world/region.ts";

export type SpeciesId =
  | "capybara"
  | "rabbit"
  | "wolf"
  | "eagle"
  | "auryn"
  | "armadillo"
  | "toad"
  | "fish"
  | "tegu"
  | "mosslight"
  | "anteater"
  | "seriema"
  | "manedwolf"
  | "brasalume"
  | "caiman"
  | "jabiru";

export type AiState =
  | "IDLE"
  | "WANDER"
  | "SEARCH_FOOD"
  | "EAT"
  | "DRINK"
  | "REST"
  | "FLEE"
  | "CHASE"
  | "DEFEND"
  | "FOLLOW_OWNER"
  | "PROTECT_OWNER"
  | "RETURN_HOME";

export type PetCommand = "FOLLOW" | "STAY" | "RETURN" | "PROTECT";

export type Temperament = "calm" | "skittish" | "territorial" | "curious" | "predatory";

export type Diet = "herbivore" | "carnivore" | "frugivore" | "omnivore" | "insectivore";

/** When a species is naturally active in the day cycle. */
export type ActiveWindow = "day" | "night" | "twilight" | "any";

export type QualityName = "low" | "medium" | "high" | "auto";

export type AppliedTier = "low" | "medium" | "high";

export type CameraMode = "third" | "first";

export type DiscoveryFlags = {
  seen: boolean;
  habitat: boolean;
  behavior: boolean;
  interacted: boolean;
};

/** Released schema v1. Kept for migration; the game writes SaveData (v2). */
export type SaveV1 = {
  version: 1;
  player: { x: number; y: number; z: number; yaw: number; health: number; energy: number; thirst: number };
  inventory: { glowfruit: number; berries: number };
  picked: Record<string, boolean>;
  discoveries: Partial<Record<SpeciesId, DiscoveryFlags>>;
  pet: { name: string; xp: number; command: PetCommand } | null;
  creatures: Record<string, { x: number; z: number; hunger: number; thirst: number; fear: number; energy: number; trust: number; tamed: boolean }>;
  settings: { quality: QualityName; lookSens: number };
  seconds: number;
};

export type SavedCreature = {
  x: number; z: number; hunger: number; thirst: number; fear: number; energy: number; trust: number; tamed: boolean;
  /** Present only for creatures born in play (hatchlings), which have no spawn entry. */
  speciesId?: SpeciesId;
  /** Present when the creature is not in its home region (travelling companions, hatchlings). */
  region?: RegionId;
};

export type SavedPet = { id: string; speciesId: SpeciesId; name: string; xp: number; command: PetCommand };

export type SavedPhoto = { image: string; state: AiState; seconds: number };

/** Current schema. v1 saves are migrated on load and never written again. */
export type SaveV2 = {
  version: 2;
  player: { x: number; y: number; z: number; yaw: number; health: number; energy: number; thirst: number };
  inventory: { glowfruit: number; berries: number; eggs: number };
  picked: Record<string, boolean>;
  discoveries: Partial<Record<SpeciesId, DiscoveryFlags>>;
  pets: SavedPet[];
  creatures: Record<string, SavedCreature>;
  /** Egg warming at the camp; progress 0..1. */
  incubator: { progress: number } | null;
  photos: Partial<Record<SpeciesId, SavedPhoto>>;
  challenges: Record<string, boolean>;
  settings: { quality: QualityName; lookSens: number };
  seconds: number;
};

/** v3: regions. Adds the active region, visited regions and the wolf-apple item. */
export type SaveV3 = Omit<SaveV2, "version" | "inventory"> & {
  version: 3;
  region: RegionId;
  visited: RegionId[];
  inventory: { glowfruit: number; berries: number; eggs: number; wolfapple: number };
};

export type SaveData = SaveV3;
