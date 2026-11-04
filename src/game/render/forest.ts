import {
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  DirectionalLight,
  PointLight,
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
  Texture,
} from "@babylonjs/core";
import { CONFIG } from "../config.ts";
import { grassCount } from "../performance/quality.ts";
import type { AppliedTier } from "../types.ts";
import { moundList, rockList, treeList, props } from "../world/layout.ts";
import { region } from "../world/region.ts";
import { moundHeight, TREE_SHAPES, treeScale } from "../world/treeShapes.ts";
import { dayPeriod, daylight } from "../world/clock.ts";
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
  /** Day-cycle lighting; lantern follows the player at night. */
  setTime: (dayF: number, player: { x: number; y: number; z: number }, time: number) => void;
  setIncubator: (progress: number | null, time: number) => void;
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
  const palette = region().palette;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wx = (x / (size - 1) - 0.5) * span;
      const wz = (y / (size - 1) - 0.5) * span;
      const shore = shoreBlend(wx, wz);
      const path = Math.exp(-(pathDistance(wx, wz) * pathDistance(wx, wz)) / 3.2);
      const n = ((Math.sin(wx * 12.2 + wz * 4.1) + Math.sin(wx * 3.1 - wz * 9.4)) * 0.5 + 1) * 0.5;
      const { grassA, grassB, sand, dirt } = palette;
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

  // Deep lake teal; low emissive so it reads as water, not a glowing neon disc.
  const def = region();
  const waterMat = mat(scene, "water", def.palette.water, "#081e26");
  waterMat.alpha = 0.8;
  waterMat.backFaceCulling = false;
  waterMat.specularColor = new Color3(0.5, 0.55, 0.55);
  waterMat.specularPower = 48;
  const water = MeshBuilder.CreateDisc("water", { radius: def.water.disc, tessellation: 40 }, scene);
  water.rotation.x = Math.PI / 2;
  water.position.set(def.water.x, CONFIG.waterY + 0.04, def.water.z);
  water.material = waterMat;
  water.isPickable = false;

  const trunkMat = mat(scene, "trunk", def.palette.trunk);
  const leafMats = def.palette.leaves.map((hex, i) => mat(scene, "leaf-" + i, hex));
  const trunks: Mesh[] = [];
  const leaves: Mesh[][] = [[], [], []];
  // Same filter and proportions as treeList() and the camera volumes (world/treeShapes.ts).
  const placed = def.trees.filter(t => heightAt(t.x, t.z) >= CONFIG.waterY + 0.25);
  placed.forEach((tree, ti) => {
    const h = heightAt(tree.x, tree.z);
    const scale = treeScale(ti), shape = TREE_SHAPES[tree.kind];
    const trunk = MeshBuilder.CreateCylinder("trunk", { height: shape.trunk.height, diameterBottom: shape.trunk.diameter, diameterTop: shape.trunk.diameter * shape.trunk.topScale, tessellation: 6 }, scene);
    trunk.position.set(tree.x, h + shape.trunk.height / 2 * scale, tree.z);
    trunk.scaling.set(scale, scale, scale);
    if (tree.kind === "twisted") trunk.rotation.z = ((ti % 3) - 1) * 0.18;
    trunks.push(trunk);
    shape.crowns.forEach((c, ci) => {
      const crown = MeshBuilder.CreateSphere("crown", { diameter: c.diameter, segments: ci ? 5 : 6 }, scene);
      crown.position.set(tree.x + c.x * scale, h + c.y * scale, tree.z + c.z);
      crown.scaling.set(scale * c.sx, scale * c.sy, scale * c.sz);
      leaves[(ti + ci) % 3]!.push(crown);
    });
    // Buriti fronds: a ring of drooping leaf blades around the crown.
    if (tree.kind === "buriti") for (let f = 0; f < 7; f++) {
      const a = f / 7 * Math.PI * 2 + ti;
      const frond = MeshBuilder.CreateCylinder("frond", { height: 2.2, diameterTop: 0, diameterBottom: 0.5, tessellation: 3 }, scene);
      frond.position.set(tree.x + Math.cos(a) * 1.1 * scale, h + 6.4 * scale, tree.z + Math.sin(a) * 1.1 * scale);
      frond.rotation.set(0, -a, Math.PI / 2 + 0.35);
      frond.rotation.y = -a;
      frond.scaling.setAll(scale);
      leaves[(ti + f) % 3]!.push(frond);
    }
  });
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

  // A low trail boundary makes the simulation's circular limit visible.
  const border: Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const angle = i * Math.PI / 60;
    const x = Math.cos(angle) * CONFIG.worldRadius, z = Math.sin(angle) * CONFIG.worldRadius;
    border.push(new Vector3(x, heightAt(x, z) + 0.5, z));
  }
  const rope = MeshBuilder.CreateLines("limite-da-trilha", { points: border }, scene);
  rope.color = Color3.FromHexString("#ead8a2"); rope.isPickable = false;
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
  // Termite mounds (cupinzeiros): tall clay cones that block movement and sight.
  const moundMat = mat(scene, "termite-mound", "#a8683e");
  const moundParts: Mesh[] = [];
  for (const m of moundList()) {
    const hgt = moundHeight(m.r);
    const cone = MeshBuilder.CreateCylinder("mound", { height: hgt, diameterBottom: m.r * 2.1, diameterTop: m.r * 0.5, tessellation: 9 }, scene);
    cone.position.set(m.x, heightAt(m.x, m.z) + hgt / 2 - 0.05, m.z);
    moundParts.push(cone);
    const lump = MeshBuilder.CreateSphere("mound-lump", { diameter: m.r * 1.2, segments: 4 }, scene);
    lump.position.set(m.x + m.r * 0.4, heightAt(m.x, m.z) + hgt * 0.35, m.z - m.r * 0.3);
    moundParts.push(lump);
  }
  const mounds = merge(moundParts, moundMat, "mounds");
  if (mounds) mounds.receiveShadows = true;

  const propNodes = new Map<string, TransformNode>();
  const berryMat = mat(scene, "berry-bush", "#2c6b3c");
  const fruitMat = mat(scene, "fruit", "#c4493a", "#5a1c16");
  const glowBush = mat(scene, "glow-bush", "#246b58");
  const glowFruit = mat(scene, "glow-fruit", "#f0d48a", "#e3a23a");
  const mossMat = mat(scene, "nest-moss", "#4f6b37");
  const eggMat = mat(scene, "moss-egg", "#e8efd6", "#4a7a5a");
  const dirtMat = mat(scene, "burrow-dirt", "#6b4d31");
  const holeMat = mat(scene, "burrow-hole", "#1d140d");
  for (const nest of def.nests) {
    const ring = MeshBuilder.CreateTorus(nest.id, { diameter: 0.7, thickness: 0.22, tessellation: 14 }, scene);
    ring.position.set(nest.x, heightAt(nest.x, nest.z) + 0.06, nest.z);
    ring.material = mossMat; ring.isPickable = false; ring.freezeWorldMatrix();
  }
  for (const home of def.burrows) {
    const mound = MeshBuilder.CreateSphere(home.id + "-mound", { diameterX: 1.3, diameterY: 0.35, diameterZ: 1.1, segments: 6 }, scene);
    mound.position.set(home.x + 0.45, heightAt(home.x, home.z) + 0.02, home.z + 0.3);
    mound.material = dirtMat; mound.isPickable = false; mound.freezeWorldMatrix();
    const hole = MeshBuilder.CreateDisc(home.id + "-hole", { radius: 0.3, tessellation: 12 }, scene);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(home.x, heightAt(home.x, home.z) + 0.04, home.z);
    hole.material = holeMat; hole.isPickable = false; hole.freezeWorldMatrix();
  }
  const wolfShrub = mat(scene, "wolfapple-shrub", "#6f8a4a");
  const wolfFruit = mat(scene, "wolfapple", "#a9c95a", "#25300f");
  for (const prop of props()) {
    const root = new TransformNode(prop.id, scene);
    const h = heightAt(prop.x, prop.z);
    root.position.set(prop.x, h, prop.z);
    if (prop.kind === "wolfapple") {
      // Lobeira: a small shrub with large green-yellow fruits.
      const shrub = MeshBuilder.CreateSphere(prop.id + "-shrub", { diameterX: 1, diameterY: 0.8, diameterZ: 0.9, segments: 6 }, scene);
      shrub.parent = root; shrub.position.y = 0.42; shrub.material = wolfShrub; shrub.isPickable = false;
      for (const [dx, dz] of [[0.32, 0.2], [-0.25, 0.3], [0.1, -0.35]] as const) {
        const fruit = MeshBuilder.CreateSphere(prop.id + "-wf", { diameter: 0.2, segments: 5 }, scene);
        fruit.parent = root; fruit.position.set(dx, 0.55, dz); fruit.material = wolfFruit; fruit.isPickable = false;
      }
      propNodes.set(prop.id, root);
      continue;
    }
    if (prop.kind === "egg") {
      const egg = MeshBuilder.CreateSphere(prop.id + "-egg", { diameterX: 0.2, diameterY: 0.27, diameterZ: 0.2, segments: 8 }, scene);
      egg.parent = root; egg.position.y = 0.16; egg.material = eggMat; egg.isPickable = false;
      propNodes.set(prop.id, root);
      continue;
    }
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

  // Research camp: tent, campfire and the warmed nest used as incubator.
  const campMats = { tent: mat(scene, "tent", "#b88a4a"), stone: mat(scene, "camp-stone", "#8a8378"), log: mat(scene, "camp-log", "#5a3a22"), flame: mat(scene, "flame", "#ffb347", "#ff8c1a") };
  campMats.flame.disableLighting = true;
  const CAMP = def.camp;
  if (CAMP.tent) {
    const tent = MeshBuilder.CreateCylinder("tent", { height: 1.5, diameterTop: 0, diameterBottom: 2.1, tessellation: 4 }, scene);
    tent.position.set(CAMP.tent.x, heightAt(CAMP.tent.x, CAMP.tent.z) + 0.75, CAMP.tent.z);
    tent.rotation.y = Math.PI / 4; tent.material = campMats.tent; tent.isPickable = false; tent.freezeWorldMatrix();
  }
  const fire = new TransformNode("campfire", scene);
  fire.position.set(CAMP.x + 0.6, heightAt(CAMP.x + 0.6, CAMP.z - 1.6), CAMP.z - 1.6);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const stone = MeshBuilder.CreateSphere("fire-stone", { diameter: 0.22, segments: 4 }, scene);
    stone.parent = fire; stone.position.set(Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.38); stone.material = campMats.stone; stone.isPickable = false;
  }
  for (const r of [0.4, -0.4]) {
    const log = MeshBuilder.CreateCylinder("fire-log", { height: 0.6, diameter: 0.1, tessellation: 5 }, scene);
    log.parent = fire; log.rotation.set(Math.PI / 2, r, 0); log.position.y = 0.08; log.material = campMats.log; log.isPickable = false;
  }
  const flame = MeshBuilder.CreateCylinder("flame", { height: 0.45, diameterTop: 0, diameterBottom: 0.3, tessellation: 6 }, scene);
  flame.parent = fire; flame.position.y = 0.3; flame.material = campMats.flame; flame.isPickable = false;
  const incubator = new TransformNode("incubator", scene);
  const nestSpot = CAMP.incubator ?? { x: CAMP.x, z: CAMP.z };
  incubator.position.set(nestSpot.x, heightAt(nestSpot.x, nestSpot.z), nestSpot.z);
  incubator.setEnabled(!!CAMP.incubator);
  const warmNest = MeshBuilder.CreateTorus("warm-nest", { diameter: 0.6, thickness: 0.2, tessellation: 14 }, scene);
  warmNest.parent = incubator; warmNest.position.y = 0.08; warmNest.material = mossMat; warmNest.isPickable = false;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const stone = MeshBuilder.CreateSphere("nest-stone", { diameter: 0.2, segments: 4 }, scene);
    stone.parent = incubator; stone.position.set(Math.cos(a) * 0.45, 0.07, Math.sin(a) * 0.45); stone.material = campMats.stone; stone.isPickable = false;
  }
  const warmingEgg = MeshBuilder.CreateSphere("warming-egg", { diameterX: 0.2, diameterY: 0.27, diameterZ: 0.2, segments: 8 }, scene);
  warmingEgg.parent = incubator; warmingEgg.position.y = 0.18; warmingEgg.material = eggMat; warmingEgg.isPickable = false;
  warmingEgg.setEnabled(false);

  // Exit posts: a lantern-topped post marks every trail to another region.
  for (const exit of def.exits) {
    const post = MeshBuilder.CreateCylinder("exit-post", { height: 2, diameter: 0.14, tessellation: 6 }, scene);
    post.position.set(exit.x, heightAt(exit.x, exit.z) + 1, exit.z); post.material = trunkMat; post.isPickable = false;
    const lamp = MeshBuilder.CreateSphere("exit-lamp", { diameter: 0.28, segments: 6 }, scene);
    lamp.position.set(exit.x, heightAt(exit.x, exit.z) + 2.1, exit.z); lamp.material = campMats.flame; lamp.isPickable = false;
  }

  const sign = new TransformNode("sign", scene);
  sign.position.set(def.sign.x, heightAt(def.sign.x, def.sign.z), def.sign.z);
  const post = MeshBuilder.CreateCylinder("post", { height: 1.3, diameter: 0.08, tessellation: 5 }, scene);
  post.parent = sign;
  post.position.y = 0.65;
  post.material = trunkMat;
  post.isPickable = false;
  // A thin box keeps the sign visible from behind (a single plane vanished, leaving a bare stick).
  const backing = MeshBuilder.CreateBox("board-back", { width: 1.46, height: 0.48, depth: 0.05 }, scene);
  backing.parent = sign;
  backing.position.y = 1.15;
  backing.material = trunkMat;
  backing.isPickable = false;
  const board = MeshBuilder.CreatePlane("board", { width: 1.4, height: 0.42 }, scene);
  board.parent = sign;
  // Plane fronts face local −Z; turning the sign makes the text face the clearing (+Z).
  board.position.set(0, 1.15, -0.03);
  sign.rotation.y = Math.PI;
  const signTex = new DynamicTexture("sign-tex", { width: 512, height: 160 }, scene, true);
  const sctx = signTex.getContext();
  sctx.fillStyle = "#1c3a2e";
  sctx.fillRect(0, 0, 512, 160);
  sctx.fillStyle = "#f4efe4";
  sctx.font = "600 54px Georgia";
  sctx.fillText(def.sign.text, 28, 98);
  signTex.update();
  // The right-handed scene mirrors plane UVs; flip U so the text reads correctly.
  signTex.wrapU = Texture.WRAP_ADDRESSMODE;
  signTex.uScale = -1;
  const signMat = new StandardMaterial("sign-mat", scene);
  signMat.diffuseTexture = signTex;
  signMat.emissiveColor = new Color3(0.15, 0.15, 0.1);
  signMat.specularColor = Color3.Black();
  board.material = signMat;
  board.isPickable = false;

  let grass: Mesh | null = null;
  if (scene.getEngine().getCaps().instancedArrays) {
    grass = MeshBuilder.CreateCylinder("grass", { height: 0.42, diameterTop: 0, diameterBottom: 0.07, tessellation: 3 }, scene);
    const gmat = mat(scene, "grass", def.palette.grass);
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

  // Lights for night play exist from the start so frozen materials compile with them.
  const lantern = new PointLight("lantern", new Vector3(0, 2, 18), scene);
  lantern.diffuse = new Color3(1, 0.82, 0.55); lantern.specular = Color3.Black(); lantern.range = 11; lantern.intensity = 0;
  const campLight = new PointLight("camp-light", new Vector3(CAMP.x + 0.6, heightAt(CAMP.x, CAMP.z) + 1, CAMP.z - 1.6), scene);
  campLight.diffuse = new Color3(1, 0.6, 0.3); campLight.specular = Color3.Black(); campLight.range = 9; campLight.intensity = 0.4;

  // Fireflies: one merged emissive mesh around the lake and the grove, visible at night.
  const fireflyMat = mat(scene, "firefly", "#f6ff9a", "#e8ff6a");
  fireflyMat.disableLighting = true;
  const flies: Mesh[] = [];
  const frand = mulberry32(31);
  for (let i = 0; i < 46; i++) {
    const spot = def.highlights[0] ?? def.water;
    const cx = i % 2 ? def.water.x : spot.x, cz = i % 2 ? def.water.z : spot.z, a = frand() * Math.PI * 2, r = 4 + frand() * 6;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const fly = MeshBuilder.CreateSphere("firefly", { diameter: 0.06, segments: 2 }, scene);
    fly.position.set(x, Math.max(heightAt(x, z), CONFIG.waterY) + 0.5 + frand() * 1.4, z);
    flies.push(fly);
  }
  const fireflies = Mesh.MergeMeshes(flies, true, true)!;
  fireflies.material = fireflyMat; fireflies.isPickable = false; fireflies.setEnabled(false);

  const daySky = new Color3(...def.palette.sky), nightSky = new Color3(0.05, 0.08, 0.16), duskSky = new Color3(0.86, 0.58, 0.44);
  const dayHemi = new Color3(0.85, 0.92, 0.95), nightHemi = new Color3(0.32, 0.4, 0.62);
  const tmp = new Color3();
  const setTime = (dayF: number, player: { x: number; y: number; z: number }, time: number) => {
    const light = daylight(dayF), period = dayPeriod(dayF);
    const angle = (dayF - 0.25) * Math.PI * 2;
    sun.direction.set(-Math.cos(angle) * 0.6, -Math.max(0.25, Math.sin(angle)), 0.3);
    sun.intensity = 0.12 + 0.8 * light;
    sun.diffuse.set(1, 0.78 + 0.17 * light, 0.6 + 0.24 * light);
    hemi.intensity = 0.32 + 0.5 * light;
    Color3.LerpToRef(nightHemi, dayHemi, light, hemi.diffuse);
    Color3.LerpToRef(nightSky, daySky, light, tmp);
    if (period === "dawn" || period === "dusk") Color3.LerpToRef(tmp, duskSky, 0.35 * (1 - Math.abs(light - 0.5) * 2), tmp);
    scene.clearColor.set(tmp.r, tmp.g, tmp.b, 1);
    scene.fogColor.set(tmp.r * 1.05, tmp.g * 1.03, tmp.b * 1.02);
    const dark = 1 - light;
    lantern.position.set(player.x, player.y + 2.1, player.z);
    lantern.intensity = dark * 0.95;
    campLight.intensity = 0.35 + dark * 0.9 + Math.sin(time * 9) * 0.06;
    flame.scaling.y = 1 + Math.sin(time * 11) * 0.12;
    fireflies.setEnabled(light < 0.3);
    if (light < 0.3) fireflies.position.y = Math.sin(time * 0.8) * 0.25;
  };
  const setIncubator = (progress: number | null, time: number) => {
    warmingEgg.setEnabled(progress !== null);
    if (progress !== null) warmingEgg.rotation.z = progress > 0.75 ? Math.sin(time * 14) * 0.18 * (progress - 0.75) * 4 : 0;
  };

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
    setTime,
    setIncubator,
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
