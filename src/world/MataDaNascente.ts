import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
} from '@babylonjs/core';
import {
  MATA_BOUNDS,
  MATA_LAKE,
  MATA_PATHS,
  MATA_ROCKS,
  MATA_TREES,
  type WorldBounds,
} from './worldConfig';

export interface MataDaNascenteWorld {
  bounds: WorldBounds;
}

function createMaterials(scene: Scene) {
  const ground = new StandardMaterial('mata-ground', scene);
  ground.diffuseColor = new Color3(0.26, 0.55, 0.28);

  const path = new StandardMaterial('mata-path', scene);
  path.diffuseColor = new Color3(0.48, 0.36, 0.2);

  const water = new StandardMaterial('mata-water', scene);
  water.diffuseColor = new Color3(0.16, 0.46, 0.63);
  water.alpha = 0.82;

  const bark = new StandardMaterial('mata-bark', scene);
  bark.diffuseColor = new Color3(0.4, 0.25, 0.14);

  const leaf = new StandardMaterial('mata-leaf', scene);
  leaf.diffuseColor = new Color3(0.15, 0.45, 0.2);

  const rock = new StandardMaterial('mata-rock', scene);
  rock.diffuseColor = new Color3(0.35, 0.39, 0.34);

  const bush = new StandardMaterial('mata-bush', scene);
  bush.diffuseColor = new Color3(0.18, 0.4, 0.18);

  return { ground, path, water, bark, leaf, rock, bush };
}

function createVegetation(scene: Scene, materials: ReturnType<typeof createMaterials>) {
  for (const tree of MATA_TREES) {
    const trunk = MeshBuilder.CreateCylinder(
      'tree-trunk',
      { height: 3 * tree.scale, diameter: 0.7 * tree.scale },
      scene,
    );
    trunk.position.set(tree.x, 1.5 * tree.scale, tree.z);
    trunk.material = materials.bark;

    const crown = MeshBuilder.CreateSphere(
      'tree-crown',
      { diameter: 3 * tree.scale, segments: 6 },
      scene,
    );
    crown.position.set(tree.x, 3.5 * tree.scale, tree.z);
    crown.material = materials.leaf;
  }

  const bushes = [
    { x: -28, z: -8, scale: 1.2 },
    { x: -5, z: 27, scale: 0.9 },
    { x: 27, z: 25, scale: 1.3 },
    { x: 36, z: -4, scale: 0.8 },
    { x: -28, z: 20, scale: 1 },
  ];
  for (const bush of bushes) {
    const mesh = MeshBuilder.CreateSphere('forest-bush', { diameter: 2.2 * bush.scale, segments: 6 }, scene);
    mesh.position.set(bush.x, 1.05 * bush.scale, bush.z);
    mesh.scaling.y = 0.7;
    mesh.material = materials.bush;
  }
}

function createRocks(scene: Scene, materials: ReturnType<typeof createMaterials>) {
  for (const rock of MATA_ROCKS) {
    const mesh = MeshBuilder.CreateIcoSphere('forest-rock', { radius: rock.scale, subdivisions: 1 }, scene);
    mesh.position.set(rock.x, rock.scale * 0.55, rock.z);
    mesh.scaling.set(1.2, 0.75, 0.9);
    mesh.material = materials.rock;
  }
}

function createPaths(scene: Scene, material: StandardMaterial) {
  for (const definition of MATA_PATHS) {
    const path = MeshBuilder.CreateGround(
      'forest-path',
      { width: definition.width, height: definition.length },
      scene,
    );
    path.position.set(definition.x, 0.015, definition.z);
    path.rotation.y = definition.rotation;
    path.material = material;
  }
}

function createLake(scene: Scene, material: StandardMaterial) {
  const lake = MeshBuilder.CreateGround(
    'spring-lake',
    { width: MATA_LAKE.width, height: MATA_LAKE.depth, subdivisions: 2 },
    scene,
  );
  lake.position.set(MATA_LAKE.x, 0.04, MATA_LAKE.z);
  lake.material = material;
}

export function createMataDaNascente(scene: Scene): MataDaNascenteWorld {
  const materials = createMaterials(scene);
  const ground = MeshBuilder.CreateGround('mata-ground', { width: 100, height: 100 }, scene);
  ground.material = materials.ground;
  createPaths(scene, materials.path);
  createLake(scene, materials.water);
  createVegetation(scene, materials);
  createRocks(scene, materials);

  return { bounds: MATA_BOUNDS };
}
