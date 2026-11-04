import { describe, expect, test } from 'vitest';
import { commandPet, compassWord, createSim, eatBerry, stepSim, toSave, usePetAbility } from '../src/game/sim/simulation';
import type { SimInput } from '../src/game/sim/simulation';
import { decide } from '../src/game/ai/brain';
import { parseImport } from '../src/game/persistence/importSave';
import { shorePolygon } from '../src/game/ui/minimap';
import { heightAt } from '../src/game/world/terrain';
import { CONFIG } from '../src/game/config';
import { SPECIES_BY_ID } from '../src/game/data/species';

const idle: SimInput = { moveX: 0, moveZ: 0, camYaw: 0, sprint: false, jumpEdge: false, interactEdge: false, useBerryEdge: false, pet: null, discover: true };
const advance = (sim: ReturnType<typeof createSim>, seconds: number, input = idle) => { for (let i = 0; i < seconds * 60; i++) stepSim(sim, input, 1 / 60); };
const tamedFixture = () => {
  const sim = createSim(null);
  const pet = sim.creatures.find(c => c.speciesId === 'auryn')!;
  pet.tamed = true; pet.trust = 100;
  return { sim, pet };
};

describe('orientação e textos', () => {
  test('norte é −Z e leste é +X; o bosque fica a noroeste do lago', () => {
    expect(compassWord(0, -5)).toBe('norte');
    expect(compassWord(5, 0)).toBe('leste');
    expect(compassWord(0, 5)).toBe('sul');
    // Grove of dew (glow fruit / Auryn spawn) relative to the lake centre.
    expect(compassWord(-10 - CONFIG.lakeX, -6 - CONFIG.lakeZ)).toBe('noroeste');
    expect(SPECIES_BY_ID.auryn.habitat).toContain('noroeste');
    expect(SPECIES_BY_ID.auryn.habitat).not.toContain('sudoeste');
  });
  test('a margem do mapa coincide com o terreno da simulação', () => {
    for (const p of shorePolygon(16)) expect(Math.abs(heightAt(p.x, p.z) - CONFIG.waterY)).toBeLessThan(0.05);
  });
});

describe('frutos e comandos', () => {
  test('comer fruto tem uma única regra para tecla e botão', () => {
    const a = createSim(null), b = createSim(null);
    a.inventory.berries = b.inventory.berries = 1; a.player.energy = b.player.energy = 40;
    expect(eatBerry(a)).toBe(true); expect(eatBerry(a)).toBe(false);
    stepSim(b, { ...idle, useBerryEdge: true }, 1 / 60);
    expect(a.inventory.berries).toBe(0); expect(b.inventory.berries).toBe(0);
    expect(a.player.energy).toBe(68);
  });
  test('Voltar é diferente de Seguir: corre de volta e depois passa a seguir', () => {
    const { sim, pet } = tamedFixture();
    sim.creatures = [pet]; sim.obstacles = [];
    sim.player.x = 0; sim.player.z = 10; pet.x = 0; pet.z = -2;
    const follow = createSim(null), fpet = follow.creatures.find(c => c.speciesId === 'auryn')!;
    fpet.tamed = true; follow.creatures = [fpet]; follow.obstacles = [];
    follow.player.x = 0; follow.player.z = 10; fpet.x = 0; fpet.z = -2;
    commandPet(sim, 'RETURN'); commandPet(follow, 'FOLLOW');
    advance(sim, 1); advance(follow, 1);
    expect(pet.z).toBeGreaterThan(fpet.z);
    advance(sim, 4);
    expect(pet.command).toBe('FOLLOW');
  });
});

describe('ameaça legível', () => {
  test('lobo defendendo perto do jogador eleva o sinal de ameaça', () => {
    const sim = createSim(null), wolf = sim.creatures.find(c => c.speciesId === 'wolf')!;
    sim.creatures = [wolf]; sim.obstacles = [];
    expect(sim.threat).toBe(0);
    sim.player.x = -16; sim.player.z = -12; wolf.x = -16; wolf.z = -15;
    advance(sim, .3);
    expect(wolf.state).toBe('DEFEND');
    expect(sim.threat).toBeGreaterThan(0.25);
    expect(sim.toasts.some(t => t.text.includes('rosna'))).toBe(true);
  });
});

describe('habilidades da companheira (assistência, não domesticação)', () => {
  test('sem vínculo ou longe do jogador, nada acontece', () => {
    const sim = createSim(null);
    expect(usePetAbility(sim, 'CALM')).toBe(false);
    const { sim: s2, pet } = tamedFixture();
    pet.x = s2.player.x + 20; pet.z = s2.player.z;
    expect(usePetAbility(s2, 'TRACK')).toBe(false);
    expect(s2.track).toBeNull();
  });
  test('farejar marca a espécie pendente mais próxima e tem recarga', () => {
    const { sim, pet } = tamedFixture();
    pet.x = sim.player.x + 1; pet.z = sim.player.z;
    expect(usePetAbility(sim, 'TRACK')).toBe(true);
    expect(sim.track).not.toBeNull();
    expect(sim.track!.ttl).toBeGreaterThan(0);
    expect(usePetAbility(sim, 'TRACK')).toBe(false);
  });
  test('pulso calmo impede fuga do coelho e foco do lobo, depois expira', () => {
    const { sim, pet } = tamedFixture();
    const rabbit = sim.creatures.find(c => c.speciesId === 'rabbit')!;
    sim.creatures = [pet, rabbit]; sim.obstacles = [];
    sim.player.x = -3; sim.player.z = 16; rabbit.x = -3; rabbit.z = 14; pet.x = -2; pet.z = 16;
    commandPet(sim, 'STAY');
    expect(usePetAbility(sim, 'CALM')).toBe(true);
    advance(sim, .5);
    expect(rabbit.state).not.toBe('FLEE');
    expect(rabbit.calm).toBeGreaterThan(0);
    expect(usePetAbility(sim, 'CALM')).toBe(false);
    rabbit.x = -3; rabbit.z = 14; advance(sim, 8.5);
    rabbit.x = -3; rabbit.z = 14; advance(sim, .5);
    expect(rabbit.state).toBe('FLEE');
    const calmWolf = decide({ speciesId: 'wolf', diet: 'carnivore', temperament: 'territorial', fleeRadius: 5, hunger: .9, thirst: .2, fear: 0, energy: 1, threatDist: null, preyDist: 3, foodDist: null, waterDist: 20, playerDist: 3, playerSprinting: false, inTerritory: true, tamed: false, command: null, preferIdle: false, calmed: true });
    expect(['WANDER', 'IDLE']).toContain(calmWolf);
  });
  test('habilidades não entram no save', () => {
    const { sim, pet } = tamedFixture();
    pet.x = sim.player.x + 1; pet.z = sim.player.z;
    usePetAbility(sim, 'TRACK');
    const save = toSave(sim, { quality: 'auto', lookSens: .0045 });
    expect(JSON.stringify(save)).not.toContain('abilityCd');
    expect(JSON.stringify(save)).not.toContain('track');
  });
});

describe('importação de progresso', () => {
  const valid = () => toSave(createSim(null), { quality: 'auto', lookSens: .0045 });
  test('aceita save exportado e normaliza', () => {
    const result = parseImport(JSON.stringify(valid(), null, 2));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.version).toBe(3);
  });
  test('recusa JSON inválido, versão futura, estrutura errada e arquivo enorme', () => {
    for (const text of ['{nope', JSON.stringify({ ...valid(), version: 4 }), JSON.stringify({ hello: 1 }), '[]', 'x'.repeat(600 * 1024)]) {
      const result = parseImport(text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason.length).toBeGreaterThan(5);
    }
  });
});
