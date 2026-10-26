import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
} from "@babylonjs/core";
import type { SpeciesId } from "../types.ts";

export type Rig = {
  root: TransformNode;
  legs: TransformNode[];
  wings: TransformNode[];
  crest: StandardMaterial | null;
};

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

function eye(scene: Scene, parent: TransformNode, x: number, y: number, z: number): void {
  const mat = material(scene, "eye-" + x + z, "#1a1a1a");
  sphere(scene, "eye", parent, mat, 0.07, 0.07, 0.07, x, y, z);
}

/** Snouts point toward local +Z. The sim adds π so yaw 0 faces world −Z. */
export function buildCreature(scene: Scene, id: string, species: SpeciesId): Rig {
  const root = new TransformNode(id, scene);
  const legs: TransformNode[] = [];
  const wings: TransformNode[] = [];
  let crest: StandardMaterial | null = null;

  if (species === "capybara") {
    const hide = material(scene, id + "-hide", "#8a5a32");
    const dark = material(scene, id + "-dark", "#5c3b22");
    sphere(scene, "body", root, hide, 0.95, 0.62, 1.35, 0, 0.48, 0);
    sphere(scene, "head", root, hide, 0.48, 0.4, 0.48, 0, 0.62, 0.72);
    sphere(scene, "snout", root, dark, 0.28, 0.22, 0.32, 0, 0.52, 0.98);
    eye(scene, root, -0.14, 0.72, 0.88);
    eye(scene, root, 0.14, 0.72, 0.88);
    const ear = material(scene, id + "-ear", "#6e4428");
    sphere(scene, "ear", root, ear, 0.1, 0.12, 0.06, -0.16, 0.84, 0.62);
    sphere(scene, "ear2", root, ear, 0.1, 0.12, 0.06, 0.16, 0.84, 0.62);
    legs.push(leg(scene, root, dark, -0.28, 0.38, 0.34), leg(scene, root, dark, 0.28, 0.38, 0.34));
    legs.push(leg(scene, root, dark, -0.28, -0.4, 0.3), leg(scene, root, dark, 0.28, -0.4, 0.3));
  } else if (species === "rabbit") {
    const fur = material(scene, id + "-fur", "#c4a07a");
    const pale = material(scene, id + "-pale", "#f3efe4");
    sphere(scene, "body", root, fur, 0.42, 0.4, 0.62, 0, 0.32, 0);
    sphere(scene, "head", root, fur, 0.32, 0.3, 0.32, 0, 0.48, 0.32);
    sphere(scene, "tail", root, pale, 0.16, 0.16, 0.16, 0, 0.38, -0.34);
    eye(scene, root, -0.08, 0.56, 0.44);
    eye(scene, root, 0.08, 0.56, 0.44);
    const earMat = material(scene, id + "-ear", "#d7b898");
    const earL = MeshBuilder.CreateCylinder("ear", { height: 0.42, diameter: 0.08, tessellation: 5 }, scene);
    earL.parent = root;
    earL.material = earMat;
    earL.position.set(-0.08, 0.84, 0.28);
    earL.rotation.x = 0.15;
    earL.isPickable = false;
    const earR = earL.clone("ear-r", root)!;
    earR.position.x = 0.08;
    const dark = material(scene, id + "-paw", "#8d6a48");
    legs.push(leg(scene, root, dark, -0.12, 0.16, 0.22), leg(scene, root, dark, 0.12, 0.16, 0.22));
    legs.push(leg(scene, root, dark, -0.12, -0.16, 0.22), leg(scene, root, dark, 0.12, -0.16, 0.22));
  } else if (species === "wolf") {
    const fur = material(scene, id + "-fur", "#8e9498");
    const dark = material(scene, id + "-back", "#4e555c");
    sphere(scene, "body", root, fur, 0.48, 0.5, 1.15, 0, 0.58, 0);
    sphere(scene, "back", root, dark, 0.36, 0.22, 0.7, 0, 0.78, -0.05);
    sphere(scene, "head", root, fur, 0.32, 0.3, 0.42, 0, 0.72, 0.62);
    sphere(scene, "snout", root, dark, 0.16, 0.14, 0.32, 0, 0.64, 0.9);
    eye(scene, root, -0.1, 0.82, 0.74);
    eye(scene, root, 0.1, 0.82, 0.74);
    const ear = MeshBuilder.CreateCylinder("ear", { height: 0.18, diameterTop: 0, diameterBottom: 0.1, tessellation: 4 }, scene);
    ear.parent = root;
    ear.material = dark;
    ear.position.set(-0.1, 0.96, 0.52);
    ear.isPickable = false;
    const ear2 = ear.clone("ear2", root)!;
    ear2.position.x = 0.1;
    sphere(scene, "tail", root, dark, 0.1, 0.1, 0.48, 0, 0.7, -0.7);
    legs.push(leg(scene, root, dark, -0.16, 0.32, 0.5), leg(scene, root, dark, 0.16, 0.32, 0.5));
    legs.push(leg(scene, root, dark, -0.16, -0.36, 0.5), leg(scene, root, dark, 0.16, -0.36, 0.5));
  } else if (species === "eagle") {
    const body = material(scene, id + "-body", "#6b4a2e");
    const pale = material(scene, id + "-pale", "#f4efe4");
    const dark = material(scene, id + "-dark", "#2c241c");
    sphere(scene, "body", root, body, 0.28, 0.26, 0.55, 0, 0, 0);
    sphere(scene, "head", root, pale, 0.2, 0.2, 0.22, 0, 0.08, 0.32);
    const beak = MeshBuilder.CreateCylinder("beak", { height: 0.16, diameterTop: 0, diameterBottom: 0.06, tessellation: 4 }, scene);
    beak.parent = root;
    beak.material = material(scene, id + "-beak", "#e3a23a");
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.05, 0.48);
    beak.isPickable = false;
    eye(scene, root, -0.07, 0.12, 0.4);
    eye(scene, root, 0.07, 0.12, 0.4);
    const wingMat = material(scene, id + "-wing", "#3e342c");
    for (const side of [-1, 1]) {
      const pivot = new TransformNode("wing", scene);
      pivot.parent = root;
      pivot.position.set(side * 0.12, 0.05, 0);
      const wing = MeshBuilder.CreateBox("wing-mesh", { width: 0.85, height: 0.04, depth: 0.32 }, scene);
      wing.parent = pivot;
      wing.position.x = side * 0.45;
      wing.material = wingMat;
      wing.isPickable = false;
      wings.push(pivot);
    }
    sphere(scene, "tail", root, dark, 0.16, 0.04, 0.28, 0, 0, -0.38);
  } else {
    const fur = material(scene, id + "-fur", "#2fbfa4");
    const chest = material(scene, id + "-chest", "#f4efe4");
    const dark = material(scene, id + "-dark", "#1c6e62");
    sphere(scene, "body", root, fur, 0.46, 0.4, 0.78, 0, 0.42, 0);
    sphere(scene, "chest", root, chest, 0.28, 0.26, 0.28, 0, 0.4, 0.18);
    sphere(scene, "head", root, fur, 0.32, 0.3, 0.34, 0, 0.58, 0.38);
    eye(scene, root, -0.09, 0.66, 0.5);
    eye(scene, root, 0.09, 0.66, 0.5);
    crest = material(scene, id + "-crest", "#f2d48a", "#e3a23a");
    sphere(scene, "crest", root, crest, 0.16, 0.22, 0.16, 0, 0.86, 0.34);
    sphere(scene, "tail", root, dark, 0.12, 0.12, 0.42, 0, 0.48, -0.5);
    const tip = material(scene, id + "-tip", "#f2d48a", "#c9842a");
    sphere(scene, "tip", root, tip, 0.12, 0.12, 0.12, 0, 0.5, -0.72);
    legs.push(leg(scene, root, dark, -0.14, 0.18, 0.32), leg(scene, root, dark, 0.14, 0.18, 0.32));
    legs.push(leg(scene, root, dark, -0.14, -0.22, 0.32), leg(scene, root, dark, 0.14, -0.22, 0.32));
  }

  return { root, legs, wings, crest };
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

export function animateRig(rig: Rig, phase: number, moving: boolean, time: number): void {
  const swing = Math.sin(phase) * (moving ? 0.55 : 0.06);
  rig.legs.forEach((pivot, i) => {
    pivot.rotation.x = i % 2 === 0 ? swing : -swing;
  });
  rig.wings.forEach((pivot, i) => {
    const flap = Math.sin(time * 6) * 0.55;
    pivot.rotation.z = i === 0 ? flap : -flap;
  });
  if (rig.crest) {
    const pulse = 0.45 + Math.sin(time * 3) * 0.35;
    rig.crest.emissiveColor.set(0.95 * pulse, 0.72 * pulse, 0.28 * pulse);
  }
}
