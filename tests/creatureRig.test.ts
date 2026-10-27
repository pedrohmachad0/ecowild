import { describe, expect, it } from "vitest";
import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { animateRig, buildCreature } from "../src/game/render/actors.ts";
import type { AiState, SpeciesId } from "../src/game/types.ts";

const species: SpeciesId[] = ["capybara", "rabbit", "wolf", "eagle", "auryn"];
describe("modelos articulados da fauna", () => {
  it("constrói corpos finitos, apoios no chão e materiais compartilhados", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
      for (const id of species) {
        const rig = buildCreature(scene, id, id);
        const meshes = rig.root.getChildMeshes();
        expect(meshes.length).toBeLessThanOrEqual(20);
        let low = Infinity, triangles = 0;
        for (const mesh of meshes) {
          mesh.computeWorldMatrix(true);
          const bounds = mesh.getBoundingInfo().boundingBox;
          expect(bounds.minimumWorld.asArray().every(Number.isFinite)).toBe(true);
          expect(bounds.maximumWorld.asArray().every(Number.isFinite)).toBe(true);
          low = Math.min(low, bounds.minimumWorld.y);
          triangles += mesh.getTotalIndices() / 3;
        }
        expect(triangles).toBeLessThan(8000);
        if (id !== "eagle") { expect(low).toBeGreaterThan(-.03); expect(low).toBeLessThan(.05); }
      }
      const before = scene.materials.length;
      for (const id of species) buildCreature(scene, `${id}-second`, id);
      expect(scene.materials.length).toBe(before);
    } finally { scene.dispose(); engine.dispose(); }
  });

  it("anima estados sem criar recursos ou mover a raiz da simulação", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
      const rigs = species.map(id => buildCreature(scene, id, id));
      for (const rig of rigs) rig.root.position.set(7, 2, -4);
      const before = [scene.meshes.length, scene.materials.length, scene.transformNodes.length];
      for (const state of ["REST", "DRINK", "FLEE", "FOLLOW_OWNER"] as AiState[]) {
        for (let frame = 0; frame < 120; frame++) for (const rig of rigs) {
          animateRig(rig, frame / 10, state === "FLEE", frame / 60, { state, dt: 1 / 60, fear: state === "FLEE" ? .9 : 0, tamed: state === "FOLLOW_OWNER" });
          expect(rig.root.position.equals(new Vector3(7, 2, -4))).toBe(true);
        }
      }
      expect([scene.meshes.length, scene.materials.length, scene.transformNodes.length]).toEqual(before);
      const auryn = rigs[4];
      for (let i = 0; i < 90; i++) animateRig(auryn, 0, false, i / 60, { state: "DRINK", dt: 1 / 60 });
      expect(auryn.head!.rotation.x).toBeGreaterThan(.5);
      for (let i = 0; i < 90; i++) animateRig(auryn, 0, false, i / 60, { state: "REST", dt: 1 / 60 });
      expect(auryn.body!.position.y).toBeLessThan(-.18);
    } finally { scene.dispose(); engine.dispose(); }
  });
});
