import type { RegionDef } from "../region.ts";

/**
 * Baía do Pantanal: a wide, shallow bay of the flooded plain, with carandá palms on the
 * banks and "capões" (islands of forest). Only real Pantanal fauna lives here.
 */
const BAY = { x: 2, z: -3 };

function heightAt(x: number, z: number): number {
  // The plain is almost flat; the bay is a broad, elongated basin.
  const base = 0.4 + Math.sin(x * 0.04) * 0.25 + Math.cos(z * 0.05) * 0.2 + Math.sin((x + z) * 0.13) * 0.08;
  const dx = x - BAY.x, dz = z - BAY.z;
  const bay = Math.exp(-(dx * dx / 160 + dz * dz / 95));
  return base * (1 - bay) - bay * 2.4;
}

const capoes: readonly (readonly [number, number])[] = [[-20, -14], [-23, -9], [-17, -19], [20, -18], [24, -13], [-21, 14], [-25, 9]];
const carandas: readonly (readonly [number, number])[] = [[-15, 4], [17, 9], [11, 16], [-12, 16], [19, -6], [-17, -5], [7, -21], [-6, -20], [25, 3], [5, 20]];

export const PANTANAL: RegionDef = {
  id: "pantanal",
  name: "Baía do Pantanal",
  biome: "Pantanal (planície alagável)",
  description: "Uma baía rasa e larga, palmeiras carandá nas margens e ilhas de mata, os capões.",
  heightAt,
  water: { x: BAY.x, z: BAY.z, disc: 16, swimRadius: 7 },
  trail: [[0, 28], [-2, 21], [-6, 15], [-12, 9], [-15, 0], [-19, -10]],
  trees: [
    ...capoes.map(([x, z]) => ({ x, z, kind: "broadleaf" as const })),
    ...carandas.map(([x, z]) => ({ x, z, kind: "caranda" as const })),
  ],
  rocks: [[-26, -2, 0.6], [22, 18, 0.7]],
  mounds: [],
  props: [
    { id: "p-berry-0", kind: "berry", x: -19, z: -11.5 },
    { id: "p-berry-1", kind: "berry", x: 21.5, z: -15.5 },
    { id: "p-berry-2", kind: "berry", x: -22.5, z: 11.5 },
    { id: "p-berry-3", kind: "berry", x: 8, z: 23 },
  ],
  creatures: [
    { id: "p-capy-1", speciesId: "capybara", x: -6, z: 7, hunger: 0.3, thirst: 0.4 },
    { id: "p-capy-2", speciesId: "capybara", x: 10, z: 8, hunger: 0.3, thirst: 0.7 },
    { id: "p-capy-3", speciesId: "capybara", x: 14, z: -2, hunger: 0.3, thirst: 0.3 },
    { id: "p-capy-4", speciesId: "capybara", x: -8, z: 9.5, hunger: 0.6, thirst: 0.3 },
    { id: "caiman-1", speciesId: "caiman", x: -12.5, z: -3, hunger: 0.4, thirst: 0.1 },
    { id: "caiman-2", speciesId: "caiman", x: 12, z: 6, hunger: 0.4, thirst: 0.1 },
    { id: "caiman-3", speciesId: "caiman", x: -3, z: 9.5, hunger: 0.4, thirst: 0.1 },
    { id: "jabiru-1", speciesId: "jabiru", x: 6, z: 10, hunger: 0.4, thirst: 0.2 },
    { id: "jabiru-2", speciesId: "jabiru", x: -10, z: -12, hunger: 0.4, thirst: 0.2 },
    { id: "jabiru-3", speciesId: "jabiru", x: 15, z: -10, hunger: 0.4, thirst: 0.2 },
    { id: "p-fish-1", speciesId: "fish", x: 2, z: -3, hunger: 0.3, thirst: 0 },
    { id: "p-fish-2", speciesId: "fish", x: 4, z: -1, hunger: 0.3, thirst: 0 },
    { id: "p-fish-3", speciesId: "fish", x: 0, z: -5, hunger: 0.3, thirst: 0 },
  ],
  spawn: { x: 0, z: 27, yaw: 0 },
  camp: { x: -4.5, z: 25, incubator: null, tent: null },
  territory: null,
  perch: null,
  nests: [],
  burrows: [],
  eagleCircuit: null,
  exits: [{ id: "to-vereda-s", x: 0, z: 30.5, to: "vereda", arrive: { x: 4, z: -27, yaw: Math.PI }, label: "Trilha da Vereda (sul)" }],
  sign: { x: 2.2, z: 25.6, text: "Baía do Pantanal" },
  palette: {
    grassA: [86, 138, 70], grassB: [118, 156, 78], sand: [150, 128, 92], dirt: [118, 92, 64], sky: [0.6, 0.78, 0.88],
    leaves: ["#2d6b3a", "#3f7f3e", "#4f8a3a"], trunk: "#6a5442", grass: "#5f9a48", water: "#3b5f52",
  },
  labels: [
    { x: BAY.x, z: BAY.z + 0.8, text: "Baía" },
    { x: -21, z: -21.5, text: "Capão" },
    { x: 22, z: -21.5, text: "Capão" },
    { x: -4.5, z: 29, text: "Posto" },
    { x: 4, z: 31.5, text: "↓ Vereda" },
  ],
  highlights: [{ x: -21, z: -13, r: 5 }],
  guide: "Da entrada, ao sul, a trilha contorna a baía pela margem oeste até o capão do noroeste. Jacarés tomam sol nas margens e entram na água quando se assustam; tuiuiús caminham na beira procurando peixes; capivaras pastam em grupo. Observe os jacarés de longe: eles evitam pessoas, mas é melhor não incomodá-los. A trilha ao sul volta à Vereda.",
};
