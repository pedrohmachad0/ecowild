import { describe, expect, test } from 'vitest';
import { createSim, stepSim, toSave, shout, usePetAbility, recordPhoto, commandPet, INCUBATION_SECONDS } from '../src/game/sim/simulation';
import type { SimInput, Simulation } from '../src/game/sim/simulation';
import { migrateSave } from '../src/game/persistence/schema';
import { dayFraction, daylight, isActive, DAY_LENGTH, dayPeriod, clockLabel } from '../src/game/world/clock';
import { lineOfSight } from '../src/game/sim/perception';
import { CAMP, NESTS, SPAWNS } from '../src/game/world/layout';
import { CONFIG } from '../src/game/config';
import { interactionTarget } from '../src/game/sim/interaction';
import { challengeViews } from '../src/game/progression/challenges';
import { SPECIES } from '../src/game/data/species';
import { stepAssistedBond, ASSISTED_RULES } from '../src/game/taming/bond';

const idle: SimInput = { moveX: 0, moveZ: 0, camYaw: 0, sprint: false, jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null, discover: true };
const advance = (sim: Simulation, seconds: number, input = idle) => { for (let i = 0; i < seconds * 60; i++) stepSim(sim, input, 1 / 60); };
const press = (sim: Simulation) => stepSim(sim, { ...idle, interactEdge: true }, 1 / 60);
const settings = { quality: 'low' as const, lookSens: .0045 };
const IMG = 'data:image/jpeg;base64,' + 'A'.repeat(200);

describe('visão fundadora: classificação multidimensional', () => {
  test('mamíferos, ave, réptil, anfíbio, peixe e fantasia; habitats aquático, voador, subterrâneo, arborícola', () => {
    const groups = new Set(SPECIES.map(s => s.group));
    for (const g of ['mammal', 'bird', 'reptile', 'amphibian', 'fish', 'fantasy']) expect(groups.has(g as never)).toBe(true);
    const habitats = new Set(SPECIES.flatMap(s => s.ecological));
    for (const h of ['Aquático', 'Voadora', 'Subterrâneo', 'Arborícola', 'Semiaquático', 'Terrestre']) expect(habitats.has(h)).toBe(true);
  });
  test('ovos só para ovíparos; pet por ovo só com regra de fantasia identificada', () => {
    for (const s of SPECIES) {
      if (s.group === 'mammal') expect(s.reproduction).toBe('viviparous');
      if (s.reproduction === 'fantasy-egg') expect(s.scientific).toBeNull();
    }
    expect(SPECIES.find(s => s.id === 'eagle')!.reproduction).toBe('oviparous');
    expect(SPECIES.filter(s => s.domesticable).map(s => s.id).sort()).toEqual(['auryn', 'mosslight']);
  });
});

describe('ciclo de dia e noite', () => {
  test('relógio, períodos e luz', () => {
    expect(dayFraction(0)).toBeCloseTo(0.3);
    expect(dayFraction(DAY_LENGTH)).toBeCloseTo(0.3);
    expect(dayPeriod(0.5)).toBe('day'); expect(dayPeriod(0.02)).toBe('night'); expect(dayPeriod(0.75)).toBe('dusk');
    expect(daylight(0.5)).toBe(1); expect(daylight(0)).toBe(0);
    expect(clockLabel(0.5)).toBe('12:00');
    expect(isActive('night', 0.5)).toBe(false); expect(isActive('night', 0.95)).toBe(true);
    expect(isActive('day', 0.5)).toBe(true); expect(isActive('any', 0.1)).toBe(true);
  });
  test('tatu fica escondido na toca de dia e sai à noite', () => {
    const sim = createSim(null), tatu = sim.creatures.find(c => c.speciesId === 'armadillo')!;
    sim.creatures = [tatu];
    advance(sim, 3);
    expect(tatu.hidden).toBe(true);
    sim.time = DAY_LENGTH * 0.62; // night (≈ 0.92)
    advance(sim, 3);
    expect(tatu.hidden).toBe(false);
    expect(['WANDER', 'IDLE', 'SEARCH_FOOD']).toContain(tatu.state);
  });
  test('águia pousa no poleiro à noite', () => {
    const sim = createSim(null), eagle = sim.creatures.find(c => c.speciesId === 'eagle')!;
    sim.creatures = [eagle]; sim.time = DAY_LENGTH * 0.65;
    advance(sim, 8);
    expect(eagle.state).toBe('REST');
    expect(eagle.dip).toBe(0);
  });
});

describe('percepção por linha de visão', () => {
  test('árvore entre os pontos bloqueia; campo aberto não', () => {
    const tree = [{ x: 0, z: 0, r: 0.55, kind: 'tree' as const }];
    expect(lineOfSight(tree, -5, 0, 5, 0)).toBe(false);
    expect(lineOfSight(tree, -5, 3, 5, 3)).toBe(true);
  });
  test('o diário não registra animal escondido atrás de uma rocha', () => {
    const sim = createSim(null), toad = sim.creatures.find(c => c.speciesId === 'toad')!;
    sim.creatures = [toad]; sim.time = DAY_LENGTH * 0.6;
    // At night the toad is only visible within ~5.5 m; a rock sits between them.
    sim.obstacles = [{ x: 0, z: 12.2, r: 0.8, kind: 'rock' }];
    sim.player.x = 0; sim.player.z = 14; toad.x = 0; toad.z = 10; toad.homeX = 0; toad.homeZ = 10;
    advance(sim, 1);
    expect(sim.discoveries.toad?.seen ?? false).toBe(false);
    sim.obstacles = [];
    advance(sim, 1);
    expect(sim.discoveries.toad?.seen).toBe(true);
  });
});

describe('lambari', () => {
  test('nunca sai do lago e foge de quem nada perto', () => {
    const sim = createSim(null), fish = sim.creatures.filter(c => c.speciesId === 'fish');
    sim.creatures = fish;
    sim.player.x = CONFIG.lakeX; sim.player.z = CONFIG.lakeZ; sim.player.swimming = true;
    advance(sim, 6);
    for (const f of fish) expect(Math.hypot(f.x - CONFIG.lakeX, f.z - CONFIG.lakeZ)).toBeLessThan(5.2);
  });
});

describe('domesticação assistida do musgarim', () => {
  test('sem calma a confiança não sobe; com calma sobe e aceita fruto', () => {
    let r = stepAssistedBond({ trust: 0, dist: 2, sprinting: false, moving: false, offer: false, calm: 0, observed: true, dt: 1 });
    expect(r.trust).toBe(0);
    r = stepAssistedBond({ trust: 0, dist: 2, sprinting: false, moving: false, offer: false, calm: 5, observed: true, dt: 5 });
    expect(r.trust).toBeGreaterThanOrEqual(ASSISTED_RULES.trust);
    expect(stepAssistedBond({ trust: 55, dist: 2, sprinting: false, moving: false, offer: true, calm: 0, observed: true, dt: .016 }).consumed).toBe(false);
    expect(stepAssistedBond({ trust: 55, dist: 2, sprinting: false, moving: false, offer: true, calm: 3, observed: true, dt: .016 }).bonded).toBe(true);
  });
  test('percurso completo: Auryn acalma, jogador espera e oferece fruto da mata', () => {
    const sim = createSim(null);
    const auryn = sim.creatures.find(c => c.speciesId === 'auryn')!, moss = sim.creatures.find(c => c.speciesId === 'mosslight')!;
    sim.creatures = [auryn, moss]; sim.obstacles = []; sim.props = [];
    auryn.tamed = true; commandPet(sim, 'STAY');
    sim.inventory.berries = 1;
    sim.player.x = moss.x; sim.player.z = moss.z + 2;
    auryn.x = moss.x + 1; auryn.z = moss.z + 2;
    sim.discoveries.mosslight = { seen: true, habitat: true, behavior: false, interacted: false };
    press(sim);
    expect(moss.tamed).toBe(false); expect(sim.inventory.berries).toBe(1);
    expect(usePetAbility(sim, 'CALM')).toBe(true);
    for (let i = 0; i < 6 * 60 && !moss.tamed; i++) {
      sim.player.x = moss.x; sim.player.z = moss.z + 1.6;
      stepSim(sim, { ...idle, interactEdge: i > 5 * 60 && i % 20 === 0 }, 1 / 60);
    }
    expect(moss.tamed).toBe(true);
    expect(sim.inventory.berries).toBe(0);
    expect(sim.stats.assisted).toBe(1);
  });
});

describe('ovos, incubação e nascimento', () => {
  test('pegar ovo no ninho, chocar no acampamento e ganhar um filhote salvo no save', () => {
    const sim = createSim(null);
    sim.creatures = sim.creatures.filter(c => c.speciesId === 'auryn');
    sim.player.x = NESTS[0].x; sim.player.z = NESTS[0].z + 1;
    expect(interactionTarget(sim).kind).toBe('collect');
    press(sim);
    expect(sim.inventory.eggs).toBe(1);
    sim.player.x = CAMP.incubator.x + 1; sim.player.z = CAMP.incubator.z;
    expect(interactionTarget(sim).kind).toBe('incubate');
    press(sim);
    expect(sim.inventory.eggs).toBe(0); expect(sim.incubator).not.toBeNull();
    expect(interactionTarget(sim).kind).toBe('warming');
    // Warmth: full speed in daylight, 45% at night.
    for (let t = 0; t < INCUBATION_SECONDS / 0.45 + 5 && sim.incubator; t += 1) advance(sim, 1);
    expect(sim.incubator).toBeNull();
    const baby = sim.creatures.find(c => c.born)!;
    expect(baby).toBeDefined(); expect(baby.tamed).toBe(true); expect(baby.speciesId).toBe('mosslight');
    const restored = createSim(migrateSave(JSON.parse(JSON.stringify(toSave(sim, settings)))));
    const again = restored.creatures.find(c => c.id === baby.id)!;
    expect(again).toMatchObject({ tamed: true, speciesId: 'mosslight', born: true });
    expect(restored.props.find(p => p.id === 'egg-0')!.taken).toBe(true);
  });
  test('save recusa nascimentos forjados de espécies reais', () => {
    const save = toSave(createSim(null), settings) as unknown as Record<string, any>;
    save.creatures['hatch-1'] = { x: 0, z: 0, hunger: 0, thirst: 0, fear: 0, energy: 1, trust: 100, tamed: true, speciesId: 'wolf' };
    save.creatures['egg-thief'] = { ...save.creatures['hatch-1'], speciesId: 'mosslight' };
    const clean = migrateSave(save)!;
    expect(clean.creatures['hatch-1']).toBeUndefined();
    expect(clean.creatures['egg-thief']).toBeUndefined();
  });
});

describe('save v2 e migração', () => {
  test('v1 publicado vira v2 sem perder companheira, itens e descobertas', () => {
    const v1 = { version: 1, player: { x: 1, y: 0, z: 15, yaw: 0, health: 90, energy: 80, thirst: 10 }, inventory: { glowfruit: 2, berries: 3 }, picked: { 'glow-0': true }, discoveries: { auryn: { seen: true, habitat: true, behavior: true, interacted: true } }, pet: { name: 'Luz', xp: 50, command: 'PROTECT' }, creatures: { [SPAWNS.auryn.id]: { x: 0, z: 14, hunger: .2, thirst: .2, fear: 0, energy: 1, trust: 100, tamed: true } }, settings: { quality: 'auto', lookSens: .0045 }, seconds: 300 };
    const v2 = migrateSave(v1)!;
    expect(v2.version).toBe(2);
    expect(v2.pets).toEqual([{ id: SPAWNS.auryn.id, speciesId: 'auryn', name: 'Luz', xp: 50, command: 'PROTECT' }]);
    expect(v2.inventory).toEqual({ glowfruit: 2, berries: 3, eggs: 0 });
    expect(v2.picked['glow-0']).toBe(true);
    const sim = createSim(v2);
    expect(sim.creatures.find(c => c.speciesId === 'auryn')).toMatchObject({ tamed: true, name: 'Luz', command: 'PROTECT' });
  });
  test('fotos e desafios persistem; foto inválida é descartada', () => {
    const sim = createSim(null);
    sim.discoveries.capybara = { seen: true, habitat: true, behavior: false, interacted: false };
    const capy = sim.creatures.find(c => c.speciesId === 'capybara')!;
    expect(recordPhoto(sim, capy.id, 'javascript:alert(1)')).toBe(false);
    expect(recordPhoto(sim, capy.id, IMG)).toBe(true);
    sim.challenges['first-records'] = true;
    const save = toSave(sim, settings);
    const back = migrateSave(JSON.parse(JSON.stringify(save)))!;
    expect(back.photos.capybara?.image).toBe(IMG);
    expect(back.challenges['first-records']).toBe(true);
    (save.photos as Record<string, unknown>).wolf = { image: 'data:text/html;base64,AAAA', state: 'IDLE', seconds: 0 };
    expect(migrateSave(save)!.photos.wolf).toBeUndefined();
  });
});

describe('defesa leve e desafios', () => {
  test('afugentar faz o lobo recuar, gasta energia e tem recarga', () => {
    const sim = createSim(null), wolf = sim.creatures.find(c => c.speciesId === 'wolf')!;
    sim.creatures = [wolf]; sim.obstacles = [];
    sim.player.x = wolf.x + 3; sim.player.z = wolf.z;
    const energy = sim.player.energy;
    expect(shout(sim)).toBe(true);
    expect(sim.player.energy).toBe(energy - 15);
    expect(shout(sim)).toBe(false);
    advance(sim, .3);
    expect(wolf.state).toBe('FLEE');
    advance(sim, 1);
    expect(sim.challenges['no-fight']).toBe(true);
  });
  test('desafios mostram progresso e concluem pelo estado real', () => {
    const sim = createSim(null);
    expect(challengeViews(sim).find(c => c.id === 'first-records')).toMatchObject({ done: false, current: 0, total: 3 });
    for (const id of ['capybara', 'rabbit', 'wolf'] as const) sim.discoveries[id] = { seen: true, habitat: true, behavior: false, interacted: false };
    advance(sim, 1);
    expect(sim.challenges['first-records']).toBe(true);
    expect(sim.toasts.some(t => t.text.includes('Primeiros registros'))).toBe(true);
  });
});
