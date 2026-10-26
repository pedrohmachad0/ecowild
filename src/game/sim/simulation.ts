import { interactionTarget } from "./interaction.ts";
import { decide } from "../ai/brain.ts";
import { CONFIG } from "../config.ts";
import { SPECIES_BY_ID } from "../data/species.ts";
import { noteBehavior, noteInteraction, noteSight } from "../catalog/discoveries.ts";
import { basis, clamp, lerpAngle, mulberry32, resolveCircle } from "../math.ts";
import { emptyDiscovery } from "../persistence/schema.ts";
import { stepBond } from "../taming/bond.ts";
import type { AiState, DiscoveryFlags, PetCommand, SaveV1, SpeciesId } from "../types.ts";
import { SPAWNS, obstacles, props as layoutProps } from "../world/layout.ts";
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
};

export type SimToast = { text: string; ttl: number };

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
  inventory: { glowfruit: number; berries: number };
  toasts: SimToast[];
  prompt: string;
  time: number;
  toastCd: Record<string, number>;
  petName: string;
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
    name: speciesId === "auryn" ? "Auryn" : "",
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
    aiAcc: (id.charCodeAt(id.length - 1) % 8) / 64,
  };
}

export function createSim(save: SaveV1 | null): Simulation {
  const creatures: SimCreature[] = [
    ...SPAWNS.capybara.map((s, i) => makeCreature(s.id, "capybara", s.x, s.z, 0.25, i === 0 ? 0.78 : 0.35)),
    ...SPAWNS.rabbit.map((s, i) => makeCreature(s.id, "rabbit", s.x, s.z, i === 0 ? 0.86 : 0.4, 0.3)),
    ...SPAWNS.wolf.map((s, i) => makeCreature(s.id, "wolf", s.x, s.z, i === 0 ? 0.8 : 0.5, 0.25)),
    makeCreature(SPAWNS.eagle.id, "eagle", SPAWNS.eagle.x, SPAWNS.eagle.z, 0.72, 0.1),
    makeCreature(SPAWNS.auryn.id, "auryn", SPAWNS.auryn.x, SPAWNS.auryn.z, 0.3, 0.2),
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
    inventory: { glowfruit: 0, berries: 0 },
    toasts: [],
    prompt: "",
    time: 0,
    toastCd: {},
    petName: "Auryn",
  };
  if (save) applySave(sim, save);
  for (const c of sim.creatures) c.y = c.speciesId === "eagle" ? 8.5 : groundY(c);
  return sim;
}

function groundY(c: SimCreature): number {
  const h = heightAt(c.x, c.z);
  if (c.speciesId === "capybara") return Math.max(h, CONFIG.waterY - 0.05);
  return h;
}

export function applySave(sim: Simulation, save: SaveV1): void {
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
  sim.petName = save.pet?.name ?? "Auryn";
  for (const prop of sim.props) prop.taken = save.picked[prop.id] === true;
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
    c.tamed = c.speciesId === "auryn" && snap.tamed;
    const safe = safeGroundPoint(sim, c.x, c.z, c.homeX, c.homeZ, c.speciesId === "capybara");
    c.x = safe.x; c.z = safe.z; c.tx = c.x; c.tz = c.z;
  }
  const pos = resolveCircle(sim.player.x, sim.player.z, CONFIG.playerRadius, sim.obstacles, CONFIG.worldRadius);
  sim.player.x = pos.x; sim.player.z = pos.z;
  sim.player.y = Math.max(sim.player.y, heightAt(pos.x, pos.z));
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn");
  if (auryn && save.pet && auryn.tamed) {
    auryn.name = save.pet.name;
    auryn.xp = save.pet.xp;
    auryn.command = save.pet.command;
  }
}

export function toSave(
  sim: Simulation,
  settings: SaveV1["settings"],
): SaveV1 {
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn");
  const picked: Record<string, boolean> = {};
  for (const p of sim.props) if (p.taken) picked[p.id] = true;
  const creatures: SaveV1["creatures"] = {};
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
    };
  }
  return {
    version: 1,
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
    pet:
      auryn?.tamed
        ? { name: auryn.name || sim.petName, xp: auryn.xp, command: auryn.command }
        : null,
    creatures,
    settings,
    seconds: sim.time,
  };
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
  if (c.speciesId !== "capybara" && isDeepWater(c.x, c.z)) {
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

  if (input.useBerryEdge && sim.inventory.berries > 0) {
    sim.inventory.berries -= 1;
    p.energy = Math.min(100, p.energy + 28);
    p.health = Math.min(100, p.health + 16);
    p.thirst = Math.max(0, p.thirst - 10);
    toast(sim, "eat", "Você comeu um fruto da mata.", 1.2);
  }
}

function threatOf(sim: Simulation, c: SimCreature): { x: number; z: number; d: number } | null {
  const wolves = nearest(sim.creatures, c.x, c.z, (o) => o.speciesId === "wolf" && o.id !== c.id && !o.tamed);
  const eagle = sim.creatures.find((o) => o.speciesId === "eagle");
  let best: { x: number; z: number; d: number } | null = null;
  const consider = (x: number, z: number) => {
    const d = Math.hypot(x - c.x, z - c.z);
    if (!best || d < best.d) best = { x, z, d };
  };
  if (c.speciesId === "rabbit" || c.speciesId === "capybara" || c.speciesId === "auryn") {
    if (wolves) consider(wolves.c.x, wolves.c.z);
  }
  if (c.speciesId === "rabbit" && eagle && eagle.dip > 0.45) consider(eagle.x, eagle.z);
  if (c.speciesId === "wolf") {
    const auryn = sim.creatures.find((o) => o.speciesId === "auryn" && o.tamed && o.command === "PROTECT");
    if (auryn) {
      const d = Math.hypot(auryn.x - c.x, auryn.z - c.z);
      if (d < 11) consider(auryn.x, auryn.z);
    }
  }
  return best;
}

function updateCreature(sim: Simulation, c: SimCreature, dt: number): void {
  const profile = SPECIES_BY_ID[c.speciesId];
  c.phase += dt * (c.moving ? 7 : 1.5);
  c.attackCd = Math.max(0, c.attackCd - dt);
  c.startled = Math.max(0, c.startled - dt);
  c.hunger = Math.min(1, c.hunger + dt * 0.01);
  c.thirst = Math.min(1, c.thirst + dt * 0.008);
  if (c.state === "REST" || c.state === "IDLE") c.energy = Math.min(1, c.energy + dt * 0.08);
  else c.energy = Math.max(0, c.energy - dt * 0.01);

  const playerDist = Math.hypot(sim.player.x - c.x, sim.player.z - c.z);
  let threat = threatOf(sim, c);
  const scaredByPlayer = (profile.temperament === "skittish" || (sim.player.sprinting && (profile.temperament === "calm" || profile.temperament === "curious"))) && playerDist < profile.fleeRadius;
  if (scaredByPlayer && (!threat || playerDist < threat.d)) threat = { x: sim.player.x, z: sim.player.z, d: playerDist };
  if (threat && threat.d < 8) c.fear = Math.min(1, c.fear + dt * 0.9);
  else c.fear = Math.max(0, c.fear - dt * 0.3);

  const prey = profile.diet === "carnivore" ? nearest(sim.creatures, c.x, c.z, (o) => o.speciesId === "rabbit") : null;
  const food = profile.diet !== "carnivore" ? nearestProp(sim, c.x, c.z, "berry") : null;
  const inTerritory =
    c.speciesId === "wolf" &&
    Math.hypot(c.x - SPAWNS.territory.x, c.z - SPAWNS.territory.z) < SPAWNS.territory.r;

  c.aiAcc += dt;
  if (c.aiAcc >= 1 / CONFIG.aiHz) {
    c.aiAcc = 0;
    c.state = decide({
      speciesId: c.speciesId,
      diet: profile.diet,
      temperament: profile.temperament,
      fleeRadius: profile.fleeRadius,
      hunger: c.hunger,
      thirst: c.thirst,
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
    });
  }

  if (c.speciesId === "eagle") {
    updateEagle(sim, c, dt, prey);
    return;
  }

  let speed = profile.speed;
  if (c.state === "FLEE") speed *= 1.25;
  if (c.state === "IDLE" || c.state === "EAT" || c.state === "DRINK" || c.state === "REST") speed = 0;

  if (c.retarget > 0) c.retarget -= dt;

  if (c.state === "FLEE") {
    const danger = threat ?? { x: sim.player.x, z: sim.player.z };
    const dx = c.x - danger.x;
    const dz = c.z - danger.z;
    const m = Math.hypot(dx, dz) || 1;
    c.tx = c.x + (dx / m) * 7;
    c.tz = c.z + (dz / m) * 7;
  } else if (c.state === "WANDER" && c.retarget <= 0) {
    const ang = rngNext(c) * Math.PI * 2;
    const rad = 2 + rngNext(c) * 5;
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
    const dist = c.command === "PROTECT" ? 1.3 : 1.8;
    c.tx = sim.player.x - back.fx * dist;
    c.tz = sim.player.z - back.fz * dist;
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
  }

  if (
    c.speciesId === "auryn" &&
    !c.tamed &&
    c.state !== "FLEE" &&
    c.startled <= 0 &&
    c.trust > 22 &&
    playerDist > 2.5 &&
    playerDist < 9 &&
    !sim.player.sprinting
  ) {
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
    if (playerDist > 5 && moved < profile.speed * dt * 0.15) c.stuck += dt;
    else c.stuck = 0;
    if ((c.stuck > 2.4 && playerDist > 10) || playerDist > 24) {
      const back = basis(sim.player.yaw);
      const safe = safeGroundPoint(sim, sim.player.x - back.fx * 2, sim.player.z - back.fz * 2, c.homeX, c.homeZ);
      c.x = safe.x;
      c.z = safe.z;
      c.y = groundY(c);
      c.stuck = 0;
      toast(sim, "recover", `${c.name || "Auryn"} contornou um obstáculo e voltou para perto.`, 6);
    }
    c.xp += dt;
  }

  if (c.speciesId === "wolf" && (c.state === "DEFEND" || (c.state === "CHASE" && playerDist < 2.2))) {
    if (playerDist < 1.25 && c.attackCd <= 0 && sim.player.iframes <= 0) {
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
      toast(sim, "nip", "O lobo defendeu o território. Recue ou peça proteção à Auryn.", 2.5);
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

function updateEagle(sim: Simulation, c: SimCreature, dt: number, prey: { c: SimCreature; d: number } | null): void {
  c.fly += dt * 0.42;
  const hungryDive = c.state === "CHASE" && prey && prey.d < 12;
  c.dip = clamp(c.dip + dt * (hungryDive ? 0.7 : -0.8), 0, 1);
  c.x = 2 + Math.cos(c.fly) * 14;
  c.z = 4 + Math.sin(c.fly) * 11;
  c.y = 8.6 + Math.sin(c.fly * 2) * 0.8 - c.dip * 5.8;
  c.yaw = c.fly + Math.PI / 2;
  c.moving = true;
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

function updateBond(sim: Simulation, dt: number, offer: boolean): void {
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn");
  if (!auryn || auryn.tamed) return;
  const dist = Math.hypot(sim.player.x - auryn.x, sim.player.z - auryn.z);
  const moving = sim.player.speed > 0.4;

  const result = stepBond({
    trust: auryn.trust,
    tamed: false,
    dist,
    sprinting: sim.player.sprinting,
    moving,
    offer: offer && sim.inventory.glowfruit > 0,
    observed: auryn.observe >= 3,
    threatened: auryn.fear > 0.45,
    socialAssist: false,
    dt,
  });
  auryn.trust = result.trust;
  if (result.startled) auryn.startled = 1.6;
  if (offer && !result.consumed) toast(sim, "refuse", "Ainda não. Observe parada, espere confiança 58 e ofereça quando ela estiver tranquila. O fruto ficou na bolsa.", 2);
  if (result.consumed) {
    mark(sim, "auryn", "interact");
    sim.inventory.glowfruit -= 1;
    toast(sim, "offer", result.tamed ? "" : "A Auryn aceitou o frutiluz, mas ainda mede você.", 2);
  }
  if (result.bonded) {
    auryn.tamed = true;
    auryn.command = "FOLLOW";
    auryn.name = sim.petName || "Auryn";
    auryn.trust = 100;
    toast(sim, "bond", `${auryn.name} aceitou o vínculo e passa a caminhar com você.`, 1);
  }
}

function updateWorld(sim: Simulation, input: SimInput, dt: number): void {
  for (const key of Object.keys(sim.toastCd)) {
    sim.toastCd[key] = (sim.toastCd[key] ?? 0) - dt;
  }
  for (const t of sim.toasts) t.ttl -= dt;
  sim.toasts = sim.toasts.filter((t) => t.ttl > 0 && t.text);
  for (const p of sim.props) if (p.depleted > 0) p.depleted -= dt;

  if (input.pet) commandPet(sim, input.pet);

  const auryn = sim.creatures.find((c) => c.speciesId === "auryn");
  let offer = false;
  if (input.interactEdge) offer = interact(sim);
  if (auryn?.tamed && auryn.command === "PROTECT") {
    for (const wolf of sim.creatures) {
      if (wolf.speciesId !== "wolf") continue;
      if (Math.hypot(wolf.x - sim.player.x, wolf.z - sim.player.z) < 11 && Math.hypot(wolf.x - auryn.x, wolf.z - auryn.z) < 8) {
        wolf.fear = Math.max(wolf.fear, 0.85);
      }
    }
  }
  updateBond(sim, dt, offer);

  if (sim.player.health <= 0) {
    sim.player.x = SPAWNS.player.x;
    sim.player.z = SPAWNS.player.z;
    sim.player.y = heightAt(sim.player.x, sim.player.z);
    sim.player.health = 100;
    sim.player.iframes = 2;
    toast(sim, "down", "Você recuou até a clareira para recuperar o fôlego.", 2);
  }

  if (input.discover) updateDiscoveries(sim, dt);
  sim.prompt = makePrompt(sim);
  sim.time += dt;
}

function interact(sim: Simulation): boolean {
  const target = interactionTarget(sim);
  if (target.kind === "collect") {
    const key = target.prop.kind === "glow" ? "glowfruit" : "berries";
    if (sim.inventory[key] >= 20) { toast(sim, "full", "A bolsa está cheia para esse fruto.", 2); return false; }
    target.prop.taken = true;
    sim.inventory[key] += 1;
    toast(sim, "pick", key === "glowfruit" ? "Frutiluz na bolsa. Observe a Auryn antes de oferecer." : "Fruto colhido. Abra a bolsa para comer.", 1);
  } else if (target.kind === "offer") return true;
  else if (target.kind === "observe") {
    mark(sim, target.creature.speciesId, "interact");
    toast(sim, "note-" + target.creature.id, `${SPECIES_BY_ID[target.creature.speciesId].name}: encontro registrado no diário.`, 2);
  } else if (target.kind === "drink") {
    sim.player.thirst = 0;
    toast(sim, "drink", "Sede recuperada no lago do jogo. Na natureza, água sem tratamento pode causar doenças.", 2);
  }
  return false;
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

function updateDiscoveries(sim: Simulation, dt: number): void {
  for (const c of sim.creatures) {
    const profile = SPECIES_BY_ID[c.speciesId];
    const d = Math.hypot(c.x - sim.player.x, c.z - sim.player.z);
    if (d < profile.sight) mark(sim, c.speciesId, "seen");
    if (d < (c.speciesId === "eagle" ? 18 : 5.5) && !sim.player.sprinting && sim.player.speed < 1.2) c.observe = Math.min(8, c.observe + dt);
    else c.observe = Math.max(0, c.observe - dt * 0.2);
    if (c.observe > 3) mark(sim, c.speciesId, "behavior");
  }
}

function makePrompt(sim: Simulation): string {
  const target = interactionTarget(sim);
  if (target.kind === "collect") return target.prop.kind === "glow" ? "E · colher frutiluz" : "E · colher fruto";
  if (target.kind === "offer") {
    const c = target.creature;
    return c.trust >= 58 && c.observe >= 3 && c.fear <= 0.45 && !sim.player.sprinting ? "E · oferecer frutiluz" : "Observe sem se mover. Espere confiança 58 e tranquilidade antes de oferecer.";
  }
  if (target.kind === "observe") return `E · observar ${SPECIES_BY_ID[target.creature.speciesId].name.toLowerCase()}`;
  if (target.kind === "drink") return "E · beber no lago";
  const trust = trustSnapshot(sim);
  if (trust?.near) return sim.player.sprinting ? "Devagar. Correr desfaz a confiança da Auryn." : `Confiança ${Math.round(trust.value)}. Observe parada; a Auryn se aproxima com confiança.`;
  if (sim.player.swimming) return "Água funda. Nade até a margem.";
  return "";
}

export function stepSim(sim: Simulation, input: SimInput, dt: number): void {
  if (dt <= 0) return;
  updatePlayer(sim, input, dt);
  for (const c of sim.creatures) updateCreature(sim, c, dt);
  updateWorld(sim, input, dt);
}

export function petSnapshot(sim: Simulation): { name: string; command: PetCommand; level: number; xp: number } | null {
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn" && c.tamed);
  if (!auryn) return null;
  return { name: auryn.name || "Auryn", command: auryn.command, level: 1 + Math.floor(auryn.xp / 40), xp: auryn.xp };
}

export function trustSnapshot(sim: Simulation): { value: number; near: boolean } | null {
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn" && !c.tamed);
  if (!auryn) return null;
  const d = Math.hypot(auryn.x - sim.player.x, auryn.z - sim.player.z);
  if (d > 12) return null;
  return { value: auryn.trust, near: d < 8 };
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

export function commandPet(sim: Simulation, command: PetCommand): void {
  const pet = sim.creatures.find(c => c.speciesId === "auryn" && c.tamed);
  if (!pet) return;
  pet.command = command;
  pet.aiAcc = 1 / CONFIG.aiHz;
  const labels = { FOLLOW: "seguir", STAY: "esperar", RETURN: "voltar", PROTECT: "proteger" };
  toast(sim, "cmd-" + command, `${pet.name || "Auryn"} vai ${labels[command]}.`, 0.4);
}
