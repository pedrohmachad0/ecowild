import {
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  DirectionalLight,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
  VertexData,
  Matrix,
  Quaternion,
} from "@babylonjs/core";
import { CONFIG } from "../config.ts";
import { grassCount } from "../performance/quality.ts";
import type { AppliedTier } from "../types.ts";
import { rockList, treeList, props } from "../world/layout.ts";
import { heightAt, pathDistance, shoreBlend } from "../world/terrain.ts";
import { mulberry32 } from "../math.ts";

export type Forest = {
  ground: Mesh;
  water: Mesh;
  grass: Mesh | null;
  treeMesh: Mesh | null;
  rockMesh: Mesh | null;
  propNodes: Map<string, TransformNode>;
  sun: DirectionalLight;
  shadows: ShadowGenerator | null;
  setTier: (tier: AppliedTier) => void;
};

function mat(scene: Scene, name: string, hex: string, emissive = "#000000"): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.04, 0.05, 0.04);
  m.emissiveColor = Color3.FromHexString(emissive);
  return m;
}

function paintGround(scene: Scene): DynamicTexture {
  const size = 384;
  const tex = new DynamicTexture("ground-tex", { width: size, height: size }, scene, false);
  const ctx = tex.getContext();
  const image = ctx.getImageData(0, 0, size, size);
  const px = image.data;
  const span = 92;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wx = (x / (size - 1) - 0.5) * span;
      const wz = (y / (size - 1) - 0.5) * span;
      const shore = shoreBlend(wx, wz);
      const path = Math.exp(-(pathDistance(wx, wz) * pathDistance(wx, wz)) / 3.2);
      const n = ((Math.sin(wx * 12.2 + wz * 4.1) + Math.sin(wx * 3.1 - wz * 9.4)) * 0.5 + 1) * 0.5;
      const grassA = [62, 122, 64];
      const grassB = [96, 146, 68];
      const sand = [198, 174, 118];
      const dirt = [132, 96, 58];
      const mix = (a: number, b: number, t: number) => a + (b - a) * t;
      let r = mix(grassA[0]!, grassB[0]!, n);
      let g = mix(grassA[1]!, grassB[1]!, n);
      let b = mix(grassA[2]!, grassB[2]!, n);
      r = mix(sand[0]!, r, shore);
      g = mix(sand[1]!, g, shore);
      b = mix(sand[2]!, b, shore);
      r = mix(r, dirt[0]!, path * 0.85);
      g = mix(g, dirt[1]!, path * 0.85);
      b = mix(b, dirt[2]!, path * 0.85);
      const i = (y * size + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  tex.update(false);
  return tex;
}

export function buildForest(scene: Scene, tier: AppliedTier): Forest {
  scene.blockMaterialDirtyMechanism = true;
  const ground = MeshBuilder.CreateGround("ground", { width: 92, height: 92, subdivisions: 56, updatable: true }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (positions) {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] = heightAt(positions[i]!, positions[i + 2]!);
    }
    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
    const indices = ground.getIndices();
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    ground.setVerticesData(VertexBuffer.NormalKind, normals);
  }
  ground.refreshBoundingInfo();
  const groundMat = new StandardMaterial("ground-mat", scene);
  groundMat.diffuseTexture = paintGround(scene);
  groundMat.specularColor = Color3.Black();
  groundMat.emissiveColor = new Color3(0.03, 0.035, 0.02);
  ground.material = groundMat;
  ground.receiveShadows = true;
  ground.isPickable = false;
  ground.freezeWorldMatrix();
  groundMat.freeze();

  const waterMat = mat(scene, "water", "#1f7a86", "#0d3e44");
  waterMat.alpha = 0.72;
  waterMat.backFaceCulling = false;
  waterMat.specularColor = new Color3(0.35, 0.4, 0.38);
  const water = MeshBuilder.CreateDisc("water", { radius: 11, tessellation: 40 }, scene);
  water.rotation.x = Math.PI / 2;
  water.position.set(CONFIG.lakeX, CONFIG.waterY + 0.04, CONFIG.lakeZ);
  water.material = waterMat;
  water.isPickable = false;

  const trunkMat = mat(scene, "trunk", "#6b4630");
  const leafMats = [mat(scene, "leaf-a", "#1f6b3d"), mat(scene, "leaf-b", "#2f8a4a"), mat(scene, "leaf-c", "#3d7a38")];
  const trunks: Mesh[] = [];
  const leaves: Mesh[][] = [[], [], []];
  let ti = 0;
  for (const tree of treeList()) {
    const h = heightAt(tree.x, tree.z);
    const scale = 0.9 + ((ti * 17) % 5) * 0.08;
    const trunk = MeshBuilder.CreateCylinder("trunk", { height: 1.5, diameter: 0.28, tessellation: 6 }, scene);
    trunk.position.set(tree.x, h + 0.75 * scale, tree.z);
    trunk.scaling.set(scale, scale, scale);
    trunks.push(trunk);
    const crown = MeshBuilder.CreateSphere("crown", { diameter: 1.55, segments: 6 }, scene);
    crown.position.set(tree.x, h + 1.7 * scale, tree.z);
    crown.scaling.set(scale * 1.05, scale * 0.85, scale);
    leaves[ti % 3]!.push(crown);
    const crown2 = MeshBuilder.CreateSphere("crown2", { diameter: 1.05, segments: 5 }, scene);
    crown2.position.set(tree.x + 0.35 * scale, h + 1.45 * scale, tree.z + 0.2);
    crown2.scaling.set(scale, scale * 0.8, scale);
    leaves[(ti + 1) % 3]!.push(crown2);
    ti++;
  }
  const merge = (meshes: Mesh[], material: StandardMaterial, name: string): Mesh | null => {
    if (meshes.length === 0) return null;
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
    if (!merged) return null;
    merged.name = name;
    merged.material = material;
    merged.isPickable = false;
    merged.freezeWorldMatrix();
    material.freeze();
    return merged;
  };
  const treeTrunk = merge(trunks, trunkMat, "trunks");
  const treeLeaves = leaves.map((group, i) => merge(group, leafMats[i]!, "leaves-" + i)).filter((m): m is Mesh => !!m);
  let treeMesh: Mesh | null = treeTrunk;
  if (treeTrunk && treeLeaves.length) {
    const all = Mesh.MergeMeshes([treeTrunk, ...treeLeaves], true, true, undefined, false, true);
    treeMesh = all ?? treeTrunk;
    if (treeMesh) {
      treeMesh.isPickable = false;
      treeMesh.freezeWorldMatrix();
    }
  }

  const rockMat = mat(scene, "rock", "#7d756c");
  const rockParts: Mesh[] = [];
  for (const rock of rockList()) {
    const h = heightAt(rock.x, rock.z);
    const mesh = MeshBuilder.CreateSphere("rock", { diameter: 1, segments: 5 }, scene);
    mesh.scaling.set(rock.r * 2.1, rock.r * 1.1, rock.r * 1.8);
    mesh.position.set(rock.x, h + rock.r * 0.45, rock.z);
    rockParts.push(mesh);
  }
  const rockMesh = merge(rockParts, rockMat, "rocks");

  const propNodes = new Map<string, TransformNode>();
  const berryMat = mat(scene, "berry-bush", "#2c6b3c");
  const fruitMat = mat(scene, "fruit", "#c4493a", "#5a1c16");
  const glowBush = mat(scene, "glow-bush", "#246b58");
  const glowFruit = mat(scene, "glow-fruit", "#f0d48a", "#e3a23a");
  for (const prop of props()) {
    const root = new TransformNode(prop.id, scene);
    const h = heightAt(prop.x, prop.z);
    root.position.set(prop.x, h, prop.z);
    const bush = MeshBuilder.CreateSphere(prop.id + "-b", { diameter: 0.7, segments: 6 }, scene);
    bush.parent = root;
    bush.position.y = 0.32;
    bush.material = prop.kind === "glow" ? glowBush : berryMat;
    bush.isPickable = false;
    const fruit = MeshBuilder.CreateSphere(prop.id + "-f", { diameter: prop.kind === "glow" ? 0.22 : 0.12, segments: 5 }, scene);
    fruit.parent = root;
    fruit.position.set(0.16, 0.5, 0.12);
    fruit.material = prop.kind === "glow" ? glowFruit : fruitMat;
    fruit.isPickable = false;
    propNodes.set(prop.id, root);
  }

  const sign = new TransformNode("sign", scene);
  sign.position.set(1.4, heightAt(1.4, 16.2), 16.2);
  const post = MeshBuilder.CreateCylinder("post", { height: 1.3, diameter: 0.08, tessellation: 5 }, scene);
  post.parent = sign;
  post.position.y = 0.65;
  post.material = trunkMat;
  post.isPickable = false;
  const board = MeshBuilder.CreatePlane("board", { width: 1.4, height: 0.42 }, scene);
  board.parent = sign;
  board.position.y = 1.15;
  const signTex = new DynamicTexture("sign-tex", { width: 512, height: 160 }, scene, true);
  const sctx = signTex.getContext();
  sctx.fillStyle = "#1c3a2e";
  sctx.fillRect(0, 0, 512, 160);
  sctx.fillStyle = "#f4efe4";
  sctx.font = "600 54px Georgia";
  sctx.fillText("Mata da Nascente", 28, 98);
  signTex.update();
  const signMat = new StandardMaterial("sign-mat", scene);
  signMat.diffuseTexture = signTex;
  signMat.emissiveColor = new Color3(0.15, 0.15, 0.1);
  signMat.specularColor = Color3.Black();
  board.material = signMat;
  board.isPickable = false;

  let grass: Mesh | null = null;
  if (scene.getEngine().getCaps().instancedArrays) {
    grass = MeshBuilder.CreateCylinder("grass", { height: 0.42, diameterTop: 0, diameterBottom: 0.07, tessellation: 3 }, scene);
    const gmat = mat(scene, "grass", "#3f8f4e");
    grass.material = gmat;
    grass.isPickable = false;
    const rand = mulberry32(7);
    const matrices = [];
    let guard = 0;
    while (matrices.length < 640 && guard < 4000) {
      guard++;
      const x = (rand() - 0.5) * 64;
      const z = (rand() - 0.5) * 64;
      const h = heightAt(x, z);
      if (h < CONFIG.waterY + 0.2) continue;
      if (pathDistance(x, z) < 1.1) continue;
      const s = 0.7 + rand() * 0.8;
      const matrix = Matrix.Compose(
        new Vector3(s, 0.6 + rand() * 0.9, s),
        Quaternion.RotationYawPitchRoll(rand() * Math.PI * 2, 0, 0),
        new Vector3(x, h + 0.18 * s, z),
      );
      matrices.push(matrix);
    }
    grass.thinInstanceAdd(matrices, true);
    grass.alwaysSelectAsActiveMesh = false;
    gmat.freeze();
  }

  const hemi = new HemisphericLight("hemi", new Vector3(0.15, 1, 0.2), scene);
  hemi.intensity = 0.82;
  hemi.diffuse = new Color3(0.85, 0.92, 0.95);
  hemi.groundColor = new Color3(0.28, 0.24, 0.16);
  const sun = new DirectionalLight("sun", new Vector3(-0.45, -1, 0.25), scene);
  sun.intensity = 0.9;
  sun.diffuse = new Color3(1, 0.95, 0.84);
  sun.position = new Vector3(20, 30, -10);

  scene.clearColor = new Color4(0.55, 0.76, 0.84, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.016;
  scene.fogColor = new Color3(0.62, 0.8, 0.84);
  scene.ambientColor = new Color3(0.12, 0.14, 0.12);
  scene.skipPointerMovePicking = true;
  scene.blockMaterialDirtyMechanism = false;

  const forest: Forest = {
    ground,
    water,
    grass,
    treeMesh,
    rockMesh,
    propNodes,
    sun,
    shadows: null,
    setTier: () => {},
  };

  const apply = (next: AppliedTier) => {
    if (grass) {
      const count = grassCount(next);
      grass.thinInstanceCount = count;
      grass.setEnabled(count > 0);
    }
    scene.fogDensity = next === "low" ? 0.022 : 0.016;
    if (next === "high") {
      if (!forest.shadows) {
        const shadows = new ShadowGenerator(1024, sun);
        shadows.usePercentageCloserFiltering = true;
        shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
        if (treeMesh) shadows.addShadowCaster(treeMesh);
        if (rockMesh) shadows.addShadowCaster(rockMesh);
        forest.shadows = shadows;
      }
    } else if (forest.shadows) {
      forest.shadows.dispose();
      forest.shadows = null;
    }
  };
  forest.setTier = apply;
  apply(tier);
  return forest;
}
