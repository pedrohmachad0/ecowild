import assert from "node:assert/strict";
import { test } from "vitest";
import { decide } from "../src/game/ai/brain.ts";
import { axesFromKeys } from "../src/game/input/actions.ts";
import { basis } from "../src/game/math.ts";
import { migrateSave } from "../src/game/persistence/save.ts";
import { createSim, stepSim } from "../src/game/sim/simulation.ts";
import { stepBond } from "../src/game/taming/bond.ts";

const idle = {
  moveX: 0,
  moveZ: 0,
  camYaw: 0,
  sprint: false,
  jumpEdge: false,
  interactEdge: false,
  useBerryEdge: false,
  pet: null,
  discover: false,
};

test("W walks toward camera forward and A strafes left", () => {
  const sim = createSim(null);
  const z0 = sim.player.z;
  const x0 = sim.player.x;
  for (let i = 0; i < 30; i++) stepSim(sim, { ...idle, moveZ: 1 }, 1 / 60);
  assert.ok(sim.player.z < z0 - 0.5, `expected forward −Z, z ${sim.player.z}`);
  const simA = createSim(null);
  for (let i = 0; i < 30; i++) stepSim(simA, { ...idle, moveX: -1 }, 1 / 60);
  assert.ok(simA.player.x < x0 - 0.4, `A should move −X (left when facing −Z), x ${simA.player.x}`);
  const yaw0 = simA.player.yaw;
  assert.ok(yaw0 > 0.2, `body should face the strafe, yaw ${yaw0}`);
});

test("W+A turns the body left under the chase basis", () => {
  const b = basis(0);
  assert.ok(Math.abs(b.fz + 1) < 1e-6);
  assert.equal(axesFromKeys(new Set(["KeyA"])).moveX, -1);
  assert.equal(axesFromKeys(new Set(["KeyD"])).moveX, 1);
  const sim = createSim(null);
  const y0 = sim.player.yaw;
  for (let i = 0; i < 20; i++) stepSim(sim, { ...idle, moveX: -0.7, moveZ: 0.7 }, 1 / 60);
  const d = Math.atan2(Math.sin(sim.player.yaw - y0), Math.cos(sim.player.yaw - y0));
  assert.ok(d > 0.05, `A+W should increase yaw (left), got ${d}`);
});

test("rabbit flees a close sprint and wolf defends territory", () => {
  const flee = decide({
    speciesId: "rabbit",
    diet: "herbivore",
    temperament: "skittish",
    fleeRadius: 7,
    hunger: 0.2,
    thirst: 0.2,
    fear: 0,
    energy: 1,
    threatDist: null,
    preyDist: null,
    foodDist: null,
    waterDist: 20,
    playerDist: 3,
    playerSprinting: false,
    inTerritory: false,
    tamed: false,
    command: null,
    preferIdle: false,
  });
  assert.equal(flee, "FLEE");
  const defend = decide({
    speciesId: "wolf",
    diet: "carnivore",
    temperament: "territorial",
    fleeRadius: 4,
    hunger: 0.2,
    thirst: 0.2,
    fear: 0,
    energy: 1,
    threatDist: null,
    preyDist: 30,
    foodDist: null,
    waterDist: 20,
    playerDist: 4,
    playerSprinting: false,
    inTerritory: true,
    tamed: false,
    command: null,
    preferIdle: false,
  });
  assert.equal(defend, "DEFEND");
});

test("frutiluz after study bonds Auryn; sprinting does not", () => {
  const calm = stepBond({
    trust: 60,
    tamed: false,
    dist: 2,
    sprinting: false,
    moving: false,
    offer: true,
    observed: true,
    socialAssist: false,
    dt: 0.1,
  });
  assert.equal(calm.tamed, true);
  assert.equal(calm.consumed, true);
  const rush = stepBond({
    trust: 40,
    tamed: false,
    dist: 3,
    sprinting: true,
    moving: true,
    offer: true,
    observed: false,
    socialAssist: false,
    dt: 0.2,
  });
  assert.equal(rush.tamed, false);
  assert.ok(rush.trust < 40);
});

test("tamed Auryn follows and save round-trips", () => {
  const sim = createSim(null);
  const auryn = sim.creatures.find((c) => c.speciesId === "auryn");
  assert.ok(auryn);
  auryn.tamed = true;
  auryn.command = "FOLLOW";
  auryn.x = sim.player.x + 8;
  auryn.z = sim.player.z;
  for (let i = 0; i < 90; i++) stepSim(sim, idle, 1 / 60);
  const d = Math.hypot(auryn.x - sim.player.x, auryn.z - sim.player.z);
  assert.ok(d < 4, `pet should close in, dist ${d}`);
  const blob = migrateSave({
    version: 1,
    player: { x: 3, y: 1, z: 4, yaw: 0.2, health: 80, energy: 70, thirst: 10 },
    inventory: { glowfruit: 1, berries: 2 },
    settings: { quality: "low", lookSens: 0.004 },
    discoveries: { auryn: { seen: true, habitat: false, behavior: true, interacted: false } },
    creatures: { [auryn.id]: { x: 1, z: 2, hunger: 0.2, thirst: 0.2, fear: 0, energy: 1, trust: 80, tamed: true } },
    picked: {},
    pet: { name: "Luz", xp: 10, command: "STAY" },
  });
  assert.ok(blob);
  assert.equal(blob.pet?.name, "Luz");
  assert.equal(blob.discoveries.auryn?.seen, true);
  assert.equal(migrateSave({ nope: true }), null);
});
