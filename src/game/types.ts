export type SpeciesId = "capybara" | "rabbit" | "wolf" | "eagle" | "auryn";

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

export type Diet = "herbivore" | "carnivore" | "frugivore";

export type QualityName = "low" | "medium" | "high" | "auto";

export type AppliedTier = "low" | "medium" | "high";

export type CameraMode = "third" | "first";

export type DiscoveryFlags = {
  seen: boolean;
  habitat: boolean;
  behavior: boolean;
  interacted: boolean;
};

export type SaveV1 = {
  version: 1;
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    health: number;
    energy: number;
    thirst: number;
  };
  inventory: { glowfruit: number; berries: number };
  picked: Record<string, boolean>;
  discoveries: Partial<Record<SpeciesId, DiscoveryFlags>>;
  pet: { name: string; xp: number; command: PetCommand } | null;
  creatures: Record<
    string,
    { x: number; z: number; hunger: number; thirst: number; fear: number; energy: number; trust: number; tamed: boolean }
  >;
  settings: { quality: QualityName; lookSens: number };
  seconds: number;
};
