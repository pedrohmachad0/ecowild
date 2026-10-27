import { treeList, rockList } from "../world/layout.ts";
import { heightAt } from "../world/terrain.ts";
import type { CameraVolume } from "./boom.ts";

/**
 * Static proxies matching the primitive dimensions in render/forest.ts. Tree
 * collision circles are for feet only; the camera also accounts for both crowns.
 * Build once per world, never from the merged forest bounding box each frame.
 */
export function createCameraVolumes(): CameraVolume[] {
  const volumes: CameraVolume[] = [];
  treeList().forEach((tree, index) => {
    const floor = heightAt(tree.x, tree.z);
    const scale = 0.9 + ((index * 17) % 5) * 0.08;
    volumes.push({
      kind: "cylinder",
      center: { x: tree.x, y: floor + 1.85 * scale, z: tree.z },
      radius: 0.425 * scale, halfHeight: 1.85 * scale,
    }, {
      kind: "ellipsoid",
      center: { x: tree.x, y: floor + 4.1 * scale, z: tree.z },
      radii: { x: 1.7 * scale * 1.05, y: 1.7 * scale * 0.85, z: 1.7 * scale },
    }, {
      kind: "ellipsoid",
      center: { x: tree.x + 0.35 * scale, y: floor + 3.4 * scale, z: tree.z + 0.2 },
      radii: { x: 1.2 * scale, y: 1.2 * scale * 0.8, z: 1.2 * scale },
    });
  });
  for (const rock of rockList()) {
    volumes.push({
      kind: "ellipsoid",
      center: { x: rock.x, y: heightAt(rock.x, rock.z) + rock.r * 0.45, z: rock.z },
      radii: { x: rock.r * 1.05, y: rock.r * 0.55, z: rock.r * 0.9 },
    });
  }
  return volumes;
}
