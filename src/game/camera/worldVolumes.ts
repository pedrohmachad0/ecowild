import { moundList, rockList } from "../world/layout.ts";
import { heightAt } from "../world/terrain.ts";
import { region } from "../world/region.ts";
import { CONFIG } from "../config.ts";
import { moundHeight, TREE_SHAPES, treeScale } from "../world/treeShapes.ts";
import type { CameraVolume } from "./boom.ts";

/**
 * Static proxies matching render/forest.ts through the shared TREE_SHAPES table.
 * Build once per region load, never from the merged forest bounding box each frame.
 */
export function createCameraVolumes(): CameraVolume[] {
  const volumes: CameraVolume[] = [];
  region().trees.filter(t => heightAt(t.x, t.z) >= CONFIG.waterY + 0.25).forEach((tree, index) => {
    const floor = heightAt(tree.x, tree.z);
    const scale = treeScale(index), shape = TREE_SHAPES[tree.kind];
    volumes.push({
      kind: "cylinder",
      center: { x: tree.x, y: floor + shape.trunk.height / 2 * scale, z: tree.z },
      radius: shape.trunk.diameter / 2 * scale, halfHeight: shape.trunk.height / 2 * scale,
    });
    for (const crown of shape.crowns) {
      const r = crown.diameter / 2 * scale;
      volumes.push({
        kind: "ellipsoid",
        center: { x: tree.x + crown.x * scale, y: floor + crown.y * scale, z: tree.z + crown.z },
        radii: { x: r * crown.sx, y: r * crown.sy, z: r * crown.sz },
      });
    }
  });
  for (const rock of rockList()) {
    volumes.push({
      kind: "ellipsoid",
      center: { x: rock.x, y: heightAt(rock.x, rock.z) + rock.r * 0.45, z: rock.z },
      radii: { x: rock.r * 1.05, y: rock.r * 0.55, z: rock.r * 0.9 },
    });
  }
  for (const mound of moundList()) {
    const h = moundHeight(mound.r);
    volumes.push({ kind: "cylinder", center: { x: mound.x, y: heightAt(mound.x, mound.z) + h / 2, z: mound.z }, radius: mound.r, halfHeight: h / 2 });
  }
  return volumes;
}
