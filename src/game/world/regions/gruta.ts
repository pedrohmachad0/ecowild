import type { RegionDef } from "../region.ts";

/**
 * Gruta: a limestone cave hall entered from the Vereda. Constant dim light (the
 * explorer's lantern matters), stalagmites, an underground pool and cave-adapted fauna.
 */
const POOL = { x: 10, z: 8 };

function heightAt(x: number, z: number): number {
  const floor = 0.3 + Math.sin(x * 0.11) * 0.18 + Math.cos(z * 0.13) * 0.16 + Math.sin((x - z) * 0.27) * 0.05;
  const dx = x - POOL.x, dz = z - POOL.z;
  const pool = Math.exp(-(dx * dx + dz * dz) / 14);
  return floor * (1 - pool) - pool * 2.3;
}

export const GRUTA: RegionDef = {
  id: "gruta",
  name: "Gruta da Vereda",
  biome: "Caverna calcária (ambiente subterrâneo)",
  description: "Um grande salão escuro com estalagmites, um poço de água subterrânea e uma colônia de morcegos no teto.",
  heightAt,
  water: { x: POOL.x, z: POOL.z, disc: 6, swimRadius: 2.2 },
  trail: [[-27, 0], [-18, 1], [-9, -2], [0, 2], [6, 5]],
  trees: [],
  rocks: [[-14, 8, 1.4], [-6, -11, 1.6], [14, -6, 1.3], [20, 12, 1.5], [-20, -12, 1.2], [4, 18, 1.4], [24, -2, 1.1]],
  // Stalagmites: block movement and sight like termite mounds.
  mounds: [[-12, -4, 0.6], [-4, 7, 0.7], [2, -7, 0.55], [8, -14, 0.8], [16, 3, 0.65], [-2, 14, 0.6], [12, 18, 0.7], [-16, 16, 0.75], [22, -14, 0.8], [-24, 10, 0.6], [0, -20, 0.7], [-10, -18, 0.65], [26, 8, 0.55], [18, 22, 0.6]],
  props: [],
  creatures: [
    { id: "bat-1", speciesId: "bat", x: 6, z: -8, hunger: 0.4, thirst: 0.2 },
    { id: "bat-2", speciesId: "bat", x: 6.5, z: -8.4, hunger: 0.4, thirst: 0.2 },
    { id: "bat-3", speciesId: "bat", x: 5.6, z: -7.6, hunger: 0.4, thirst: 0.2 },
    { id: "bat-4", speciesId: "bat", x: 7, z: -7.8, hunger: 0.4, thirst: 0.2 },
    { id: "bat-5", speciesId: "bat", x: 5.2, z: -8.6, hunger: 0.4, thirst: 0.2 },
    { id: "cricket-1", speciesId: "cavecricket", x: -10.5, z: -3, hunger: 0.4, thirst: 0.2 },
    { id: "cricket-2", speciesId: "cavecricket", x: -3, z: 9, hunger: 0.4, thirst: 0.2 },
    { id: "cricket-3", speciesId: "cavecricket", x: 4, z: -6, hunger: 0.4, thirst: 0.2 },
    { id: "cricket-4", speciesId: "cavecricket", x: 15, z: 5, hunger: 0.4, thirst: 0.2 },
    { id: "cavefish-1", speciesId: "cavefish", x: 10, z: 8, hunger: 0.3, thirst: 0 },
    { id: "cavefish-2", speciesId: "cavefish", x: 11, z: 7.5, hunger: 0.3, thirst: 0 },
    { id: "cavefish-3", speciesId: "cavefish", x: 9.4, z: 8.8, hunger: 0.3, thirst: 0 },
  ],
  spawn: { x: -26, z: 0, yaw: -Math.PI / 2 },
  camp: { x: -24, z: 4.5, incubator: null, tent: null },
  territory: null,
  // The colony hangs from the ceiling by day.
  perch: { x: 6, z: -8, height: 6.5 },
  nests: [],
  burrows: [],
  // At night the colony circles the entrance hall on its way out to feed.
  eagleCircuit: { x: -16, z: 0, rx: 6, rz: 5, y: 4.5 },
  enclosed: { ceiling: 9, light: 0.1 },
  exits: [{ id: "to-vereda-w", x: -30.5, z: 0, to: "vereda", arrive: { x: 27.5, z: -2, yaw: Math.PI / 2 }, label: "Saída da gruta (oeste)" }],
  sign: { x: -24, z: -2.2, text: "Gruta da Vereda" },
  palette: {
    grassA: [70, 64, 58], grassB: [88, 80, 70], sand: [96, 84, 70], dirt: [110, 92, 70], sky: [0.04, 0.04, 0.05],
    leaves: ["#3a3a34", "#44403a", "#4a463e"], trunk: "#5a5048", grass: "#4a463e", water: "#1f3b44",
  },
  labels: [
    { x: POOL.x, z: POOL.z + 0.8, text: "Poço" },
    { x: 6, z: -11.5, text: "Colônia" },
    { x: -24, z: 8.5, text: "Entrada" },
    { x: -27, z: -3, text: "← Vereda" },
  ],
  highlights: [{ x: 6, z: -8, r: 3.5 }],
  guide: "A entrada fica a oeste; a claridade de fora vai sumindo e a lanterna passa a ser sua luz. A colônia de morcegos dorme pendurada no teto ao sul do salão durante o dia e circula perto da entrada à noite. Grilos-de-caverna andam entre as estalagmites. No poço, a leste, vive o bagre-cego. Não há frutos aqui: traga o que precisar.",
};
