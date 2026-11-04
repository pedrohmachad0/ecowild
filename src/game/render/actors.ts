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

function limb(scene: Scene, parent: TransformNode, upper: StandardMaterial, lower: StandardMaterial, x: number, y: number, len: number, width: number, lowerLen: number): TransformNode {
  const pivot = new TransformNode("limb", scene);
  pivot.parent = parent;
  pivot.position.set(x, y, 0);
  const top = MeshBuilder.CreateCylinder("limb-upper", { height: len - lowerLen, diameterTop: width, diameterBottom: width * 0.86, tessellation: 7 }, scene);
  top.parent = pivot; top.position.y = -(len - lowerLen) / 2; top.material = upper; top.isPickable = false;
  const end = MeshBuilder.CreateCylinder("limb-lower", { height: lowerLen, diameterTop: width * 0.9, diameterBottom: width * 1.05, tessellation: 7 }, scene);
  end.parent = pivot; end.position.y = -len + lowerLen / 2; end.material = lower; end.isPickable = false;
  return pivot;
}

/** Field explorer: original procedural figure with jointed arms and legs. Faces local +Z. */
export function buildPlayer(scene: Scene): Rig {
  const root = new TransformNode("player", scene);
  const shirt = material(scene, "shirt", "#e9e1cf");
  const vest = material(scene, "vest", "#2f6b45");
  const pants = material(scene, "pants", "#5b4a36");
  const skin = material(scene, "skin", "#d9a77f");
  const boot = material(scene, "boot", "#3b2a20");
  const hair = material(scene, "hair", "#3a2a22");
  const hat = material(scene, "hat", "#a8834f");
  const band = material(scene, "hat-band", "#245c3a");
  const pack = material(scene, "pack", "#6b4a32");
  const sleeve = material(scene, "sleeve", "#c9b48a");
  sphere(scene, "hips", root, pants, 0.36, 0.2, 0.24, 0, 0.82, 0);
  sphere(scene, "torso", root, shirt, 0.42, 0.56, 0.27, 0, 1.12, 0);
  sphere(scene, "vest", root, vest, 0.45, 0.42, 0.29, 0, 1.12, 0.01);
  sphere(scene, "neck", root, skin, 0.13, 0.12, 0.13, 0, 1.4, 0);
  sphere(scene, "head", root, skin, 0.27, 0.3, 0.26, 0, 1.55, 0.01);
  sphere(scene, "nose", root, skin, 0.05, 0.06, 0.06, 0, 1.54, 0.14);
  sphere(scene, "hair", root, hair, 0.29, 0.18, 0.27, 0, 1.64, -0.03);
  const brim = MeshBuilder.CreateCylinder("brim", { height: 0.03, diameter: 0.5, tessellation: 14 }, scene);
  brim.parent = root; brim.position.y = 1.69; brim.material = hat; brim.isPickable = false;
  const crown = MeshBuilder.CreateCylinder("crown", { height: 0.15, diameterTop: 0.22, diameterBottom: 0.27, tessellation: 12 }, scene);
  crown.parent = root; crown.position.y = 1.77; crown.material = hat; crown.isPickable = false;
  const ribbon = MeshBuilder.CreateCylinder("hat-band", { height: 0.04, diameter: 0.275, tessellation: 12 }, scene);
  ribbon.parent = root; ribbon.position.y = 1.72; ribbon.material = band; ribbon.isPickable = false;
  const bag = MeshBuilder.CreateBox("pack", { width: 0.32, height: 0.38, depth: 0.16 }, scene);
  bag.parent = root; bag.position.set(0, 1.12, -0.2); bag.material = pack; bag.isPickable = false;
  sphere(scene, "bedroll", root, band, 0.36, 0.12, 0.12, 0, 1.34, -0.2);
  const legs = [
    limb(scene, root, pants, boot, -0.1, 0.8, 0.8, 0.15, 0.2),
    limb(scene, root, pants, boot, 0.1, 0.8, 0.8, 0.15, 0.2),
    // Arms swing opposite to the leg on the same side.
    limb(scene, root, sleeve, skin, 0.26, 1.34, 0.6, 0.11, 0.3),
    limb(scene, root, sleeve, skin, -0.26, 1.34, 0.6, 0.11, 0.3),
  ];
  legs[2]!.rotation.z = 0.12; legs[3]!.rotation.z = -0.12;
  return { root, legs, wings: [], crest: null };
}
