import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, VertexBuffer, VertexData } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import type { SpeciesId } from "../../types.ts";
export type Point = readonly [number, number, number];
/** An elliptical cross-section along the animal's local Z axis. */
export type Section = readonly [x: number, y: number, z: number, radiusX: number, radiusY: number];

function sharedMaterial(scene: Scene, glow: boolean): StandardMaterial {
  const name = glow ? "fauna-lumen" : "fauna-vertex-coat";
  const prior = scene.getMaterialByName(name);
  if (prior instanceof StandardMaterial) return prior;
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor.set(glow ? 0.08 : 0.12, glow ? 0.08 : 0.12, glow ? 0.05 : 0.1);
  mat.specularPower = 48;
  if (glow) { mat.emissiveColor.set(1, 1, .88); mat.disableLighting = true; }
  return mat;
}

/** Builds coloured geometry once, then merges it into one draw per moving joint. */
export class Sculpt {
  readonly rig: Rig;
  private groups = new Map<TransformNode, Map<boolean, Mesh[]>>();
  private count = 0;
  constructor(readonly scene: Scene, id: string, species: SpeciesId) {
    const root = new TransformNode(id, scene);
    const body = this.joint("body-pose", root, [0, 0, 0]);
    this.rig = { root, body, species, legs: [], wings: [], ears: [], crest: null, rests: new Map(), poseBlend: { rest: 0, feed: 0, fear: 0 } };
  }
  joint(name: string, parent: TransformNode, pos: Point): TransformNode {
    const node = new TransformNode(name, this.scene);
    node.parent = parent; node.position.set(...pos);
    return node;
  }
  private add(mesh: Mesh, parent: TransformNode, color: string, glow = false): Mesh {
    const c = Color3.FromHexString(color), values = new Float32Array(mesh.getTotalVertices() * 4);
    for (let i = 0; i < values.length; i += 4) { values[i] = c.r; values[i + 1] = c.g; values[i + 2] = c.b; values[i + 3] = 1; }
    mesh.setVerticesData(VertexBuffer.ColorKind, values);
    mesh.material = sharedMaterial(this.scene, glow);
    // Keep construction meshes in joint-local space until merge, avoiding double transforms.
    let group = this.groups.get(parent);
    if (!group) { group = new Map(); this.groups.set(parent, group); }
    const parts = group.get(glow) ?? []; parts.push(mesh); group.set(glow, parts);
    return mesh;
  }
  ball(parent: TransformNode, color: string, size: Point, pos: Point, rotation: Point = [0, 0, 0], glow = false): Mesh {
    const mesh = MeshBuilder.CreateSphere(`shape-${this.count++}`, { diameterX: size[0], diameterY: size[1], diameterZ: size[2], segments: Math.max(...size) < .13 ? 3 : 5 }, this.scene);
    mesh.position.set(...pos); mesh.rotation.set(...rotation);
    return this.add(mesh, parent, color, glow);
  }
  cone(parent: TransformNode, color: string, width: number, height: number, pos: Point, rotation: Point = [0, 0, 0], glow = false): Mesh {
    const mesh = MeshBuilder.CreateCylinder(`taper-${this.count++}`, { height, diameterBottom: width, diameterTop: 0.005, tessellation: 5 }, this.scene);
    mesh.position.set(...pos); mesh.rotation.set(...rotation);
    return this.add(mesh, parent, color, glow);
  }
  loft(parent: TransformNode, color: string, sections: readonly Section[], sides = 10, glow = false): Mesh {
    const positions: number[] = [], indices: number[] = [], normals: number[] = [];
    for (const [x, y, z, rx, ry] of sections) {
      for (let i = 0; i < sides; i++) { const a = i * Math.PI * 2 / sides; positions.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry, z); }
    }
    for (let r = 0; r < sections.length - 1; r++) for (let i = 0; i < sides; i++) {
      const a = r * sides + i, b = r * sides + (i + 1) % sides, c = a + sides, d = b + sides;
      indices.push(a, c, b, b, c, d);
    }
    for (let i = 1; i < sides - 1; i++) {
      indices.push(0, i, i + 1);
      const last = (sections.length - 1) * sides; indices.push(last, last + i + 1, last + i);
    }
    // Ring ordering may run toward either end of the animal.
    if (sections[sections.length - 1][2] < sections[0][2]) for (let i = 0; i < indices.length; i += 3) { const t = indices[i]; indices[i] = indices[i + 2]; indices[i + 2] = t; }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = new Float32Array(positions.length / 3 * 2);
    const mesh = new Mesh(`sculpt-${this.count++}`, this.scene); data.applyToMesh(mesh);
    return this.add(mesh, parent, color, glow);
  }
  eye(parent: TransformNode, side: number, x: number, y: number, z: number, size: number, iris: string): void {
    this.ball(parent, "#27312d", [size * 0.9, size, size * 0.78], [side * x, y, z]);
    this.ball(parent, iris, [size * 0.7, size * 0.72, size * 0.45], [side * (x + size * 0.2), y, z + size * 0.24]);
    this.ball(parent, "#101b20", [size * 0.36, size * 0.5, size * 0.26], [side * (x + size * 0.27), y, z + size * 0.42]);
    this.ball(parent, "#fff6de", [size * 0.21, size * 0.24, size * 0.16], [side * (x + size * 0.31), y + size * 0.19, z + size * 0.53]);
  }
  finish(): Rig {
    for (const [parent, byGlow] of this.groups) for (const [glow, parts] of byGlow) {
      const mesh = Mesh.MergeMeshes(parts, true, true, undefined, false, false)!;
      mesh.name = `${this.rig.root.name}-${parent.name}${glow ? "-lumen" : "-coat"}`;
      mesh.parent = parent; mesh.material = sharedMaterial(this.scene, glow); mesh.isPickable = false;
      mesh.receiveShadows = true;
      if (glow) this.rig.crest = mesh.material as StandardMaterial;
    }
    for (const node of this.rig.root.getDescendants(false)) if (node instanceof TransformNode && !(node instanceof Mesh)) {
      this.rig.rests!.set(node, { x: node.position.x, y: node.position.y, z: node.position.z, rx: node.rotation.x, ry: node.rotation.y, rz: node.rotation.z });
    }
    return this.rig;
  }
}
