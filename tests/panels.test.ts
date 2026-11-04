import { describe, expect, test } from 'vitest';
import { panelHtml } from '../src/game/ui/panels';
import { catalogView } from '../src/game/catalog/discoveries';
import { createSim, petViews } from '../src/game/sim/simulation';
import { challengeViews } from '../src/game/progression/challenges';
import type { HudSnapshot } from '../src/game/EcoWildGame';

function hud(panel: HudSnapshot['panel']): HudSnapshot {
  const sim = createSim(null);
  sim.discoveries.capybara = { seen: true, habitat: true, behavior: true, interacted: false };
  const pet = sim.creatures.find(c => c.speciesId === 'auryn')!;
  pet.tamed = true; pet.name = '<b>Luz</b> & cia';
  const catalog = catalogView(sim.discoveries);
  return {
    panel, catalog, discovered: 1, species: catalog.length, photos: {}, challenges: challengeViews(sim), pets: petViews(sim),
    inventory: { glowfruit: 0, berries: 1, eggs: 1, wolfapple: 2 }, visited: ['mata', 'vereda'],
    regions: [{ id: 'mata', name: 'Mata da Nascente' }, { id: 'vereda', name: 'Vereda do Cerrado' }],
    place: { id: 'mata', name: 'Mata da Nascente', biome: 'Floresta', guide: 'Siga a trilha.', territory: true, nests: true }, incubator: 0.4, abilities: { near: true, track: 0, calm: 0 },
    quality: 'auto', tier: 'low', lookSens: .0045, deadzone: .16, camera: 'third', hudMap: true, saveStatus: 'ok',
    day: { clock: '07:10', period: 'day', label: 'Dia', fraction: .3 }, track: null, map: [], props: [], player: { x: 0, z: 18 }, yaw: 0,
  } as unknown as HudSnapshot;
}

describe('painéis', () => {
  test('acentos aparecem como texto, nunca codificados como URL', () => {
    const html = panelHtml(hud('catalog'));
    expect(html).toContain('Mamífero');
    expect(html).toContain('Hydrochoerus hydrochaeris');
    expect(html).not.toMatch(/%[0-9A-F]{2}/);
  });
  test('nome de pet é escapado como HTML em texto e atributo', () => {
    const html = panelHtml(hud('pause'));
    expect(html).toContain('&lt;b&gt;Luz&lt;/b&gt; &amp; cia');
    expect(html).not.toContain('<b>Luz</b>');
  });
  test('desafios, bolsa com ovo e guia renderizam', () => {
    expect(panelHtml(hud('catalog'), { catalogFilter: 'all', touch: false, tab: 'challenges' })).toContain('Primeiros registros');
    expect(panelHtml(hud('inventory'))).toContain('No ninho: 40%');
    expect(panelHtml(hud('map'))).toContain('<svg');
    expect(panelHtml(hud('map'))).toContain('Guia · Mata da Nascente');
    expect(panelHtml(hud('inventory'))).toContain('Fruta-do-lobo');
  });
});
