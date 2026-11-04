import { CONFIG } from "../../config.ts";
import type { RegionDef } from "../region.ts";

const LAKE = { x: 8, z: 2 };

function heightAt(x: number, z: number): number {
  const hills = Math.sin(x * 0.085) * 1.15 + Math.cos(z * 0.07) * 0.95 + Math.sin((x + z) * 0.16) * 0.35;
  const dx = x - LAKE.x, dz = z - LAKE.z;
  const lake = Math.exp(-(dx * dx + dz * dz) / 58);
  return hills * (1 - lake * 0.82) - lake * 3.15 + 0.2;
}

const TREE_SPOTS: readonly (readonly [number, number])[] = [
  [-7, 23], [-15, 19], [9, 24], [17, 19], [20, 11], [-21, 9], [-23, 0], [-24, -8], [-16, -11], [21, -2], [23, 7], [-8, -20],
  [1, -22], [14, -16], [-5, 7], [16, -8], [-19, 15], [7, -12], [-11, 3], [25, -12], [-27, 4], [3, 27], [12, 9], [-2, -14],
];

export const MATA_SPAWNS = {
  player: { x: 0, z: 18 },
  capybara: [{ id: "capy-1", x: 6.2, z: 5.2 }, { id: "capy-2", x: 10.4, z: 0.4 }, { id: "capy-3", x: 4.2, z: -0.6 }],
  rabbit: [{ id: "rabbit-1", x: -2, z: 14 }, { id: "rabbit-2", x: 3.2, z: 11 }, { id: "rabbit-3", x: -7, z: 12.5 }, { id: "rabbit-4", x: 12, z: 16 }],
  wolf: [{ id: "wolf-1", x: -18, z: -14 }, { id: "wolf-2", x: -15, z: -17.2 }],
  eagle: { id: "eagle-1", x: 2, z: 4 },
  auryn: { id: "auryn-1", x: -10, z: -6 },
  armadillo: [{ id: "armadillo-1", x: 26, z: 4 }, { id: "armadillo-2", x: 23.5, z: -6.5 }],
  toad: [{ id: "toad-1", x: 1.6, z: 5.7 }, { id: "toad-2", x: 13.8, z: 5.3 }],
  fish: [{ id: "fish-1", x: 7, z: 1 }, { id: "fish-2", x: 9, z: 3 }, { id: "fish-3", x: 8.5, z: 0.5 }, { id: "fish-4", x: 6.5, z: 3.2 }],
  tegu: [{ id: "tegu-1", x: 16.8, z: 5.6 }, { id: "tegu-2", x: -1.4, z: 10.2 }],
  mosslight: [{ id: "moss-1", x: 9, z: -21 }, { id: "moss-2", x: 13, z: -24 }],
  territory: { x: -16.5, z: -15.5, r: 9 },
} as const;

export const MATA_NESTS = [{ id: "nest-0", x: 4.5, z: -19.5 }, { id: "nest-1", x: 16.5, z: -22 }] as const;
export const MATA_CAMP = { x: -4.5, z: 20.5, incubator: { x: -3.2, z: 19.2 }, tent: { x: -5.6, z: 21.6 } } as const;
export const MATA_PERCH = { x: 20, z: 11 } as const;

const S = MATA_SPAWNS;
const hunger = (id: string, list: readonly { id: string }[], first: number, rest: number) => list[0]!.id === id ? first : rest;

export const MATA: RegionDef = {
  id: "mata",
  name: "Mata da Nascente",
  biome: "Floresta úmida imaginária",
  description: "Lago, trilha, bosque do orvalho e o território dos lobos. Reúne fauna de regiões diferentes.",
  heightAt,
  water: { x: LAKE.x, z: LAKE.z, disc: 11, swimRadius: 4.6 },
  trail: [[0, 18], [1, 12], [4, 7], [8, 3], [2, -1], [-6, -4], [-10, -6]],
  trees: TREE_SPOTS
    .filter(([x, z]) => heightAt(x, z) >= CONFIG.waterY + 0.25 && Math.hypot(x, z - 18) >= 3.2)
    .map(([x, z]) => ({ x, z, kind: "broadleaf" as const })),
  rocks: [[5, 16, 0.7], [-3, 9, 0.55], [15, 4, 0.8], [-13, -1, 0.65], [1, -8, 0.5], [-20, -13, 0.9], [18, 14, 0.6]],
  mounds: [],
  props: [
    { id: "glow-0", kind: "glow", x: -8, z: -4 },
    { id: "glow-1", kind: "glow", x: -13, z: -8 },
    { id: "glow-2", kind: "glow", x: -6.5, z: -10 },
    { id: "berry-0", kind: "berry", x: -2, z: 12 },
    { id: "berry-1", kind: "berry", x: 11, z: 14 },
    { id: "berry-2", kind: "berry", x: -16, z: 6 },
    // Moved out of the lake: at (3, -2) the bush stood in deep water.
    { id: "berry-3", kind: "berry", x: -1, z: -3 },
    { id: "berry-4", kind: "berry", x: 10, z: -20 },
    { id: "berry-5", kind: "berry", x: 22, z: 2 },
    // Fantasy rule: mosslight nests hold one egg each for the forest's warmth to hatch.
    { id: "egg-0", kind: "egg", x: MATA_NESTS[0].x, z: MATA_NESTS[0].z },
    { id: "egg-1", kind: "egg", x: MATA_NESTS[1].x, z: MATA_NESTS[1].z },
  ],
  creatures: [
    ...S.capybara.map((s, i) => ({ ...s, speciesId: "capybara" as const, hunger: 0.25, thirst: i === 0 ? 0.78 : 0.35 })),
    ...S.rabbit.map(s => ({ ...s, speciesId: "rabbit" as const, hunger: hunger(s.id, S.rabbit, 0.86, 0.4), thirst: 0.3 })),
    ...S.wolf.map(s => ({ ...s, speciesId: "wolf" as const, hunger: hunger(s.id, S.wolf, 0.8, 0.5), thirst: 0.25 })),
    { ...S.eagle, speciesId: "eagle" as const, hunger: 0.72, thirst: 0.1 },
    { ...S.auryn, speciesId: "auryn" as const, hunger: 0.3, thirst: 0.2 },
    ...S.armadillo.map(s => ({ ...s, speciesId: "armadillo" as const, hunger: 0.3, thirst: 0.2 })),
    ...S.toad.map(s => ({ ...s, speciesId: "toad" as const, hunger: 0.3, thirst: 0.1 })),
    ...S.fish.map(s => ({ ...s, speciesId: "fish" as const, hunger: 0.3, thirst: 0 })),
    ...S.tegu.map(s => ({ ...s, speciesId: "tegu" as const, hunger: hunger(s.id, S.tegu, 0.75, 0.35), thirst: 0.2 })),
    ...S.mosslight.map(s => ({ ...s, speciesId: "mosslight" as const, hunger: 0.3, thirst: 0.2 })),
  ],
  spawn: { x: S.player.x, z: S.player.z, yaw: 0 },
  camp: MATA_CAMP,
  territory: S.territory,
  perch: MATA_PERCH,
  nests: MATA_NESTS,
  burrows: S.armadillo,
  eagleCircuit: { x: 2, z: 4, rx: 14, rz: 11 },
  exits: [{ id: "to-vereda", x: 30.5, z: -1.5, to: "vereda", arrive: { x: -26.5, z: 1, yaw: -Math.PI / 2 }, label: "Trilha da Vereda (leste)" }],
  sign: { x: 1.4, z: 16.2, text: "Mata da Nascente" },
  palette: {
    grassA: [62, 122, 64], grassB: [96, 146, 68], sand: [198, 174, 118], dirt: [132, 96, 58], sky: [0.55, 0.76, 0.84],
    leaves: ["#1f6b3d", "#2f8a4a", "#3d7a38"], trunk: "#6b4630", grass: "#3f8f4e", water: "#245f73",
  },
  labels: [
    { x: LAKE.x, z: LAKE.z + 0.8, text: "Lago" },
    { x: -8, z: 1, text: "Bosque do orvalho" },
    { x: -17.5, z: -25.5, text: "Lobos", danger: true },
    { x: MATA_CAMP.x + 1, z: MATA_CAMP.z + 4.2, text: "Acampamento (clareira)" },
    { x: MATA_NESTS[0].x + 5, z: MATA_NESTS[0].z - 2.6, text: "Musgarins" },
    { x: 25, z: 7.4, text: "Tocas" },
    { x: 27, z: -4.5, text: "Vereda →" },
  ],
  highlights: [{ x: -9, z: -7, r: 5.5 }],
  guide: "Da clareira, a trilha sobe ao lago, ao norte, e segue até o bosque do orvalho, a noroeste do lago: ali estão frutiluz e a Auryn. Os lobos guardam o bosque fechado mais a noroeste. Ao norte, entre raízes, vivem os musgarins. Tatus cavam tocas a leste, e uma trilha no extremo leste leva à Vereda do Cerrado. O acampamento, ao sul, tem o ninho aquecido.",
};
