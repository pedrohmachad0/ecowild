import { SPECIES, SPECIES_BY_ID } from "../data/species.ts";
import type { BioGroup } from "../data/species.ts";
import type { SpeciesId } from "../types.ts";
import type { Simulation } from "../sim/simulation.ts";

export type Challenge = {
  id: string;
  title: string;
  description: string;
  /** Current and total steps, for the progress text. */
  progress: (sim: Simulation) => [number, number];
};

const seen = (sim: Simulation, id: SpeciesId) => !!sim.discoveries[id]?.seen;
const count = (values: boolean[]): number => values.filter(Boolean).length;
const GROUPS: BioGroup[] = ["mammal", "bird", "reptile", "amphibian", "fish", "fantasy"];

/** Scientific challenges: each one teaches something about the Mata and none requires combat. */
export const CHALLENGES: readonly Challenge[] = [
  { id: "first-records", title: "Primeiros registros", description: "Registre três espécies no diário.",
    progress: sim => [Math.min(3, count(SPECIES.map(s => seen(sim, s.id)))), 3] },
  { id: "lake-life", title: "Vida no lago", description: "Registre o lambari e o sapo-cururu. O sapo sai ao anoitecer.",
    progress: sim => [count([seen(sim, "fish"), seen(sim, "toad")]), 2] },
  { id: "night-shift", title: "Turno da noite", description: "Anote o comportamento do tatu-galinha. De dia ele fica na toca.",
    progress: sim => [sim.discoveries.armadillo?.behavior ? 1 : 0, 1] },
  { id: "sun-rocks", title: "Sol nas pedras", description: "Fotografe o teiú descansando ao sol (Observar, depois Fotografar).",
    progress: sim => [sim.photos.tegu?.state === "REST" ? 1 : 0, 1] },
  { id: "watering-hole", title: "Bebedouro", description: "Fotografe uma capivara bebendo água.",
    progress: sim => [sim.photos.capybara?.state === "DRINK" ? 1 : 0, 1] },
  { id: "bond", title: "Vínculo", description: "Conquiste a confiança da Auryn com calma e um frutiluz.",
    progress: sim => [[...sim.creatures, ...sim.away].some(c => c.speciesId === "auryn" && c.tamed) ? 1 : 0, 1] },
  { id: "no-fight", title: "Sem confronto", description: "Faça um lobo recuar sem feri-lo: afugente (G) ou use o pulso calmo.",
    progress: sim => [sim.stats.shooed + sim.stats.calmedWolves > 0 ? 1 : 0, 1] },
  { id: "assisted", title: "Mata assistida", description: "Com o pulso calmo da Auryn, conquiste um musgarim adulto.",
    progress: sim => [[...sim.creatures, ...sim.away].some(c => c.speciesId === "mosslight" && c.tamed && !c.born) ? 1 : 0, 1] },
  { id: "moss-nest", title: "Ninho de musgo", description: "Leve um ovo de musgarim ao ninho aquecido do acampamento e espere chocar.",
    progress: sim => [[...sim.creatures, ...sim.away].some(c => c.born) ? 1 : 0, 1] },
  { id: "groups", title: "Árvore da vida", description: "Registre um mamífero, uma ave, um réptil, um anfíbio, um peixe e uma criatura fantástica.",
    progress: sim => [count(GROUPS.map(g => SPECIES.some(s => s.group === g && seen(sim, s.id)))), GROUPS.length] },
  { id: "album", title: "Álbum de campo", description: "Fotografe seis espécies diferentes.",
    progress: sim => [Math.min(6, Object.keys(sim.photos).length), 6] },
  { id: "explorer", title: "Novos horizontes", description: "Siga a trilha do leste da Mata até a Vereda do Cerrado.",
    progress: sim => [sim.visited.includes("vereda") ? 1 : 0, 1] },
  { id: "two-wolves", title: "Dois lobos, duas histórias", description: "Registre o lobo-cinzento e o lobo-guará. Compare no diário: parecidos no nome, diferentes no comportamento.",
    progress: sim => [count([seen(sim, "wolf"), seen(sim, "manedwolf")]), 2] },
  { id: "anthill", title: "Banquete no cupinzeiro", description: "Fotografe um tamanduá-bandeira comendo num cupinzeiro.",
    progress: sim => [sim.photos.anteater?.state === "EAT" ? 1 : 0, 1] },
  { id: "ember", title: "Brasa e musgo", description: "À noite, com um musgarim companheiro por perto, conquiste a confiança de um brasalume.",
    progress: sim => [[...sim.creatures, ...sim.away].some(c => c.speciesId === "brasalume" && c.tamed) ? 1 : 0, 1] },
  { id: "wetland", title: "Planície das águas", description: "Da Vereda, siga a trilha do norte até a Baía do Pantanal.",
    progress: sim => [sim.visited.includes("pantanal") ? 1 : 0, 1] },
  { id: "caiman-sun", title: "Boca aberta ao sol", description: "Fotografe um jacaré-do-pantanal tomando sol na margem.",
    progress: sim => [sim.photos.caiman?.state === "REST" ? 1 : 0, 1] },
  { id: "jabiru", title: "Ave-símbolo", description: "Registre o comportamento do tuiuiú sem espantá-lo.",
    progress: sim => [sim.discoveries.jabiru?.behavior ? 1 : 0, 1] },
  { id: "encyclopedia", title: "Enciclopédia da mata", description: "Complete 100% da pesquisa de todas as espécies.",
    progress: sim => [count(SPECIES.map(s => { const f = sim.discoveries[s.id]; return !!(f?.seen && f.habitat && f.behavior && f.interacted); })), SPECIES.length] },
];

let acc = 0;
/** Checked twice per second; completions are permanent and saved. */
export function updateChallenges(sim: Simulation, dt: number, notify: (text: string) => void): void {
  acc += dt;
  if (acc < 0.5) return;
  acc = 0;
  for (const challenge of CHALLENGES) {
    if (sim.challenges[challenge.id]) continue;
    const [done, total] = challenge.progress(sim);
    if (done >= total) {
      sim.challenges[challenge.id] = true;
      notify(`Desafio concluído: ${challenge.title}!`);
    }
  }
}

export type ChallengeView = { id: string; title: string; description: string; done: boolean; current: number; total: number };

export function challengeViews(sim: Simulation): ChallengeView[] {
  return CHALLENGES.map(c => {
    const [current, total] = c.progress(sim);
    const done = !!sim.challenges[c.id];
    return { id: c.id, title: c.title, description: c.description, done, current: done ? total : current, total };
  });
}

export const speciesName = (id: SpeciesId) => SPECIES_BY_ID[id].name;
