import { describe, expect, it } from "vitest";
import { advanceBoom, clampCameraPitch, resolveBoom } from "../src/game/camera/boom.ts";
import type { CameraVolume } from "../src/game/camera/boom.ts";
import { createCameraVolumes } from "../src/game/camera/worldVolumes.ts";
import { treeList, rockList } from "../src/game/world/layout.ts";
import { heightAt } from "../src/game/world/terrain.ts";

const trunk: CameraVolume = { kind: "cylinder", center: { x: 0, y: 1.85, z: 3 }, radius: 0.425, halfHeight: 1.85 };
const ground = () => 0;

describe("câmera de órbita no cenário", () => {
  it("encurta antes do tronco com margem, inclusive após giro rápido", () => {
    const pivot = { x: 0, y: 1.45, z: 0 }, desired = { x: 0, y: 2, z: 6 };
    const boom = advanceBoom(pivot, desired, 6, 1 / 60, [trunk], ground);
    expect(boom.blocked).toBe(true);
    expect(boom.position.z).toBeLessThan(3 - 0.425 - 0.24);
    expect(boom.distance).toBeLessThan(3);
    // Changing orbit must not interpolate the old world-space position through it.
    const side = advanceBoom(pivot, { x: 6, y: 2, z: 0 }, boom.distance, 1 / 60, [trunk], ground);
    expect(side.position.z).toBe(0);
    expect(side.position.x).toBeGreaterThan(boom.distance - 0.02);
    expect(side.position.x).toBeLessThan(6);
  });

  it("não encurta por uma rocha abaixo do raio da câmera, mas detecta contato baixo", () => {
    const rock: CameraVolume = { kind: "ellipsoid", center: { x: 0, y: 0.3, z: 3 }, radii: { x: 0.8, y: 0.4, z: 0.7 } };
    const high = resolveBoom({ x: 0, y: 1.45, z: 0 }, { x: 0, y: 3, z: 6 }, [rock], ground);
    expect(high.blocked).toBe(false);
    const low = resolveBoom({ x: 0, y: 0.5, z: 0 }, { x: 0, y: 0.5, z: 6 }, [rock], ground);
    expect(low.blocked).toBe(true);
    expect(low.position.z).toBeLessThan(3);
  });

  it("bloqueia copa mesmo quando não cruza o tronco estreito", () => {
    const crown: CameraVolume = { kind: "ellipsoid", center: { x: 1.2, y: 4.1, z: 3 }, radii: { x: 1.785, y: 1.445, z: 1.7 } };
    const pivot = { x: 0, y: 1.45, z: 0 }, desired = { x: 0, y: 5, z: 6 };
    expect(resolveBoom(pivot, desired, [crown], ground).blocked).toBe(true);
    expect(resolveBoom(pivot, desired, [{ ...trunk, center: { ...trunk.center, x: 1.2 } }], ground).blocked).toBe(false);
  });

  it("retração é imediata e extensão é suave e independente da taxa de frames", () => {
    const p = { x: 0, y: 1.5, z: 0 }, d = { x: 0, y: 1.5, z: 6 };
    const hit = advanceBoom(p, d, 6, 1 / 120, [trunk]);
    expect(hit.distance).toBeCloseTo(resolveBoom(p, d, [trunk]).distance, 6);
    let a = 2, b = 2;
    for (let i = 0; i < 60; i++) a = advanceBoom(p, d, a, 1 / 60, []).distance;
    for (let i = 0; i < 120; i++) b = advanceBoom(p, d, b, 1 / 120, []).distance;
    expect(a).toBeCloseTo(b, 8);
    expect(a).toBeGreaterThan(5.9);
  });

  it("encurta no primeiro encontro com relevo, mesmo com destino acima do chão", () => {
    const hill = (_x: number, z: number) => 2 * Math.exp(-((z - 3) ** 2));
    const result = resolveBoom({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 1.5, z: 6 }, [], hill);
    expect(result.blocked).toBe(true);
    expect(result.position.z).toBeLessThan(3);
    expect(result.position.y).toBeGreaterThan(hill(0, result.position.z) + 0.24);
  });

  it("trata segmento nulo e pivô dentro de geometria sem NaN ou salto", () => {
    const p = { x: 0, y: 1.5, z: 0 };
    expect(resolveBoom(p, p, []).distance).toBe(0);
    const inside = { x: 0, y: 1.5, z: 3 };
    const result = resolveBoom(inside, { x: 4, y: 2, z: 8 }, [trunk]);
    expect(result.startedInside).toBe(true);
    expect(result.position).toEqual(inside);
    expect(result.distance).toBe(0);
  });

  it("gera volumes finitos para os troncos/copas e rochas que existem no mapa", () => {
    const volumes = createCameraVolumes();
    expect(volumes).toHaveLength(treeList().length * 3 + rockList().length);
    const tree = treeList()[0]!;
    const floor = heightAt(tree.x, tree.z);
    const first = resolveBoom({ x: tree.x - 3, y: floor + 1.5, z: tree.z }, { x: tree.x + 3, y: floor + 1.5, z: tree.z }, volumes, heightAt);
    expect(first.blocked).toBe(true);
    expect(first.position.x).toBeLessThan(tree.x);
    for (const v of volumes) expect(Object.values(v.center).every(Number.isFinite)).toBe(true);
  });

  it("relimita pitch ao mudar de primeira para terceira pessoa", () => {
    expect(clampCameraPitch(-0.8, "first")).toBe(-0.8);
    expect(clampCameraPitch(-0.8, "third")).toBe(0.12);
    expect(clampCameraPitch(9, "third")).toBe(1.15);
  });
});
