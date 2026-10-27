import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
} from "@babylonjs/core";
import type { SpeciesId } from "../types.ts";

import type { Rig } from "./rig.ts";
import { buildCapybara, buildRabbit } from "./creatures/herbivores.ts";
import { buildWolf, buildAuryn } from "./creatures/canids.ts";
import { buildEagle } from "./creatures/eagle.ts";
export type { Rig } from "./rig.ts";
export { animateRig } from "./creatures/animate.ts";

function material(scene: Scene, name: string, hex: string, emissive = "#000000"): StandardMaterial {
  const key = `actor-${hex}-${emissive}`;
  const shared = scene.getMaterialByName(key);
  if (shared instanceof StandardMaterial) return shared;
  const m = new StandardMaterial(key, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.06, 0.06, 0.05);
  m.emissiveColor = Color3.FromHexString(emissive);
  return m;
}

function sphere(
  scene: Scene,
  name: string,
  parent: TransformNode,
  mat: StandardMaterial,
  dx: number,
  dy: number,
  dz: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  const mesh = MeshBuilder.CreateSphere(name, { diameterX: dx, diameterY: dy, diameterZ: dz, segments: 7 }, scene);
  mesh.parent = parent;
  mesh.material = mat;
  mesh.position.set(x, y, z);
  mesh.isPickable = false;
  return mesh;
}

function leg(scene: Scene, parent: TransformNode, mat: StandardMaterial, x: number, z: number, len = 0.36): TransformNode {
  const pivot = new TransformNode("leg", scene);
  pivot.parent = parent;
  pivot.position.set(x, len, z);
  const mesh = MeshBuilder.CreateCylinder("leg-mesh", { height: len, diameter: 0.1, tessellation: 5 }, scene);
  mesh.parent = pivot;
  mesh.position.y = -len * 0.5;
  mesh.material = mat;
  mesh.isPickable = false;
  return pivot;
}

/** Faces local +Z. Simulation yaw is applied by the runtime to the root. */
export function buildCreature(scene: Scene, id: string, species: SpeciesId): Rig {
  const builders = { capybara: buildCapybara, rabbit: buildRabbit, wolf: buildWolf, eagle: buildEagle, auryn: buildAuryn };
  return builders[species](scene, id);
}

export function buildPlayer(scene: Scene): Rig {
  const root = new TransformNode("player", scene);
  const cloth = material(scene, "shirt", "#f4efe4");
  const vest = material(scene, "vest", "#2f6b45");
  const skin = material(scene, "skin", "#e0b088");
  const boot = material(scene, "boot", "#4a3428");
  const hair = material(scene, "hair", "#3a2a22");
  sphere(scene, "torso", root, cloth, 0.42, 0.55, 0.28, 0, 1.05, 0);
  sphere(scene, "vest", root, vest, 0.46, 0.4, 0.22, 0, 1.08, 0.06);
  sphere(scene, "head", root, skin, 0.28, 0.3, 0.26, 0, 1.52, 0);
  sphere(scene, "hair", root, hair, 0.3, 0.16, 0.28, 0, 1.66, -0.02);
  const hat = material(scene, "hat", "#245c3a");
  const brim = MeshBuilder.CreateCylinder("brim", { height: 0.04, diameter: 0.46, tessellation: 8 }, scene);
  brim.parent = root;
  brim.position.y = 1.72;
  brim.material = hat;
  brim.isPickable = false;
  const crown = MeshBuilder.CreateCylinder("crown", { height: 0.16, diameter: 0.24, tessellation: 8 }, scene);
  crown.parent = root;
  crown.position.y = 1.82;
  crown.material = hat;
  crown.isPickable = false;
  const pack = material(scene, "pack", "#6b4a32");
  sphere(scene, "pack", root, pack, 0.28, 0.32, 0.16, 0, 1.08, -0.16);
  const legs = [
    leg(scene, root, boot, -0.1, 0, 0.78),
    leg(scene, root, boot, 0.1, 0, 0.78),
  ];
  legs[0]!.position.y = 0.78;
  legs[1]!.position.y = 0.78;
  return { root, legs, wings: [], crest: null };
}
