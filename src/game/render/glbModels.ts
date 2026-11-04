import { Axis, SceneLoader, TransformNode } from "@babylonjs/core";
import type { AssetContainer, Scene } from "@babylonjs/core";
import { MODEL_ASSETS } from "../data/models.ts";
import type { ModelAsset, ModelKey } from "../data/models.ts";
import type { Rig } from "./rig.ts";

let loaderReady: Promise<unknown> | null = null;
const containers = new WeakMap<Scene, Map<string, Promise<AssetContainer | null>>>();

/** The glTF loader is only downloaded when at least one model is configured. */
function ensureLoader(): Promise<unknown> {
  loaderReady ??= import("@babylonjs/loaders/glTF/index.js");
  return loaderReady;
}

export function modelUrl(asset: ModelAsset): string {
  return `${import.meta.env.BASE_URL}models/${asset.file}`;
}

function container(scene: Scene, asset: ModelAsset, url: string): Promise<AssetContainer | null> {
  let cache = containers.get(scene);
  if (!cache) { cache = new Map(); containers.set(scene, cache); }
  let pending = cache.get(url);
  if (!pending) {
    pending = ensureLoader()
      .then(() => SceneLoader.LoadAssetContainerAsync("", url, scene, undefined, ".glb"))
      .catch((error: unknown) => { console.warn(`EcoWild: modelo ${asset.file} indisponível; usando o procedural.`, error); return null; });
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Dress a procedural rig with the configured GLB, if any. Resolves true when the model
 * was attached. The procedural meshes are hidden, not removed, so a failure later
 * (e.g. context loss) never leaves an invisible animal.
 */
export async function dressRig(scene: Scene, rig: Rig, key: ModelKey, override?: { asset: ModelAsset; url: string }): Promise<boolean> {
  const asset = override?.asset ?? MODEL_ASSETS[key];
  if (!asset) return false;
  const loaded = await container(scene, asset, override?.url ?? modelUrl(asset));
  if (!loaded || scene.isDisposed || rig.root.isDisposed()) return false;
  const anchor: TransformNode = rig.body ?? rig.root;
  const instance = loaded.instantiateModelsToScene(name => `${rig.root.name}-glb-${name}`, false);
  const procedural = rig.root.getChildMeshes();
  for (const root of instance.rootNodes) {
    if (!(root instanceof TransformNode)) continue;
    const node = root;
    node.parent = anchor;
    node.scaling.setAll(asset.scale);
    if (asset.yOffset) node.position.y += asset.yOffset;
    // glTF roots may carry a rotation quaternion; rotate() works with either form.
    if (asset.rotationY) node.rotate(Axis.Y, asset.rotationY);
    for (const mesh of node.getChildMeshes(false)) { mesh.isPickable = false; mesh.receiveShadows = true; }
  }
  for (const mesh of procedural) mesh.isVisible = false;
  return true;
}
