import { describe, expect, test } from 'vitest';
import { createSim, stepSim, commandPet, toSave } from '../src/game/sim/simulation';
import type { SimInput } from '../src/game/sim/simulation';
import { stepBond } from '../src/game/taming/bond';
import { migrateSave } from '../src/game/persistence/schema';
import { heightAt, isDeepWater, waterDistance } from '../src/game/world/terrain';
import { interactionTarget } from '../src/game/sim/interaction';
import { catalogView } from '../src/game/catalog/discoveries';
import { CONFIG } from '../src/game/config';
import { scalingFor } from '../src/game/performance/quality';
const idle: SimInput = { moveX: 0, moveZ: 0, camYaw: 0, sprint: false, jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null, discover: true };
const settings = { quality: 'low' as const, lookSens: .0045 };
const advance = (sim: ReturnType<typeof createSim>, seconds: number, input = idle) => { for (let i = 0; i < seconds * 60; i++) stepSim(sim, input, 1 / 60); };

describe('vínculo sem exploração por spam', () => {
  test('oferta prematura, sem observação ou sob ameaça não consome fruto', () => {
    const base = { trust: 60, tamed: false, dist: 2, sprinting: false, moving: false, offer: true, observed: true, socialAssist: false, dt: 1 / 60 };
    for (const refusal of [{ observed: false }, { trust: 10 }, { threatened: true }, { sprinting: true }, { dist: 4 }]) {
      const result = stepBond({ ...base, ...refusal });
      expect(result.consumed).toBe(false); expect(result.tamed).toBe(false);
    }
    expect(stepBond(base).bonded).toBe(true);
  });
  test('coleta → presença → observação → oferta única → comandos → save/load', () => {
    const sim = createSim(null);
    const auryn = sim.creatures.find(c => c.speciesId === 'auryn')!;
    // Deterministic encounter fixture: no nearby predators, normal simulation and actions.
    sim.creatures = [auryn]; sim.obstacles = [];
    sim.player.x = -8; sim.player.z = -4;
    stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(sim.inventory.glowfruit).toBe(1);
    expect(sim.props.find(p => p.id === 'glow-0')!.taken).toBe(true);
    sim.player.x = auryn.x; sim.player.z = auryn.z + 1;
    sim.props.forEach(p => { p.taken = true; });
    for (let i = 0; i < 10; i++) stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(sim.inventory.glowfruit).toBe(1); expect(auryn.tamed).toBe(false);
    // Keep observing as the curious animal approaches.
    for (let i = 0; i < 600; i++) {
      sim.player.x = auryn.x; sim.player.z = auryn.z + 1;
      stepSim(sim, idle, 1 / 60);
    }
    expect(auryn.observe).toBeGreaterThanOrEqual(3);
    expect(auryn.trust).toBeGreaterThanOrEqual(58);
    stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(auryn.tamed).toBe(true); expect(sim.inventory.glowfruit).toBe(0);
    expect(sim.discoveries.auryn).toEqual({ seen: true, habitat: true, behavior: true, interacted: true });
    commandPet(sim, 'STAY');
    const pos = { x: auryn.x, z: auryn.z }; advance(sim, 2);
    expect(auryn.x).toBe(pos.x); expect(auryn.z).toBe(pos.z);
    auryn.name = 'Luz'; auryn.xp = 85;
    const restored = createSim(migrateSave(toSave(sim, settings)));
    const pet = restored.creatures.find(c => c.speciesId === 'auryn')!;
    expect(pet).toMatchObject({ name: 'Luz', command: 'STAY', tamed: true, trust: 100, xp: 85 });
    expect(restored.inventory.glowfruit).toBe(0);
    commandPet(restored, 'RETURN');
    restored.player.z += 7; const before = Math.hypot(pet.x - restored.player.x, pet.z - restored.player.z);
    advance(restored, 1);
    expect(Math.hypot(pet.x - restored.player.x, pet.z - restored.player.z)).toBeLessThan(before);
  });
});

describe('mundo e fauna', () => {
  test('terreno baixo fora do lago é seco; margem acessível permite beber', () => {
    expect(heightAt(-20, -20)).toBeLessThan(CONFIG.waterY - .2);
    expect(isDeepWater(-20, -20)).toBe(false);
    expect(isDeepWater(8, 2)).toBe(true);
    let x = 20; while (!isDeepWater(x - .1, 2)) x -= .1;
    expect(waterDistance(x, 2)).toBeLessThan(1.5);
    const sim = createSim(null); sim.creatures = []; sim.props = [];
    sim.player.x = x; sim.player.z = 2; sim.player.thirst = 60;
    expect(interactionTarget(sim).kind).toBe('drink');
    stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(sim.player.thirst).toBe(0);
  });
  test('colisão do jogador e velocidade diagonal são coerentes', () => {
    const a = createSim(null), b = createSim(null);
    a.obstacles = []; b.obstacles = [];
    advance(a, .5, { ...idle, moveZ: 1 }); advance(b, .5, { ...idle, moveZ: 1, moveX: 1 });
    expect(Math.hypot(b.player.x, b.player.z - 18)).toBeCloseTo(18 - a.player.z, 5);
    a.obstacles = [{ x: a.player.x, z: a.player.z - 1, r: .55, kind: 'tree' }];
    const o = a.obstacles[0]; advance(a, 1, { ...idle, moveZ: 1 });
    expect(Math.hypot(a.player.x - o.x, a.player.z - o.z)).toBeGreaterThanOrEqual(.55 + CONFIG.playerRadius - .001);
  });
  test('coelho se afasta do jogador, não de um alvo antigo', () => {
    const sim = createSim(null), rabbit = sim.creatures.find(c => c.speciesId === 'rabbit')!;
    sim.creatures = [rabbit]; sim.obstacles = [];
    sim.player.x = -3; sim.player.z = 16; rabbit.x = -3; rabbit.z = 14;
    rabbit.tx = sim.player.x; rabbit.tz = sim.player.z;
    advance(sim, .5);
    expect(rabbit.state).toBe('FLEE'); expect(rabbit.z).toBeLessThan(14);
  });
  test('proteção exige proximidade da companheira e tem efeito sobre o lobo', () => {
    const sim = createSim(null), pet = sim.creatures.find(c => c.speciesId === 'auryn')!, wolf = sim.creatures.find(c => c.speciesId === 'wolf')!;
    sim.creatures = [pet, wolf]; sim.obstacles = [];
    sim.player.x = -12; sim.player.z = -12; wolf.x = -13; wolf.z = -12;
    pet.tamed = true; commandPet(sim, 'PROTECT'); pet.x = 0; pet.z = -12;
    stepSim(sim, idle, 1 / 60); expect(wolf.fear).toBeLessThan(.5);
    pet.x = -11; pet.z = -12; stepSim(sim, idle, 1 / 60);
    expect(wolf.fear).toBeGreaterThanOrEqual(.85);
    advance(sim, .2); expect(wolf.state).toBe('FLEE');
  });
  test('recuperação distante do pet escolhe terra e respeita STAY', () => {
    const sim = createSim(null), pet = sim.creatures.find(c => c.speciesId === 'auryn')!;
    sim.creatures = [pet]; pet.tamed = true; pet.x = -28; pet.z = 2;
    sim.player.x = 8; sim.player.z = 2;
    commandPet(sim, 'STAY'); advance(sim, .2); expect(pet.x).toBe(-28);
    commandPet(sim, 'RETURN'); advance(sim, .2);
    expect(isDeepWater(pet.x, pet.z)).toBe(false);
    expect(Math.hypot(pet.x - 8, pet.z - 2)).toBeLessThan(15);
  });
  test('fruto mostrado no prompt é o mesmo alvo que a ação usa', () => {
    const sim = createSim(null); sim.player.x = -2; sim.player.z = 12;
    sim.creatures.find(c => c.speciesId === 'eagle')!.x = -2;
    stepSim(sim, idle, 1 / 60);
    expect(sim.prompt).toContain('colher fruto'); stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(sim.inventory.berries).toBe(1);
  });
});

describe('save e diário', () => {
  test('v1 conserva progresso; versões futuras e payload estruturalmente inválido são recusados', () => {
    const save = toSave(createSim(null), settings);
    expect(migrateSave(save)).toMatchObject({ ...save, discoveries: {} });
    for (const data of [null, [], {}, { ...save, version: 2 }, { ...save, version: undefined }, { ...save, player: {} }, { ...save, player: { ...save.player, x: NaN } }]) expect(migrateSave(data)).toBeNull();
  });
  test('campos limitados, IDs conhecidos e domesticação elegível', () => {
    const save = toSave(createSim(null), settings);
    save.inventory.berries = 500; save.player.x = 1000;
    save.creatures['wolf-1'].tamed = true;
    save.creatures['unknown'] = { ...save.creatures['wolf-1'] };
    save.discoveries.rabbit = { seen: false, behavior: true, habitat: true, interacted: true };
    const clean = migrateSave(save)!;
    expect(clean.inventory.berries).toBe(20); expect(clean.creatures['unknown']).toBeUndefined();
    expect(clean.creatures['wolf-1'].tamed).toBe(false);
    expect(catalogView(clean.discoveries).find(c => c.id === 'rabbit')!.progress).toBe(0);
    const sim = createSim(clean); expect(Math.hypot(sim.player.x, sim.player.z)).toBeLessThanOrEqual(CONFIG.worldRadius + .001);
  });
  test('snapshot não muda quando o diário da simulação avança', () => {
    const sim = createSim(null), save = toSave(sim, settings);
    advance(sim, 1); expect(sim.discoveries).not.toEqual({}); expect(save.discoveries).toEqual({});
  });
  test('informações não descobertas ficam bloqueadas', () => {
    for (const entry of catalogView({})) {
      expect(entry.known).toBe(false); expect(entry.scientific).toBeNull(); expect(entry.abilities).toEqual([]); expect(entry.progress).toBe(0);
    }
  });
  test('escala de resolução corresponde a pixels CSS mesmo com DPR 2', () => {
    expect(1 / scalingFor('high', 2)).toBeCloseTo(1.75);
    expect(1 / scalingFor('medium', 2)).toBeCloseTo(1.15);
    expect(1 / scalingFor('low', 2)).toBeCloseTo(.9);
  });
});
