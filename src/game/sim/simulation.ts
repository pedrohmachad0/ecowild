import { interactionTarget } from "./interaction.ts";
import { decide } from "../ai/brain.ts";
import { CONFIG } from "../config.ts";
import { SPECIES_BY_ID } from "../data/species.ts";
import { noteBehavior, noteInteraction, noteSight, OBSERVATION_RULES, observationRange } from "../catalog/discoveries.ts";
import { basis, clamp, lerpAngle, mulberry32, resolveCircle } from "../math.ts";
import { emptyDiscovery } from "../persistence/schema.ts";
import { BOND_RULES, stepBond } from "../taming/bond.ts";
import type { AiState, DiscoveryFlags, PetCommand, SaveData, SavedPhoto, SpeciesId } from "../types.ts";
import { CAMP, PERCH, SPAWNS, obstacles, props as layoutProps } from "../world/layout.ts";
import { dayFraction, daylight, isActive } from "../world/clock.ts";
import { lineOfSight, sightRange } from "./perception.ts";
import { stepAssistedBond, ASSISTED_RULES } from "../taming/bond.ts";
import { updateChallenges } from "../progression/challenges.ts";
import type { Obstacle, Prop } from "../world/layout.ts";
import { heightAt, isDeepWater, waterDistance } from "../world/terrain.ts";

export type SimInput = {
  moveX: number;
  moveZ: number;
  camYaw: number;
  sprint: boolean;
  jumpEdge: boolean;
  interactEdge: boolean;
  useBerryEdge: boolean;
  pet: PetCommand | null;
  discover: boolean;
  /** Clap and shout: light, non-lethal defence that makes nearby wolves back off. */
  shoutEdge?: boolean;
};

export type SimProp = Prop & { taken: boolean; depleted: number };

export type SimCreature = {
  id: string;
  speciesId: SpeciesId;
  x: number;
  z: number;
  y: number;
  yaw: number;
  hunger: number;
  thirst: number;
  fear: number;
  energy: number;
  state: AiState;
  homeX: number;
  homeZ: number;
  tx: number;
  tz: number;
  retarget: number;
  trust: number;
  tamed: boolean;
  command: PetCommand;
  name: string;
  observe: number;
  stuck: number;
  attackCd: number;
  fly: number;
  phase: number;
  xp: number;
  moving: boolean;
  dip: number;
  rng: number;
  startled: number;
  aiAcc: number;
  /** Seconds under Auryn's calm pulse (runtime only, not saved). */
  calm: number;
  /** Companion ability cooldowns in seconds (runtime only). */
  abilityCd: { track: number; calm: number };
  /** Burrowing animals disappear underground while resting at home. */
  hidden: boolean;
  /** Cached at AI rate: the creature has a clear line to the player. */
  seesPlayer: boolean;
  /** Hatchlings are born in play and saved with their species. */
  born: boolean;
};

export type SimToast = { text: string; ttl: number };

/** A temporary lead found by the companion; shown on the map and in the HUD. */
export type SimTrack = { x: number; z: number; label: string; ttl: number };

export type PetAbility = "TRACK" | "CALM";

export type Simulation = {
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    vy: number;
    grounded: boolean;
    swimming: boolean;
    health: number;
    energy: number;
    thirst: number;
    coyote: number;
    jumpBuffer: number;
    iframes: number;
    hurtCd: number;
    speed: number;
    sprinting: boolean;
  };
  creatures: SimCreature[];
  props: SimProp[];
  obstacles: Obstacle[];
  discoveries: Partial<Record<SpeciesId, DiscoveryFlags>>;
  inventory: { glowfruit: number; berries: number; eggs: number };
  toasts: SimToast[];
  prompt: string;
  time: number;
  toastCd: Record<string, number>;
  petName: string;
  /** 0 = no hostile animal close, 1 = a wolf is about to bite. */
  threat: number;
  track: SimTrack | null;
  incubator: { progress: number } | null;
  photos: Partial<Record<SpeciesId, SavedPhoto>>;
  challenges: Record<string, boolean>;
  /** Session counters that feed challenges; not saved (challenge results are). */
  stats: { shooed: number; calmedWolves: number; assisted: number; hatched: number };
  shoutCd: number;
  hatchCount: number;
};

function rngNext(c: SimCreature): number {
  const rand = mulberry32(c.rng || 1)();
  c.rng = Math.floor(rand * 1e9) + 1;
  return rand;
}

function toast(sim: Simulation, key: string, text: string, cooldown = 5): void {
  if ((sim.toastCd[key] ?? 0) > 0) return;
  sim.toastCd[key] = cooldown;
  sim.toasts.push({ text, ttl: 3.4 });
  if (sim.toasts.length > 3) sim.toasts.shift();
}

function makeCreature(
  id: string,
  speciesId: SpeciesId,
  x: number,
  z: number,
  hunger: number,
  thirst: number,
): SimCreature {
  return {
    id,
    speciesId,
    x,
    z,
    y: heightAt(x, z),
    yaw: 0,
    hunger,
    thirst,
    fear: 0,
    energy: 0.85,
    state: "WANDER",
    homeX: x,
    homeZ: z,
    tx: x,
    tz: z,
    retarget: 0,
    trust: 0,
    tamed: false,
    command: "FOLLOW",
    name: SPECIES_BY_ID[speciesId].domesticable ? SPECIES_BY_ID[speciesId].name : "",
    observe: 0,
    stuck: 0,
    attackCd: 0,
    fly: (id.length * 1.7) % 6,
    phase: 0,
    xp: 0,
    moving: false,
    dip: 0,
    rng: id.split("").reduce((a, ch) => a + ch.charCodeAt(0) * 17, 11),
    startled: 0,
    calm: 0,
    abilityCd: { track: 0, calm: 0 },
    hidden: false,
    seesPlayer: false,
    born: false,
    aiAcc: (id.charCodeAt(id.length - 1) % 8) / 64,
  };
}

export function createSim(save: SaveData | null): Simulation {
  const creatures: SimCreature[] = [
    ...SPAWNS.capybara.map((s, i) => makeCreature(s.id, "capybara", s.x, s.z, 0.25, i === 0 ? 0.78 : 0.35)),
    ...SPAWNS.rabbit.map((s, i) => makeCreature(s.id, "rabbit", s.x, s.z, i === 0 ? 0.86 : 0.4, 0.3)),
    ...SPAWNS.wolf.map((s, i) => makeCreature(s.id, "wolf", s.x, s.z, i === 0 ? 0.8 : 0.5, 0.25)),
    makeCreature(SPAWNS.eagle.id, "eagle", SPAWNS.eagle.x, SPAWNS.eagle.z, 0.72, 0.1),
    makeCreature(SPAWNS.auryn.id, "auryn", SPAWNS.auryn.x, SPAWNS.auryn.z, 0.3, 0.2),
    ...SPAWNS.armadillo.map((s) => makeCreature(s.id, "armadillo", s.x, s.z, 0.3, 0.2)),
    ...SPAWNS.toad.map((s) => makeCreature(s.id, "toad", s.x, s.z, 0.3, 0.1)),
    ...SPAWNS.fish.map((s) => makeCreature(s.id, "fish", s.x, s.z, 0.3, 0)),
    ...SPAWNS.tegu.map((s, i) => makeCreature(s.id, "tegu", s.x, s.z, i === 0 ? 0.75 : 0.35, 0.2)),
    ...SPAWNS.mosslight.map((s) => makeCreature(s.id, "mosslight", s.x, s.z, 0.3, 0.2)),
  ];
  const sim: Simulation = {
    player: {
      x: SPAWNS.player.x,
      y: heightAt(SPAWNS.player.x, SPAWNS.player.z),
      z: SPAWNS.player.z,
      yaw: 0,
      vy: 0,
      grounded: true,
      swimming: false,
      health: 100,
      energy: 100,
      thirst: 8,
      coyote: 0,
      jumpBuffer: 0,
      iframes: 0,
      hurtCd: 0,
      speed: 0,
      sprinting: false,
    },
    creatures,
    props: layoutProps().map((p) => ({ ...p, taken: false, depleted: 0 })),
    obstacles: obstacles(),
    discoveries: {},
    inventory: { glowfruit: 0, berries: 0, eggs: 0 },
    toasts: [],
    prompt: "",
    time: 0,
    toastCd: {},
    petName: "Auryn",
    threat: 0,
    track: null,
    incubator: null,
    photos: {},
    challenges: {},
    stats: { shooed: 0, calmedWolves: 0, assisted: 0, hatched: 0 },
    shoutCd: 0,
    hatchCount: 0,
  };
  if (save) applySave(sim, save);
  for (const c of sim.creatures) c.y = c.speciesId === "eagle" ? 8.5 : groundY(c);
  return sim;
}

export const SWIMS: ReadonlySet<SpeciesId> = new Set(["capybara", "fish"]);

function groundY(c: SimCreature): number {
  const h = heightAt(c.x, c.z);
  if (c.speciesId === "fish") return CONFIG.waterY - 0.32;
  if (c.speciesId === "capybara") return Math.max(h, CONFIG.waterY - 0.05);
  return h - (c.hidden ? 0.8 : 0);
}

/** Born creatures (hatchlings) are not in SPAWNS; recreate them from the save. */
function spawnBorn(sim: Simulation, id: string, speciesId: SpeciesId, x: number, z: number): SimCreature {
  const c = makeCreature(id, speciesId, x, z, 0.3, 0.2);
  c.homeX = CAMP.x; c.homeZ = CAMP.z; c.born = true;
  sim.creatures.push(c);
  const n = Number(id.split("-").pop());
  if (Number.isFinite(n)) sim.hatchCount = Math.max(sim.hatchCount, n);
  return c;
}

export function applySave(sim: Simulation, save: SaveData): void {
  sim.player.x = save.player.x;
  sim.player.y = Math.max(save.player.y, heightAt(save.player.x, save.player.z));
  sim.player.z = save.player.z;
  sim.player.yaw = save.player.yaw;
  sim.player.health = save.player.health || 100;
  sim.player.energy = save.player.energy;
  sim.player.thirst = save.player.thirst;
  sim.inventory = { ...save.inventory };
  sim.discoveries = { ...save.discoveries };
  sim.time = save.seconds;
  sim.incubator = save.incubator ? { ...save.incubator } : null;
  sim.photos = { ...save.photos };
  sim.challenges = { ...save.challenges };
  const aurynPet = save.pets.find(p => p.speciesId === "auryn");
  sim.petName = aurynPet?.name ?? "Auryn";
  for (const prop of sim.props) prop.taken = save.picked[prop.id] === true;
  for (const [id, snap] of Object.entries(save.creatures)) {
    if (snap.speciesId && !sim.creatures.some(c => c.id === id)) spawnBorn(sim, id, snap.speciesId, snap.x, snap.z);
  }
  for (const c of sim.creatures) {
    const snap = save.creatures[c.id];
    if (!snap) continue;
    c.x = snap.x;
    c.z = snap.z;
    c.hunger = snap.hunger;
    c.thirst = snap.thirst;
    c.fear = snap.fear;
    c.energy = snap.energy;
    c.trust = snap.trust;
    c.tamed = SPECIES_BY_ID[c.speciesId].domesticable && snap.tamed;
    if (c.speciesId === "fish") { c.tx = c.x; c.tz = c.z; continue; }
    const safe = safeGroundPoint(sim, c.x, c.z, c.homeX, c.homeZ, c.speciesId === "capybara");
    c.x = safe.x; c.z = safe.z; c.tx = c.x; c.tz = c.z;
  }
  const pos = resolveCircle(sim.player.x, sim.player.z, CONFIG.playerRadius, sim.obstacles, CONFIG.worldRadius);
  sim.player.x = pos.x; sim.player.z = pos.z;
  sim.player.y = Math.max(sim.player.y, heightAt(pos.x, pos.z));
  for (const pet of save.pets) {
    const c = sim.creatures.find(o => o.id === pet.id);
    if (!c || !c.tamed) continue;
    c.name = pet.name; c.xp = pet.xp; c.command = pet.command; c.trust = 100;
  }
}

export function toSave(
  sim: Simulation,
  settings: SaveData["settings"],
): SaveData {
  const picked: Record<string, boolean> = {};
  for (const p of sim.props) if (p.taken) picked[p.id] = true;
  const creatures: SaveData["creatures"] = {};
  for (const c of sim.creatures) {
    creatures[c.id] = {
      x: c.x,
      z: c.z,
      hunger: c.hunger,
      thirst: c.thirst,
      fear: c.fear,
      energy: c.energy,
      trust: c.trust,
      tamed: c.tamed,
      ...(c.born ? { speciesId: c.speciesId } : {}),
    };
  }
  return {
    version: 2,
    player: {
      x: sim.player.x,
      y: sim.player.y,
      z: sim.player.z,
      yaw: sim.player.yaw,
      health: sim.player.health,
      energy: sim.player.energy,
      thirst: sim.player.thirst,
    },
    inventory: { ...sim.inventory },
    picked,
    discoveries: structuredClone(sim.discoveries),
    pets: pets(sim).map(c => ({ id: c.id, speciesId: c.speciesId, name: c.name || SPECIES_BY_ID[c.speciesId].name, xp: c.xp, command: c.command })),
    creatures,
    incubator: sim.incubator ? { ...sim.incubator } : null,
    photos: structuredClone(sim.photos),
    challenges: { ...sim.challenges },
    settings,
    seconds: sim.time,
  };
}

export function pets(sim: Simulation): SimCreature[] {
  return sim.creatures.filter(c => c.tamed);
}

function nearest(
  list: readonly SimCreature[],
  x: number,
  z: number,
  pred: (c: SimCreature) => boolean,
): { c: SimCreature; d: number } | null {
  let best: { c: SimCreature; d: number } | null = null;
  for (const c of list) {
    if (!pred(c)) continue;
    const d = Math.hypot(c.x - x, c.z - z);
    if (!best || d < best.d) best = { c, d };
  }
  return best;
}

function nearestProp(sim: Simulation, x: number, z: number, kind: Prop["kind"]): { p: SimProp; d: number } | null {
  let best: { p: SimProp; d: number } | null = null;
  for (const p of sim.props) {
    if (p.kind !== kind || p.taken || p.depleted > 0) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (!best || d < best.d) best = { p, d };
  }
  return best;
}

function moveToward(sim: Simulation, c: SimCreature, tx: number, tz: number, speed: number, dt: number): number {
  let dx = tx - c.x;
  let dz = tz - c.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.3) {
    c.moving = false;
    return dist;
  }
  let ax = dx / dist;
  let az = dz / dist;
  for (const o of sim.obstacles) {
    const ox = c.x - o.x;
    const oz = c.z - o.z;
    const od = Math.hypot(ox, oz) || 0.001;
    const influence = o.r + 1.25;
    if (od < influence) {
      ax += (ox / od) * (influence - od) * 2.4;
      az += (oz / od) * (influence - od) * 2.4;
    }
  }
  const m = Math.hypot(ax, az) || 1;
  const step = Math.min(speed * dt, dist);
  const ox = c.x;
  const oz = c.z;
  c.x += (ax / m) * step;
  c.z += (az / m) * step;
  const resolved = resolveCircle(c.x, c.z, 0.32, sim.obstacles, CONFIG.worldRadius);
  c.x = resolved.x;
  c.z = resolved.z;
  if (!SWIMS.has(c.speciesId) && isDeepWater(c.x, c.z)) {
    c.x = ox;
    c.z = oz;
  }
  c.yaw = Math.atan2(-(ax / m), -(az / m));
  c.moving = Math.hypot(c.x - ox, c.z - oz) > 0.004;
  return dist;
}

function updatePlayer(sim: Simulation, input: SimInput, dt: number): void {
  const p = sim.player;
  const beforeX = p.x;
  const beforeZ = p.z;
  const wish = Math.hypot(input.moveX, input.moveZ);
  p.sprinting = input.sprint && p.energy > 1 && wish > 0.2 && !p.swimming;
  let speed = p.sprinting ? CONFIG.sprint : CONFIG.walk;
  if (p.swimming) speed *= 0.62;
  if (p.thirst > 80) speed *= 0.86;
  if (wish > 0.04) {
    const b = basis(input.camYaw);
    const nx = input.moveX / Math.max(wish, 1);
    const nz = input.moveZ / Math.max(wish, 1);
    const wx = b.fx * nz + b.rx * nx;
    const wz = b.fz * nz + b.rz * nx;
    const mag = Math.hypot(wx, wz) || 1;
    p.x += (wx / mag) * speed * Math.min(wish, 1) * dt;
    p.z += (wz / mag) * speed * Math.min(wish, 1) * dt;
    p.yaw = lerpAngle(p.yaw, Math.atan2(-wx / mag, -wz / mag), 1 - Math.exp(-12 * dt));
  }
  const resolved = resolveCircle(p.x, p.z, CONFIG.playerRadius, sim.obstacles, CONFIG.worldRadius);
  p.x = resolved.x;
  p.z = resolved.z;
  p.speed = Math.hypot(p.x - beforeX, p.z - beforeZ) / dt;

  if (input.jumpEdge) p.jumpBuffer = CONFIG.jumpBuffer;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  if (isDeepWater(p.x, p.z)) {
    p.swimming = true;
    p.y = CONFIG.waterY;
    p.vy = 0;
    p.grounded = true;
    p.coyote = 0;
  } else {
    p.swimming = false;
    if (p.grounded) p.coyote = CONFIG.coyote;
    else p.coyote = Math.max(0, p.coyote - dt);
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = CONFIG.jump;
      p.grounded = false;
      p.coyote = 0;
      p.jumpBuffer = 0;
      p.y += 0.02;
    }
    p.vy += CONFIG.gravity * dt;
    p.y += p.vy * dt;
    const h = heightAt(p.x, p.z);
    if (p.y <= h) {
      p.y = h;
      p.vy = 0;
      p.grounded = true;
    } else {
      p.grounded = false;
    }
  }

  if (p.sprinting) p.energy = Math.max(0, p.energy - 20 * dt);
  else p.energy = Math.min(100, p.energy + 12 * dt);
  p.thirst = Math.min(100, p.thirst + 1.1 * dt);
  if (p.iframes > 0) p.iframes -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;
  else if (p.health < 100) p.health = Math.min(100, p.health + 3 * dt);

  if (input.useBerryEdge) eatBerry(sim);
}

/** Single rule for eating, shared by the F key, the bag button and tests. */
export function eatBerry(sim: Simulation): boolean {
  if (sim.inventory.berries <= 0) return false;
  const p = sim.player;
  sim.inventory.berries -= 1;
  p.energy = Math.min(100, p.energy + 28);
  p.health = Math.min(100, p.health + 16);
  p.thirst = Math.max(0, p.thirst - 10);
  toast(sim, "eat", "Você comeu um fruto da mata.", 1.2);
  return true;
}

/** Wolves threaten small and mid-sized animals; the eagle threatens rabbits in a dive. */
const WOLF_PREY: ReadonlySet<SpeciesId> = new Set(["rabbit", "capybara", "auryn", "armadillo", "mosslight", "tegu"]);

function threatOf(sim: Simulation, c: SimCreature): { x: number; z: number; d: number } | null {
  if (c.tamed) return null;
  const wolves = nearest(sim.creatures, c.x, c.z, (o) => o.speciesId === "wolf" && o.id !== c.id && !o.tamed && o.calm <= 0);
  const eagle = sim.creatures.find((o) => o.speciesId === "eagle");
  let best: { x: number; z: number; d: number } | null = null;
  const consider = (x: number, z: number) => {
    const d = Math.hypot(x - c.x, z - c.z);
    if (!best || d < best.d) best = { x, z, d };
  };
  if (WOLF_PREY.has(c.speciesId) && wolves) consider(wolves.c.x, wolves.c.z);
  if (c.speciesId === "rabbit" && eagle && eagle.dip > 0.45) consider(eagle.x, eagle.z);
  if (c.speciesId === "wolf") {
    for (const guard of sim.creatures) {
      if (!guard.tamed || guard.command !== "PROTECT") continue;
      if (Math.hypot(guard.x - c.x, guard.z - c.z) < 11) consider(guard.x, guard.z);
    }
  }
  return best;
}

function updateCreature(sim: Simulation, c: SimCreature, dt: number, light: number, dayF: number): void {
  const profile = SPECIES_BY_ID[c.speciesId];
  c.phase += dt * (c.moving ? 7 : 1.5);
  c.attackCd = Math.max(0, c.attackCd - dt);
  c.startled = Math.max(0, c.startled - dt);
  c.calm = Math.max(0, c.calm - dt);
  c.abilityCd.track = Math.max(0, c.abilityCd.track - dt);
  c.abilityCd.calm = Math.max(0, c.abilityCd.calm - dt);
  c.hunger = Math.min(1, c.hunger + dt * 0.01);
  c.thirst = Math.min(1, c.thirst + dt * (c.speciesId === "fish" ? 0 : 0.008));
  if (c.state === "REST" || c.state === "IDLE") c.energy = Math.min(1, c.energy + dt * 0.08);
  else c.energy = Math.max(0, c.energy - dt * 0.01);

  const rawDist = Math.hypot(sim.player.x - c.x, sim.player.z - c.z);
  // Perception: an animal notices the player by sight (clear line), by hearing a
  // sprint, or simply when the player is right beside it. Hidden burrowers notice nothing.
  const heard = rawDist < 3.2 || (sim.player.sprinting && rawDist < profile.fleeRadius * 1.3);
  const sees = c.seesPlayer && rawDist < sightRange(profile.sight, light, profile.id === "auryn" || profile.id === "mosslight");
  const playerDist = c.tamed || sees || heard ? rawDist : 99;
  let threat = threatOf(sim, c);
  const scaredByPlayer = c.calm <= 0 && !c.tamed && (profile.temperament === "skittish" || (sim.player.sprinting && (profile.temperament === "calm" || profile.temperament === "curious"))) && playerDist < profile.fleeRadius;
  if (scaredByPlayer && (!threat || playerDist < threat.d)) threat = { x: sim.player.x, z: sim.player.z, d: playerDist };
  if (threat && threat.d < 8) c.fear = Math.min(1, c.fear + dt * 0.9);
  else c.fear = Math.max(0, c.fear - dt * 0.3);

  const prey = profile.diet === "carnivore" ? nearest(sim.creatures, c.x, c.z, (o) => o.speciesId === "rabbit") : null;
  const eatsFruit = profile.diet === "herbivore" || profile.diet === "frugivore" || profile.diet === "omnivore";
  const food = eatsFruit ? nearestProp(sim, c.x, c.z, "berry") : null;
  const inTerritory =
    c.speciesId === "wolf" &&
    Math.hypot(c.x - SPAWNS.territory.x, c.z - SPAWNS.territory.z) < SPAWNS.territory.r;
  const homeDist = Math.hypot(c.x - c.homeX, c.z - c.homeZ);

  // AI LOD: far from the player, decisions run at half rate.
  const aiPeriod = rawDist > 30 ? 2 / CONFIG.aiHz : 1 / CONFIG.aiHz;
  c.aiAcc += dt;
  if (c.aiAcc >= aiPeriod) {
    c.aiAcc = 0;
    c.seesPlayer = !c.hidden && lineOfSight(sim.obstacles, c.x, c.z, sim.player.x, sim.player.z);
    c.state = decide({
      speciesId: c.speciesId,
      diet: profile.diet,
      temperament: profile.temperament,
      fleeRadius: profile.fleeRadius,
      hunger: c.hunger,
      thirst: c.speciesId === "fish" ? 0 : c.thirst,
      fear: c.fear,
      energy: c.energy,
      threatDist: threat?.d ?? null,
      preyDist: prey?.d ?? null,
      foodDist: food?.d ?? null,
      waterDist: waterDistance(c.x, c.z),
      playerDist,
      playerSprinting: sim.player.sprinting,
      inTerritory,
      tamed: c.tamed,
      command: c.tamed ? c.command : null,
      preferIdle: rngNext(c) > 0.72,
      calmed: c.calm > 0,
      inactive: !c.tamed && !isActive(profile.activeAt, dayF),
      homeDist,
    });
  }

  // Reptiles bask: an idle teiú in daylight lies in the sun (REST) beside its rock.
  if (c.speciesId === "tegu" && c.state === "IDLE" && light > 0.5) c.state = "REST";

  if (c.speciesId === "eagle") {
    updateEagle(sim, c, dt, prey, light);
    return;
  }
  if (c.speciesId === "fish") {
    updateFish(sim, c, dt, rawDist);
    return;
  }

  let speed = profile.speed;
  if (c.state === "FLEE") speed *= 1.25;
  if (c.state === "IDLE" || c.state === "EAT" || c.state === "DRINK" || c.state === "REST") speed = 0;

  if (c.retarget > 0) c.retarget -= dt;

  // Burrowers stay underground while resting at home; fleeing sends them home first.
  const burrower = c.speciesId === "armadillo";
  if (burrower) {
    const atHome = homeDist < 0.6;
    if (c.state === "FLEE") { c.tx = c.homeX; c.tz = c.homeZ; if (atHome) { c.hidden = true; speed = 0; } }
    else c.hidden = atHome && (c.state === "REST" || c.state === "RETURN_HOME");
    if (c.hidden && c.state !== "FLEE") speed = 0;
  }

  if (c.state === "FLEE" && !burrower) {
    const danger = threat ?? { x: sim.player.x, z: sim.player.z };
    const dx = c.x - danger.x;
    const dz = c.z - danger.z;
    const m = Math.hypot(dx, dz) || 1;
    c.tx = c.x + (dx / m) * 7;
    c.tz = c.z + (dz / m) * 7;
  } else if (c.state === "WANDER" && c.retarget <= 0) {
    const ang = rngNext(c) * Math.PI * 2;
    const rad = 2 + rngNext(c) * (c.speciesId === "toad" ? 2 : 5);
    c.tx = c.homeX + Math.cos(ang) * rad;
    c.tz = c.homeZ + Math.sin(ang) * rad;
    c.retarget = 3 + rngNext(c) * 3;
  } else if (c.state === "SEARCH_FOOD" && food) {
    c.tx = food.p.x;
    c.tz = food.p.z;
  } else if (c.state === "EAT" && food && food.d < 1.3) {
    c.hunger = Math.max(0, c.hunger - dt * 0.28);
    food.p.depleted = 18;
    speed = 0;
  } else if (c.state === "DRINK") {
    c.tx = CONFIG.lakeX + (c.x - CONFIG.lakeX) * 0.15;
    c.tz = CONFIG.lakeZ + (c.z - CONFIG.lakeZ) * 0.15;
    if (waterDistance(c.x, c.z) < 1.5) {
      c.thirst = Math.max(0, c.thirst - dt * 0.35);
      speed = 0;
    } else speed = profile.speed * 0.8;
  } else if (c.state === "CHASE" && prey) {
    c.tx = prey.c.x;
    c.tz = prey.c.z;
  } else if (c.state === "DEFEND") {
    c.tx = sim.player.x;
    c.tz = sim.player.z;
  } else if (c.state === "FOLLOW_OWNER" || c.state === "PROTECT_OWNER") {
    const back = basis(sim.player.yaw);
    const slot = pets(sim).indexOf(c);
    const side = slot % 2 ? 1 : -1;
    const dist = (c.command === "PROTECT" ? 1.3 : 1.8) + Math.floor(slot / 2) * 0.9;
    if (c.command === "RETURN") speed = profile.speed * 1.5;
    // Several companions walk in a small staggered line instead of stacking.
    c.tx = sim.player.x - back.fx * dist + back.rx * side * (slot ? 0.9 : 0);
    c.tz = sim.player.z - back.fz * dist + back.rz * side * (slot ? 0.9 : 0);
    if (c.command === "PROTECT") {
      const wolf = nearest(sim.creatures, sim.player.x, sim.player.z, (o) => o.speciesId === "wolf");
      if (wolf && wolf.d < 12) {
        c.tx = (sim.player.x + wolf.c.x) * 0.5;
        c.tz = (sim.player.z + wolf.c.z) * 0.5;
      }
    }
  } else if (c.state === "RETURN_HOME") {
    c.tx = c.homeX;
    c.tz = c.homeZ;
    speed = profile.speed * 0.7;
  }

  // Curious or calmed domesticable creatures walk up to a patient player.
  const approachTrust = c.speciesId === "auryn" ? 22 : 25;
  const willApproach = profile.domesticable && !c.tamed && c.state !== "FLEE" && c.startled <= 0 && c.trust > approachTrust
    && (profile.tameMethod === "bond" || c.calm > 0);
  if (willApproach && rawDist > 2.5 && rawDist < 9 && !sim.player.sprinting) {
    c.tx = sim.player.x;
    c.tz = sim.player.z;
    speed = profile.speed * 0.45;
    c.state = "WANDER";
  }

  const ox = c.x;
  const oz = c.z;
  if (speed > 0) moveToward(sim, c, c.tx, c.tz, speed, dt);
  else c.moving = false;
  c.y = groundY(c);

  if (c.tamed && (c.command === "FOLLOW" || c.command === "RETURN" || c.command === "PROTECT")) {
    const moved = Math.hypot(c.x - ox, c.z - oz);
    if (rawDist > 5 && moved < profile.speed * dt * 0.15) c.stuck += dt;
    else c.stuck = 0;
    if ((c.stuck > 2.4 && rawDist > 10) || rawDist > 24) {
      const back = basis(sim.player.yaw);
      const safe = safeGroundPoint(sim, sim.player.x - back.fx * 2, sim.player.z - back.fz * 2, c.homeX, c.homeZ);
      c.x = safe.x;
      c.z = safe.z;
      c.y = groundY(c);
      c.stuck = 0;
      toast(sim, "recover-" + c.id, `${c.name || profile.name} contornou um obstáculo e voltou para perto.`, 6);
    }
    c.xp += dt;
    if (c.command === "RETURN" && Math.hypot(sim.player.x - c.x, sim.player.z - c.z) < 2.6) {
      c.command = "FOLLOW";
      toast(sim, "returned-" + c.id, `${c.name || profile.name} voltou para o seu lado e segue você.`, 2);
    }
  }

  if (c.speciesId === "wolf" && (c.state === "DEFEND" || (c.state === "CHASE" && rawDist < 2.2))) {
    if (rawDist < 1.25 && c.attackCd <= 0 && sim.player.iframes <= 0) {
      sim.player.health = Math.max(0, sim.player.health - 14);
      sim.player.iframes = 0.85;
      sim.player.hurtCd = 4;
      const dx = sim.player.x - c.x;
      const dz = sim.player.z - c.z;
      const m = Math.hypot(dx, dz) || 1;
      sim.player.x += (dx / m) * 1.15;
      sim.player.z += (dz / m) * 1.15;
      const safe = resolveCircle(sim.player.x, sim.player.z, CONFIG.playerRadius, sim.obstacles, CONFIG.worldRadius);
      sim.player.x = safe.x; sim.player.z = safe.z;
      c.attackCd = 1.45;
      toast(sim, "nip", "O lobo defendeu o território. Recue, afugente (G) ou peça proteção à companheira.", 2.5);
    }
  }

  if (c.speciesId === "wolf" && c.state === "CHASE" && prey && prey.d < 1.05 && c.attackCd <= 0) {
    c.hunger = 0.18;
    c.energy = Math.max(c.energy, 0.45);
    c.attackCd = 2;
    prey.c.x = prey.c.homeX + (rngNext(prey.c) - 0.5) * 3;
    prey.c.z = prey.c.homeZ + (rngNext(prey.c) - 0.5) * 3;
    prey.c.fear = 1;
    toast(sim, "hunt", "O lobo investiu. O coelho escapou para a grama.", 6);
  }
}

/** Fish never leave the lake: they school around a leader and dart away from disturbance. */
function updateFish(sim: Simulation, c: SimCreature, dt: number, playerDist: number): void {
  const center = { x: CONFIG.lakeX, z: CONFIG.lakeZ };
  const maxR = 4.6;
  const disturbed = playerDist < SPECIES_BY_ID.fish.fleeRadius && (sim.player.swimming || sim.player.sprinting);
  if (c.retarget > 0) c.retarget -= dt;
  const leader = sim.creatures.find(o => o.speciesId === "fish");
  if (disturbed) {
    const dx = c.x - sim.player.x, dz = c.z - sim.player.z, m = Math.hypot(dx, dz) || 1;
    c.tx = c.x + dx / m * 4; c.tz = c.z + dz / m * 4; c.state = "FLEE";
  } else if (c.retarget <= 0) {
    const ang = rngNext(c) * Math.PI * 2, rad = rngNext(c) * maxR;
    const base = leader && leader !== c ? { x: leader.x, z: leader.z } : center;
    c.tx = leader && leader !== c ? base.x + Math.cos(ang) * 1.2 : center.x + Math.cos(ang) * rad;
    c.tz = leader && leader !== c ? base.z + Math.sin(ang) * 1.2 : center.z + Math.sin(ang) * rad;
    c.retarget = 1.5 + rngNext(c) * 2.5;
    c.state = "WANDER";
  }
  // Keep the target inside the open water.
  const tr = Math.hypot(c.tx - center.x, c.tz - center.z);
  if (tr > maxR) { c.tx = center.x + (c.tx - center.x) / tr * maxR; c.tz = center.z + (c.tz - center.z) / tr * maxR; }
  const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
  const speed = SPECIES_BY_ID.fish.speed * (c.state === "FLEE" ? 1.8 : 0.5);
  if (d > 0.15) {
    const step = Math.min(d, speed * dt);
    c.x += dx / d * step; c.z += dz / d * step;
    c.yaw = Math.atan2(-dx / d, -dz / d);
    c.moving = true;
  } else c.moving = false;
  const r = Math.hypot(c.x - center.x, c.z - center.z);
  if (r > maxR + 0.5) { c.x = center.x + (c.x - center.x) / r * maxR; c.z = center.z + (c.z - center.z) / r * maxR; }
  c.y = CONFIG.waterY - 0.32 + Math.sin(c.phase * 0.7) * 0.04;
}

function updateEagle(sim: Simulation, c: SimCreature, dt: number, prey: { c: SimCreature; d: number } | null, light: number): void {
  // Diurnal: at night the eagle roosts on its perch tree.
  if (light < 0.15) {
    const perchY = heightAt(PERCH.x, PERCH.z) + 6.1;
    const dx = PERCH.x - c.x, dz = PERCH.z - c.z, dy = perchY - c.y, d = Math.hypot(dx, dz, dy);
    if (d > 0.2) {
      const step = Math.min(d, 7 * dt);
      c.x += dx / d * step; c.z += dz / d * step; c.y += dy / d * step;
      c.yaw = Math.atan2(-dx, -dz); c.moving = true; c.state = "RETURN_HOME";
    } else { c.moving = false; c.state = "REST"; }
    c.dip = 0;
    return;
  }
  c.fly += dt * 0.42;
  const hungryDive = c.state === "CHASE" && prey && prey.d < 12;
  c.dip = clamp(c.dip + dt * (hungryDive ? 0.7 : -0.8), 0, 1);
  const tx = 2 + Math.cos(c.fly) * 14, tz = 4 + Math.sin(c.fly) * 11, ty = 8.6 + Math.sin(c.fly * 2) * 0.8 - c.dip * 5.8;
  // Ease back into the circuit after roosting instead of teleporting.
  const blend = Math.hypot(tx - c.x, tz - c.z, ty - c.y) > 1 ? 1 - Math.exp(-2.5 * dt) : 1;
  c.x += (tx - c.x) * blend; c.z += (tz - c.z) * blend; c.y += (ty - c.y) * blend;
  c.yaw = c.fly + Math.PI / 2;
  c.moving = true;
  if (c.state === "REST" || c.state === "RETURN_HOME") c.state = "WANDER";
  if (prey && c.dip > 0.82 && c.attackCd <= 0) {
    c.hunger = 0.2;
    c.attackCd = 6;
    c.dip = 0;
    prey.c.fear = 1;
    prey.c.x = prey.c.homeX;
    prey.c.z = prey.c.homeZ;
    toast(sim, "dive", "A águia mergulhou e o coelho se espalhou pela clareira.", 7);
  }
}

/** Every untamed, domesticable creature follows its own species rule. */
function updateBonds(sim: Simulation, dt: number, offerTo: SimCreature | null): void {
  for (const c of sim.creatures) {
    const profile = SPECIES_BY_ID[c.speciesId];
    if (c.tamed || profile.tameMethod === "none") continue;
    const dist = Math.hypot(sim.player.x - c.x, sim.player.z - c.z);
    const moving = sim.player.speed > 0.4;
    const offering = profile.offering === "glowfruit" ? "glowfruit" : "berries";
    const offer = offerTo === c && sim.inventory[offering] > 0;
    const result = profile.tameMethod === "bond"
      ? stepBond({
        trust: c.trust, tamed: false, dist, sprinting: sim.player.sprinting, moving, offer,
        observed: c.observe >= BOND_RULES.observation, threatened: c.fear > BOND_RULES.fear, socialAssist: false, dt,
      })
      : stepAssistedBond({
        trust: c.trust, dist, sprinting: sim.player.sprinting, moving, offer, calm: c.calm,
        observed: c.observe >= ASSISTED_RULES.observation, dt,
      });
    c.trust = result.trust;
    if (result.startled) c.startled = 1.6;
    if (offer && !result.consumed) {
      toast(sim, "refuse-" + c.speciesId, profile.tameMethod === "bond"
        ? "Ainda não. Observe parada, espere confiança 58 e ofereça quando ela estiver tranquila. O fruto ficou na bolsa."
        : `O ${profile.name.toLowerCase()} recuou. Ele só aceita fruto enquanto está calmo pelo pulso da Auryn e com confiança ${ASSISTED_RULES.trust}. O fruto ficou na bolsa.`, 2);
    }
    if (result.consumed) {
      mark(sim, c.speciesId, "interact");
      sim.inventory[offering] -= 1;
    }
    if (result.bonded) {
      c.tamed = true;
      c.command = "FOLLOW";
      c.name = c.speciesId === "auryn" ? sim.petName || "Auryn" : profile.name;
      c.trust = 100;
      c.homeX = CAMP.x; c.homeZ = CAMP.z;
      if (profile.tameMethod === "assisted") sim.stats.assisted++;
      toast(sim, "bond-" + c.id, profile.tameMethod === "assisted"
        ? `Com a calma da Auryn, o ${profile.name.toLowerCase()} aceitou o fruto e passa a acompanhar você.`
        : `${c.name} aceitou o vínculo e passa a caminhar com você.`, 1);
    }
  }
}

/** Egg warming at the camp: faster in daylight, slower at night; hatches into a companion. */
function updateIncubator(sim: Simulation, dt: number, light: number): void {
  if (!sim.incubator) return;
  sim.incubator.progress = Math.min(1, sim.incubator.progress + dt / INCUBATION_SECONDS * (0.45 + 0.55 * light));
  if (sim.incubator.progress < 1) return;
  sim.incubator = null;
  sim.hatchCount += 1;
  const spot = safeGroundPoint(sim, CAMP.incubator.x + 1, CAMP.incubator.z - 0.6, CAMP.x, CAMP.z);
  const baby = spawnBorn(sim, `hatch-${sim.hatchCount}`, "mosslight", spot.x, spot.z);
  baby.tamed = true; baby.trust = 100; baby.command = "FOLLOW"; baby.name = "Musguinho";
  baby.y = groundY(baby);
  sim.stats.hatched++;
  mark(sim, "mosslight", "interact");
  toast(sim, "hatch", "O ovo chocou! Um filhote de musgarim nasceu no acampamento e segue você. Renomeie na pausa.", 1);
}

export const INCUBATION_SECONDS = 150;
export const CALM_RADIUS = 11;
export const EGG_LIMIT = 2;

function updateWorld(sim: Simulation, input: SimInput, dt: number, light: number): void {
  for (const key of Object.keys(sim.toastCd)) {
    sim.toastCd[key] = (sim.toastCd[key] ?? 0) - dt;
  }
  for (const t of sim.toasts) t.ttl -= dt;
  sim.toasts = sim.toasts.filter((t) => t.ttl > 0 && t.text);
  for (const p of sim.props) if (p.depleted > 0) p.depleted -= dt;
  sim.shoutCd = Math.max(0, sim.shoutCd - dt);

  if (input.pet) commandPet(sim, input.pet);
  if (input.shoutEdge) shout(sim);

  let offerTo: SimCreature | null = null;
  if (input.interactEdge) offerTo = interact(sim);
  for (const guard of sim.creatures) {
    if (!guard.tamed || guard.command !== "PROTECT") continue;
    for (const wolf of sim.creatures) {
      if (wolf.speciesId !== "wolf") continue;
      if (Math.hypot(wolf.x - sim.player.x, wolf.z - sim.player.z) < 11 && Math.hypot(wolf.x - guard.x, wolf.z - guard.z) < 8) {
        wolf.fear = Math.max(wolf.fear, 0.85);
      }
    }
  }
  updateBonds(sim, dt, offerTo);
  updateIncubator(sim, dt, light);

  if (sim.player.health <= 0) {
    sim.player.x = CAMP.x + 1.5;
    sim.player.z = CAMP.z - 1.5;
    sim.player.y = heightAt(sim.player.x, sim.player.z);
    sim.player.health = 100;
    sim.player.iframes = 2;
    toast(sim, "down", "Você recuou até o acampamento para recuperar o fôlego.", 2);
  }

  if (input.discover) updateDiscoveries(sim, dt, light);
  updateThreat(sim);
  if (sim.track) {
    sim.track.ttl -= dt;
    if (sim.track.ttl <= 0 || Math.hypot(sim.track.x - sim.player.x, sim.track.z - sim.player.z) < 2.2) sim.track = null;
  }
  sim.prompt = makePrompt(sim);
  sim.time += dt;
  updateChallenges(sim, dt, (text) => toast(sim, "challenge-" + text, text, 1));
}

/** Clap and shout: costs energy, has a cooldown and only makes animals back off. */
export function shout(sim: Simulation): boolean {
  if (sim.shoutCd > 0) { toast(sim, "shout-cd", `Recupere o fôlego antes de afugentar de novo (${Math.ceil(sim.shoutCd)} s).`, 1); return false; }
  if (sim.player.energy < 15) { toast(sim, "shout-tired", "Sem energia para afugentar. Recue devagar.", 2); return false; }
  sim.shoutCd = 10;
  sim.player.energy -= 15;
  let wolves = 0;
  for (const c of sim.creatures) {
    if (c.tamed) continue;
    const d = Math.hypot(c.x - sim.player.x, c.z - sim.player.z);
    if (d > 7) continue;
    if (c.speciesId === "wolf") { wolves++; c.fear = Math.max(c.fear, 0.95); c.aiAcc = 1; }
    else if (c.speciesId !== "eagle" && c.speciesId !== "fish") { c.fear = Math.max(c.fear, 0.7); c.startled = 2; }
    if (SPECIES_BY_ID[c.speciesId].domesticable) c.trust = Math.max(0, c.trust - 20);
  }
  if (wolves) sim.stats.shooed++;
  toast(sim, "shout", wolves ? "Você bateu palmas e ergueu a voz: o lobo recuou. Outros animais também se assustaram." : "Você bateu palmas e ergueu a voz. Os animais próximos se assustaram.", 1);
  return true;
}

/** Returns the creature the player offered food to, if any. */
function interact(sim: Simulation): SimCreature | null {
  const target = interactionTarget(sim);
  if (target.kind === "collect") {
    if (target.prop.kind === "egg") {
      if (sim.inventory.eggs >= EGG_LIMIT) { toast(sim, "full", "Você já carrega ovos demais. Leve-os ao ninho aquecido do acampamento.", 2); return null; }
      target.prop.taken = true;
      sim.inventory.eggs += 1;
      mark(sim, "mosslight", "seen");
      toast(sim, "pick-egg", "Ovo de musgarim na bolsa. Leve-o ao ninho aquecido do acampamento, ao sul.", 1);
      return null;
    }
    const key = target.prop.kind === "glow" ? "glowfruit" : "berries";
    if (sim.inventory[key] >= 20) { toast(sim, "full", "A bolsa está cheia para esse fruto.", 2); return null; }
    target.prop.taken = true;
    sim.inventory[key] += 1;
    toast(sim, "pick", key === "glowfruit" ? "Frutiluz na bolsa. Observe a Auryn antes de oferecer." : "Fruto colhido. Abra a bolsa para comer.", 1);
  } else if (target.kind === "offer") return target.creature;
  else if (target.kind === "incubate") {
    sim.inventory.eggs -= 1;
    sim.incubator = { progress: 0 };
    toast(sim, "incubate", "Ovo no ninho aquecido. Ele choca mais rápido com o calor do dia.", 1);
  } else if (target.kind === "observe") {
    mark(sim, target.creature.speciesId, "interact");
    toast(sim, "note-" + target.creature.id, `${SPECIES_BY_ID[target.creature.speciesId].name}: encontro registrado no diário.`, 2);
  } else if (target.kind === "drink") {
    sim.player.thirst = 0;
    toast(sim, "drink", "Sede recuperada no lago do jogo. Na natureza, água sem tratamento pode causar doenças.", 2);
  }
  return null;
}

function mark(sim: Simulation, id: SpeciesId, kind: "seen" | "behavior" | "interact"): void {
  const prev = sim.discoveries[id] ?? emptyDiscovery();
  const next =
    kind === "seen" ? noteSight(prev) : kind === "behavior" ? noteBehavior(prev) : noteInteraction(prev);
  if (next.seen !== prev.seen) {
    toast(sim, "seen-" + id, `${SPECIES_BY_ID[id].name} entrou no diário.`, 1);
  } else if (next.behavior && !prev.behavior) {
    toast(sim, "beh-" + id, `Comportamento de ${SPECIES_BY_ID[id].name} anotado.`, 1);
  }
  sim.discoveries[id] = next;
}

/**
 * The diary records a species only when the player could actually see it: in range
 * (shorter at night unless it glows), with a clear line past trees and rocks, and
 * not hidden in a burrow.
 */
function updateDiscoveries(sim: Simulation, dt: number, light: number): void {
  for (const c of sim.creatures) {
    if (c.tamed && c.born) continue;
    const profile = SPECIES_BY_ID[c.speciesId];
    const d = Math.hypot(c.x - sim.player.x, c.z - sim.player.z);
    const glows = c.speciesId === "auryn" || c.speciesId === "mosslight";
    const visible = !c.hidden && (c.speciesId === "eagle" || c.seesPlayer || d < 2.5);
    if (visible && d < sightRange(profile.sight, light, glows)) mark(sim, c.speciesId, "seen");
    if (visible && d < observationRange(c.speciesId) && !sim.player.sprinting && sim.player.speed < OBSERVATION_RULES.maxSpeed) c.observe = Math.min(8, c.observe + dt);
    else c.observe = Math.max(0, c.observe - dt * 0.2);
    if (c.observe > OBSERVATION_RULES.seconds) mark(sim, c.speciesId, "behavior");
  }
}

function makePrompt(sim: Simulation): string {
  const target = interactionTarget(sim);
  if (target.kind === "collect") return target.prop.kind === "glow" ? "E · colher frutiluz" : target.prop.kind === "egg" ? "E · pegar ovo de musgarim" : "E · colher fruto";
  if (target.kind === "incubate") return "E · colocar ovo no ninho aquecido";
  if (target.kind === "offer") {
    const c = target.creature;
    const profile = SPECIES_BY_ID[c.speciesId];
    if (profile.tameMethod === "assisted") {
      return c.calm > 0 && c.trust >= ASSISTED_RULES.trust && c.observe >= ASSISTED_RULES.observation && !sim.player.sprinting ? `E · oferecer fruto ao ${profile.name.toLowerCase()}` : `Ele só aceita enquanto está calmo pelo pulso da Auryn (6). Confiança ${Math.round(c.trust)}/${ASSISTED_RULES.trust}.`;
    }
    return c.trust >= BOND_RULES.trust && c.observe >= BOND_RULES.observation && c.fear <= BOND_RULES.fear && !sim.player.sprinting ? "E · oferecer frutiluz" : "Observe sem se mover. Espere confiança 58 e tranquilidade antes de oferecer.";
  }
  if (target.kind === "observe") return `E · anotar encontro: ${SPECIES_BY_ID[target.creature.speciesId].name}`;
  if (target.kind === "drink") return "E · beber no lago";
  if (target.kind === "warming") return `Ovo aquecendo no ninho: ${Math.floor((sim.incubator?.progress ?? 0) * 100)}%`;
  const trust = trustSnapshot(sim);
  if (trust?.near && trust.speciesId === "auryn") return sim.player.sprinting ? "Devagar. Correr desfaz a confiança da Auryn." : `Confiança ${Math.round(trust.value)}. Observe parada; a Auryn se aproxima com confiança.`;
  if (trust?.near && trust.speciesId === "mosslight") return trust.calm ? `Musgarim calmo. Confiança ${Math.round(trust.value)}/${ASSISTED_RULES.trust}: fique parado perto dele.` : "O musgarim é tímido demais. Peça o pulso calmo à Auryn (6) quando estiver perto.";
  if (sim.player.swimming) return "Água funda. Nade até a margem.";
  return "";
}

/** Readable danger signal: territorial wolves warn before they bite. */
function updateThreat(sim: Simulation): void {
  let threat = 0;
  for (const c of sim.creatures) {
    if (c.speciesId !== "wolf" || c.tamed || c.calm > 0) continue;
    if (c.state !== "DEFEND" && c.state !== "CHASE") continue;
    const d = Math.hypot(c.x - sim.player.x, c.z - sim.player.z);
    if (d < 9) threat = Math.max(threat, clamp(1 - (d - 1.2) / 7.8, 0, 1));
  }
  if (threat > 0.25) toast(sim, "growl", "Um lobo rosna e baixa a cabeça. Recue para fora do território a noroeste ou afugente (G).", 9);
  sim.threat = threat;
}

const COMPASS = ["norte", "nordeste", "leste", "sudeste", "sul", "sudoeste", "oeste", "noroeste"];
/** World north is −Z and east is +X. */
export function compassWord(dx: number, dz: number): string {
  const angle = Math.atan2(dx, -dz);
  const index = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return COMPASS[index]!;
}

/**
 * Companion abilities (USE_ABILITY / TRACK of the spec). Both require the bonded
 * Auryn near the player, have cooldowns and real effects on the simulation.
 * The calm pulse is also what makes assisted taming of the mosslight possible.
 */
export function usePetAbility(sim: Simulation, ability: PetAbility): boolean {
  const pet = sim.creatures.find(c => c.speciesId === "auryn" && c.tamed);
  if (!pet) { if (pets(sim).length) toast(sim, "ability-none", "Só a Auryn sabe farejar e emitir o pulso calmo.", 2); return false; }
  const name = pet.name || "Auryn";
  const near = Math.hypot(pet.x - sim.player.x, pet.z - sim.player.z) < 6;
  if (!near) { toast(sim, "ability-far", `${name} está longe demais. Chame-a de volta primeiro.`, 1.5); return false; }
  if (ability === "TRACK") {
    if (pet.abilityCd.track > 0) { toast(sim, "track-cd", `${name} ainda está farejando (${Math.ceil(pet.abilityCd.track)} s).`, 1); return false; }
    pet.abilityCd.track = 8;
    const lead = trackTarget(sim);
    if (!lead) { sim.track = null; toast(sim, "track", `${name} fareja o ar, mas não encontra rastros novos.`, 1); return true; }
    sim.track = { ...lead, ttl: 30 };
    const dist = Math.round(Math.hypot(lead.x - sim.player.x, lead.z - sim.player.z));
    toast(sim, "track", `${name} encontrou um rastro: ${lead.label}, ${dist} m a ${compassWord(lead.x - sim.player.x, lead.z - sim.player.z)}. Veja no mapa.`, 1);
    return true;
  }
  if (pet.abilityCd.calm > 0) { toast(sim, "calm-cd", `O pulso calmo recarrega em ${Math.ceil(pet.abilityCd.calm)} s.`, 1); return false; }
  pet.abilityCd.calm = 25;
  let calmed = 0;
  for (const c of sim.creatures) {
    if (c === pet || c.speciesId === "eagle" || c.tamed) continue;
    if (Math.hypot(c.x - pet.x, c.z - pet.z) > CALM_RADIUS) continue;
    c.calm = 8; c.fear = Math.min(c.fear, 0.1); c.aiAcc = 1;
    if (c.speciesId === "wolf") sim.stats.calmedWolves++;
    calmed++;
  }
  pet.xp += 2;
  toast(sim, "calm", calmed ? `${name} emitiu o pulso calmo: ${calmed} animal(is) próximos ficaram tranquilos por alguns segundos.` : `${name} emitiu o pulso calmo, mas não há animais por perto.`, 1);
  return true;
}

function trackTarget(sim: Simulation): { x: number; z: number; label: string } | null {
  let best: { x: number; z: number; label: string; d: number } | null = null;
  const consider = (x: number, z: number, label: string) => {
    const d = Math.hypot(x - sim.player.x, z - sim.player.z);
    if (d > 3 && (!best || d < best.d)) best = { x, z, label, d };
  };
  for (const c of sim.creatures) {
    if (c.tamed || c.speciesId === "auryn") continue;
    const flags = sim.discoveries[c.speciesId];
    const complete = flags?.seen && flags.behavior && flags.interacted;
    if (!complete) consider(c.x, c.z, flags?.seen ? SPECIES_BY_ID[c.speciesId].name.toLowerCase() : c.hidden ? "uma toca recente" : "pegadas desconhecidas");
  }
  if (best) return best;
  for (const p of sim.props) if (!p.taken && p.depleted <= 0) consider(p.x, p.z, p.kind === "glow" ? "frutiluz" : p.kind === "egg" ? "um ninho de musgo" : "fruto da mata");
  return best;
}

export function stepSim(sim: Simulation, input: SimInput, dt: number): void {
  if (dt <= 0) return;
  const dayF = dayFraction(sim.time);
  const light = daylight(dayF);
  updatePlayer(sim, input, dt);
  for (const c of sim.creatures) updateCreature(sim, c, dt, light, dayF);
  updateWorld(sim, input, dt, light);
}

export type PetView = { id: string; speciesId: SpeciesId; name: string; command: PetCommand; level: number; xp: number; near: boolean };

export function petViews(sim: Simulation): PetView[] {
  return pets(sim).map(c => ({
    id: c.id, speciesId: c.speciesId, name: c.name || SPECIES_BY_ID[c.speciesId].name, command: c.command,
    level: 1 + Math.floor(c.xp / 40), xp: c.xp, near: Math.hypot(c.x - sim.player.x, c.z - sim.player.z) < 8,
  }));
}

/** Kept for existing callers: the Auryn when bonded. */
export function petSnapshot(sim: Simulation): { name: string; command: PetCommand; level: number; xp: number } | null {
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn" && c.tamed);
  if (!auryn) return null;
  return { name: auryn.name || "Auryn", command: auryn.command, level: 1 + Math.floor(auryn.xp / 40), xp: auryn.xp };
}

export function trustSnapshot(sim: Simulation): { value: number; near: boolean; speciesId: SpeciesId; calm: boolean } | null {
  let best: { c: SimCreature; d: number } | null = null;
  for (const c of sim.creatures) {
    if (c.tamed || SPECIES_BY_ID[c.speciesId].tameMethod === "none") continue;
    const d = Math.hypot(c.x - sim.player.x, c.z - sim.player.z);
    if (d <= 12 && (!best || d < best.d)) best = { c, d };
  }
  if (!best) return null;
  return { value: best.c.trust, near: best.d < 8, speciesId: best.c.speciesId, calm: best.c.calm > 0 };
}

/** Resolve a dry, collision-free recovery point; never place a land companion in the lake. */
function safeGroundPoint(sim: Simulation, x: number, z: number, fallbackX: number, fallbackZ: number, water = false) {
  for (let ring = 0; ring <= 10; ring++) {
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const p = resolveCircle(x + Math.cos(angle) * ring, z + Math.sin(angle) * ring, 0.4, sim.obstacles, CONFIG.worldRadius);
      if ((water || !isDeepWater(p.x, p.z)) && sim.obstacles.every(o => Math.hypot(p.x - o.x, p.z - o.z) >= o.r + 0.32)) return p;
    }
  }
  return { x: fallbackX, z: fallbackZ };
}

/** Commands go to every companion at once. */
export function commandPet(sim: Simulation, command: PetCommand): void {
  const group = pets(sim);
  if (!group.length) return;
  for (const pet of group) { pet.command = command; pet.aiAcc = 1; }
  const who = group.length === 1 ? group[0]!.name || SPECIES_BY_ID[group[0]!.speciesId].name : "Seus companheiros";
  const plural = group.length > 1;
  const labels = plural
    ? { FOLLOW: "vão seguir você", STAY: "vão esperar aqui", RETURN: "estão voltando depressa", PROTECT: "vão proteger você" }
    : { FOLLOW: "vai seguir você", STAY: "vai esperar aqui", RETURN: "está voltando depressa", PROTECT: "vai proteger você" };
  toast(sim, "cmd-" + command, `${who} ${labels[command]}.`, 0.4);
}

/** Photo of a creature the player can see; the image is a small JPEG data URL made by the renderer. */
export function recordPhoto(sim: Simulation, creatureId: string, image: string): boolean {
  const c = sim.creatures.find(o => o.id === creatureId);
  if (!c || !sim.discoveries[c.speciesId]?.seen) return false;
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > PHOTO_LIMIT) return false;
  const first = !sim.photos[c.speciesId];
  sim.photos[c.speciesId] = { image, state: c.state, seconds: sim.time };
  toast(sim, "photo", first ? `Foto de ${SPECIES_BY_ID[c.speciesId].name} guardada no diário.` : `Foto de ${SPECIES_BY_ID[c.speciesId].name} atualizada no diário.`, 0.5);
  return true;
}

export const PHOTO_LIMIT = 40_000;
