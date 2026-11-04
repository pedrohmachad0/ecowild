import type { RegionDef } from "../region.ts";

/**
 * Vereda do Cerrado: open savanna with golden grass, twisted trees, termite mounds
 * and a buriti-lined spring pond. Real Cerrado fauna, plus one labelled fantasy creature.
 */
const POND = { x: 6, z: -4 };

function heightAt(x: number, z: number): number {
  // Flatter than the Mata: a plateau with long, low undulations.
  const plateau = Math.sin(x * 0.05) * 0.8 + Math.cos(z * 0.045) * 0.7 + Math.sin((x - z) * 0.11) * 0.22;
  const dx = x - POND.x, dz = z - POND.z;
  const pond = Math.exp(-(dx * dx + dz * dz) / 34);
  return plateau * (1 - pond * 0.85) - pond * 2.7 + 0.45;
}

const buritis = Array.from({ length: 10 }, (_, i) => {
  const a = i / 10 * Math.PI * 2 + 0.3, r = 7.6 + (i % 3) * 0.9;
  return { x: POND.x + Math.cos(a) * r, z: POND.z + Math.sin(a) * r, kind: "buriti" as const };
});

const twisted: readonly (readonly [number, number])[] = [
  [-20, 14], [-12, 20], [2, 22], [14, 20], [22, 12], [25, -6], [18, -18], [4, -24], [-10, -22], [-22, -10], [-16, 2], [12, 6],
];

export const VEREDA: RegionDef = {
  id: "vereda",
  name: "Vereda do Cerrado",
  biome: "Cerrado (savana brasileira)",
  description: "Campo aberto de capim dourado, árvores tortas, cupinzeiros e uma vereda de buritis em volta da nascente.",
  heightAt,
  water: { x: POND.x, z: POND.z, disc: 8.5, swimRadius: 3.2 },
  trail: [[-27, 1], [-18, 3], [-9, 6], [-2, 3], [1, -1], [-4, -10], [-6, -16]],
  trees: [...buritis, ...twisted.map(([x, z]) => ({ x, z, kind: "twisted" as const }))],
  rocks: [[-8, -4, 0.7], [20, 0, 0.6], [-24, -18, 0.8]],
  mounds: [[-12, 10, 0.75], [-6, 17, 0.7], [15, 13, 0.8], [21, 5, 0.65], [-18, -7, 0.75], [11, -19, 0.8], [-3, -15, 0.7], [24, -14, 0.6]],
  props: [
    // Fruta-do-lobo (Solanum lycocarpum): about half of the maned wolf's diet.
    { id: "v-wolfapple-0", kind: "wolfapple", x: -14, z: -14 },
    { id: "v-wolfapple-1", kind: "wolfapple", x: -9, z: -18 },
    { id: "v-wolfapple-2", kind: "wolfapple", x: 17, z: -10 },
    { id: "v-wolfapple-3", kind: "wolfapple", x: -16, z: 8 },
    { id: "v-wolfapple-4", kind: "wolfapple", x: 8, z: 16 },
    { id: "v-berry-0", kind: "berry", x: -20, z: 4 },
    { id: "v-berry-1", kind: "berry", x: 16, z: 2 },
  ],
  creatures: [
    { id: "anteater-1", speciesId: "anteater", x: -10, z: 12.5, hunger: 0.8, thirst: 0.3 },
    { id: "anteater-2", speciesId: "anteater", x: 17, z: 11, hunger: 0.5, thirst: 0.3 },
    { id: "seriema-1", speciesId: "seriema", x: 0, z: 10, hunger: 0.4, thirst: 0.2 },
    { id: "seriema-2", speciesId: "seriema", x: 4, z: 14, hunger: 0.4, thirst: 0.2 },
    { id: "seriema-3", speciesId: "seriema", x: -6, z: 2.5, hunger: 0.4, thirst: 0.2 },
    { id: "manedwolf-1", speciesId: "manedwolf", x: -13, z: -11, hunger: 0.7, thirst: 0.3 },
    { id: "brasalume-1", speciesId: "brasalume", x: 10.5, z: -17.5, hunger: 0.3, thirst: 0.2 },
    { id: "brasalume-2", speciesId: "brasalume", x: -2, z: -13.5, hunger: 0.3, thirst: 0.2 },
  ],
  spawn: { x: -26.5, z: 1, yaw: -Math.PI / 2 },
  camp: { x: -25, z: 4, incubator: null, tent: null },
  territory: null,
  perch: null,
  nests: [],
  // The brasalume rests inside termite mounds by day.
  burrows: [{ id: "brasalume-1", x: 10.5, z: -17.5 }, { id: "brasalume-2", x: -2, z: -13.5 }],
  eagleCircuit: null,
  exits: [
    { id: "to-mata", x: -30.5, z: 1, to: "mata", arrive: { x: 28, z: -1.5, yaw: Math.PI / 2 }, label: "Trilha da Mata (oeste)" },
    { id: "to-pantanal", x: 4, z: -30.5, to: "pantanal", arrive: { x: 0, z: 27, yaw: 0 }, label: "Trilha do Pantanal (norte)" },
    { id: "to-gruta", x: 30.5, z: -2, to: "gruta", arrive: { x: -26, z: 0, yaw: -Math.PI / 2 }, label: "Entrada da gruta (leste)" },
  ],
  sign: { x: -24.5, z: -1.2, text: "Vereda do Cerrado" },
  palette: {
    grassA: [150, 140, 72], grassB: [184, 164, 88], sand: [196, 170, 112], dirt: [168, 104, 62], sky: [0.66, 0.78, 0.86],
    leaves: ["#4f6b2c", "#6b7a34", "#3f6a3a"], trunk: "#5a3d2a", grass: "#b39a4a", water: "#235560",
  },
  labels: [
    { x: POND.x, z: POND.z + 0.8, text: "Vereda" },
    { x: -9, z: 15, text: "Cupinzeiros" },
    { x: -13, z: -16.5, text: "Lobeiras" },
    { x: -25, z: 7.5, text: "Posto" },
    { x: -27, z: -2.5, text: "← Mata" },
    { x: 4, z: -27.5, text: "↑ Pantanal" },
    { x: 27, z: -5, text: "Gruta →" },
  ],
  highlights: [{ x: -12, z: -14, r: 5 }],
  guide: "Da entrada, a oeste, a trilha atravessa o campo até a vereda de buritis em volta da nascente. Tamanduás procuram cupinzeiros; seriemas correm no capim; o lobo-guará visita as lobeiras ao norte no entardecer. Brasalumes dormem nos cupinzeiros e só confiam em quem anda com a luz de um musgarim. A trilha a oeste volta à Mata; a do norte desce ao Pantanal; a leste, uma fenda leva à gruta.",
};
