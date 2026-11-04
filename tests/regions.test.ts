import { describe, expect, test } from 'vitest';
import { createSim, stepSim, toSave, travel, commandPet, pets } from '../src/game/sim/simulation';
import type { SimInput, Simulation } from '../src/game/sim/simulation';
import { allRegions, region, setActiveRegion } from '../src/game/world/region';
import { obstacles } from '../src/game/world/layout';
import { heightAt, isDeepWater } from '../src/game/world/terrain';
import { migrateSave } from '../src/game/persistence/schema';
import { SPECIES, SPECIES_BY_ID } from '../src/game/data/species';
import { interactionTarget } from '../src/game/sim/interaction';
import { CONFIG } from '../src/game/config';
import { DAY_LENGTH } from '../src/game/world/clock';

const idle: SimInput = { moveX: 0, moveZ: 0, camYaw: 0, sprint: false, jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null, discover: true };
const advance = (sim: Simulation, seconds: number, input = idle) => { for (let i = 0; i < seconds * 60; i++) stepSim(sim, input, 1 / 60); };
const settings = { quality: 'low' as const, lookSens: .0045 };

/** Contract every registered region must satisfy. New regions are checked automatically. */
describe.each(allRegions().map(r => [r.id, r] as const))('contrato da região %s', (id, def) => {
  test('spawns, props e saídas ficam dentro do mundo, em terra firme e fora de obstáculos', () => {
    setActiveRegion(id);
    const obs = obstacles();
    const points = [
      ...def.creatures.map(c => ({ id: c.id, x: c.x, z: c.z, water: !!(SPECIES_BY_ID[c.speciesId].traits.swims || SPECIES_BY_ID[c.speciesId].traits.flies) })),
      ...def.props.map(p => ({ id: p.id, x: p.x, z: p.z, water: false })),
      ...def.exits.map(e => ({ id: e.id, x: e.x, z: e.z, water: false })),
      { id: 'spawn', x: def.spawn.x, z: def.spawn.z, water: false },
      { id: 'camp', x: def.camp.x, z: def.camp.z, water: false },
    ];
    for (const p of points) {
      expect(Math.hypot(p.x, p.z), p.id).toBeLessThan(CONFIG.worldRadius);
      if (!p.water) expect(isDeepWater(p.x, p.z), p.id).toBe(false);
      for (const o of obs) expect(Math.hypot(p.x - o.x, p.z - o.z), `${p.id} dentro de obstáculo`).toBeGreaterThan(o.r);
    }
    expect(Number.isFinite(heightAt(0, 0))).toBe(true);
  });
  test('cada saída chega a um ponto válido de uma região registrada', () => {
    for (const exit of def.exits) {
      const target = allRegions().find(r => r.id === exit.to)!;
      expect(target).toBeDefined();
      setActiveRegion(target.id);
      expect(isDeepWater(exit.arrive.x, exit.arrive.z)).toBe(false);
      for (const o of obstacles()) expect(Math.hypot(exit.arrive.x - o.x, exit.arrive.z - o.z)).toBeGreaterThan(o.r);
      expect(target.exits.some(back => back.to === id), 'há caminho de volta').toBe(true);
    }
  });
  test('as espécies da região declaram essa região; IDs são únicos entre regiões', () => {
    for (const c of def.creatures) expect(SPECIES_BY_ID[c.speciesId].regions, c.id).toContain(id);
    const ids = allRegions().flatMap(r => [...r.creatures.map(c => c.id), ...r.props.map(p => p.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('dados das espécies', () => {
  test('toda espécie vive em alguma região que a contém; assistência aponta para espécie domesticável', () => {
    for (const s of SPECIES) {
      for (const r of s.regions) expect(allRegions().find(d => d.id === r)!.creatures.some(c => c.speciesId === s.id), `${s.id} em ${r}`).toBe(true);
      if (s.assist) { expect(SPECIES_BY_ID[s.assist.by].domesticable).toBe(true); expect(s.tameMethod).toBe('assisted'); }
      if (s.tameMethod !== 'none') expect(s.offering).not.toBeNull();
    }
  });
});

describe('viagem entre regiões', () => {
  test('ida e volta: companheiros que seguem vêm junto; os que esperam ficam', () => {
    const sim = createSim(null);
    const auryn = sim.creatures.find(c => c.speciesId === 'auryn')!, moss = sim.creatures.find(c => c.id === 'moss-1')!;
    auryn.tamed = true; moss.tamed = true;
    commandPet(sim, 'FOLLOW'); moss.command = 'STAY';
    const exit = region().exits[0]!;
    sim.player.x = exit.x - 1; sim.player.z = exit.z;
    expect(interactionTarget(sim).kind).toBe('travel');
    stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(sim.region).toBe('vereda');
    expect(region().id).toBe('vereda');
    expect(sim.creatures.some(c => c.id === auryn.id)).toBe(true);
    expect(sim.creatures.some(c => c.id === moss.id)).toBe(false);
    expect(sim.creatures.some(c => c.speciesId === 'anteater')).toBe(true);
    expect(sim.creatures.some(c => c.speciesId === 'capybara')).toBe(false);
    expect(sim.visited).toEqual(['mata', 'vereda']);
    expect(sim.player.x).toBeCloseTo(exit.arrive.x);
    // Save in the Vereda and reload: region, companions and Mata state survive.
    const back = createSim(migrateSave(JSON.parse(JSON.stringify(toSave(sim, settings)))));
    expect(back.region).toBe('vereda');
    expect(back.creatures.find(c => c.id === auryn.id)?.tamed).toBe(true);
    expect(back.away.find(c => c.id === moss.id)).toMatchObject({ tamed: true, command: 'STAY', region: 'mata' });
    expect(travel(back, region().exits[0]!.id)).toBe(true);
    expect(back.region).toBe('mata');
    expect(back.creatures.some(c => c.id === moss.id)).toBe(true);
    expect(pets(back).length).toBe(2);
  });
  test('fruta-do-lobo é coletada na Vereda e persiste', () => {
    const sim = createSim(null);
    travel(sim, 'to-vereda');
    const lobeira = sim.props.find(p => p.kind === 'wolfapple')!;
    sim.player.x = lobeira.x + 1; sim.player.z = lobeira.z;
    stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
    expect(sim.inventory.wolfapple).toBe(1);
    const save = migrateSave(toSave(sim, settings))!;
    expect(save.inventory.wolfapple).toBe(1);
    expect(save.picked[lobeira.id]).toBe(true);
  });
  test('save v2 sem região migra para v3 na Mata', () => {
    const v3 = toSave(createSim(null), settings) as unknown as Record<string, unknown>;
    const v2 = { ...v3, version: 2 }; delete (v2 as Record<string, unknown>).region; delete (v2 as Record<string, unknown>).visited;
    const migrated = migrateSave(v2)!;
    expect(migrated).toMatchObject({ version: 3, region: 'mata', visited: ['mata'] });
    expect(migrated.inventory.wolfapple).toBe(0);
  });
});

describe('fauna do Cerrado', () => {
  test('tamanduá come num cupinzeiro e depois procura outro', () => {
    const sim = createSim(null); travel(sim, 'to-vereda');
    const ant = sim.creatures.find(c => c.speciesId === 'anteater')!;
    sim.creatures = [ant]; ant.hunger = 0.95;
    sim.player.x = -25; sim.player.z = 20;
    let ate = false;
    for (let i = 0; i < 40 * 60 && !ate; i++) { stepSim(sim, idle, 1 / 60); ate = ant.state === 'EAT'; }
    expect(ate).toBe(true);
    for (let i = 0; i < 20 * 60 && !sim.moundCd.some(v => v > 0); i++) stepSim(sim, idle, 1 / 60);
    expect(sim.moundCd.some(v => v > 0)).toBe(true);
  });
  test('lobo-guará busca fruta-do-lobo e não ataca o jogador', () => {
    const sim = createSim(null); travel(sim, 'to-vereda');
    const guara = sim.creatures.find(c => c.speciesId === 'manedwolf')!;
    sim.creatures = [guara]; guara.hunger = 0.9; sim.time = DAY_LENGTH * 0.47; // dusk: active
    sim.player.x = -25; sim.player.z = 20;
    advance(sim, 3);
    expect(['SEARCH_FOOD', 'EAT']).toContain(guara.state);
    sim.player.x = guara.x + 1; sim.player.z = guara.z;
    const hp = sim.player.health;
    advance(sim, 2);
    expect(sim.player.health).toBe(hp);
    expect(SPECIES_BY_ID.manedwolf.temperament).not.toBe('territorial');
  });
  test('brasalume só confia à noite com um musgarim companheiro por perto', () => {
    const sim = createSim(null); travel(sim, 'to-vereda');
    const bras = sim.creatures.find(c => c.speciesId === 'brasalume')!;
    const moss = createSim(null).creatures.find(c => c.speciesId === 'mosslight')!;
    moss.tamed = true; moss.command = 'STAY'; moss.region = 'vereda';
    sim.creatures = [bras, moss]; sim.obstacles = []; sim.props = [];
    sim.inventory.wolfapple = 1;
    sim.discoveries.brasalume = { seen: true, habitat: true, behavior: false, interacted: false };
    sim.time = DAY_LENGTH * 0.62; // night
    bras.hidden = false;
    sim.player.x = bras.x; sim.player.z = bras.z + 1.5;
    moss.x = bras.x + 5; moss.z = bras.z;
    advance(sim, 2);
    expect(bras.calm).toBe(0);
    for (let i = 0; i < 12 * 60 && !bras.tamed; i++) {
      moss.x = bras.x + 1.2; moss.z = bras.z; moss.tx = moss.x; moss.tz = moss.z;
      sim.player.x = bras.x; sim.player.z = bras.z + 1.5;
      stepSim(sim, { ...idle, interactEdge: i > 8 * 60 && i % 20 === 0 }, 1 / 60);
    }
    expect(bras.tamed).toBe(true);
    expect(sim.inventory.wolfapple).toBe(0);
  });
});
