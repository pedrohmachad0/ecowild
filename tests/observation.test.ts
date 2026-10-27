import { describe, expect, it } from "vitest";
import { encounterNote, observationTarget } from "../src/game/camera/observation.ts";
import { createSim } from "../src/game/sim/simulation.ts";
import { BOND_RULES, bondReadiness, stepBond } from "../src/game/taming/bond.ts";
import { observationRange } from "../src/game/catalog/discoveries.ts";
import { interactionTarget } from "../src/game/sim/interaction.ts";

describe("encontros e instruções de vínculo", () => {
  it("não revela animal desconhecido, bloqueado ou distante; mantém alvo até sair do alcance", () => {
    const sim = createSim(null), auryn = sim.creatures.find(c => c.speciesId === "auryn")!;
    sim.creatures = [auryn]; auryn.x = sim.player.x; auryn.y = sim.player.y; auryn.z = sim.player.z + 3;
    expect(observationTarget(sim, null, () => true)).toBeNull();
    sim.discoveries.auryn = { seen: true, habitat: true, behavior: false, interacted: false };
    expect(observationTarget(sim, null, () => false)).toBeNull();
    expect(observationTarget(sim, null, () => true)?.id).toBe(auryn.id);
    auryn.z = sim.player.z + 10;
    expect(observationTarget(sim, null, () => true)).toBeNull();
    expect(observationTarget(sim, auryn.id, () => true)?.id).toBe(auryn.id);
    auryn.z = sim.player.z + 13;
    expect(observationTarget(sim, auryn.id, () => true)).toBeNull();
  });
  it("feedback pronto cumpre as regras reais; medo, pressa e observação incompleta recusam", () => {
    const ready = { trust: 58, observedSeconds: 3, dist: 2, sprinting: false, threatened: false, hasFruit: true, tamed: false };
    expect(bondReadiness(ready).ready).toBe(true);
    expect(stepBond({ ...ready, moving: false, offer: true, observed: true, socialAssist: false, dt: 0 }).consumed).toBe(true);
    for (const patch of [{ observedSeconds: 2.9 }, { trust: 57 }, { sprinting: true }, { threatened: true }, { hasFruit: false }, { dist: 2.4 }]) {
      expect(bondReadiness({ ...ready, ...patch }).ready).toBe(false);
    }
    const sim = createSim(null), auryn = sim.creatures.find(c => c.speciesId === "auryn")!;
    auryn.tamed = true; auryn.name = "Luz";
    expect(encounterNote(sim, auryn, true)).toMatchObject({ name: "Luz", ready: false, focused: true });
  });
  it("orienta aproximar antes de esperar observação ou confiança fora do alcance", () => {
    const p = { trust: 20, observedSeconds: 0, dist: 7, sprinting: false, threatened: false, hasFruit: true, tamed: false };
    for (const dist of [7, observationRange("auryn")]) expect(bondReadiness({ ...p, dist }).message).toContain("Aproxime-se");
    expect(bondReadiness({ ...p, dist: 5.3 }).message).toContain("Observe sem se mover");
    expect(bondReadiness({ ...p, observedSeconds: 3, dist: BOND_RULES.calmRange }).message).toContain("Aproxime-se");
    expect(bondReadiness({ ...p, observedSeconds: 3, dist: 5.3 }).message).toContain("Aguarde");
    const tick = { ...p, moving: false, offer: false, observed: true, socialAssist: false, dt: 1 };
    expect(stepBond({ ...tick, dist: BOND_RULES.calmRange }).trust).toBe(20);
    expect(stepBond({ ...tick, dist: 5.3 }).trust).toBeGreaterThan(20);
    const sim = createSim(null), rabbit = sim.creatures.find(c => c.speciesId === "rabbit")!;
    rabbit.x = sim.player.x; rabbit.z = sim.player.z + 7;
    expect(encounterNote(sim, rabbit, true).message).toContain("Aproxime-se");
    rabbit.z = sim.player.z + 4;
    expect(encounterNote(sim, rabbit, true).message).toContain("Fique parado");
  });
  it("não anuncia oferta quando a ação vai colher o fruto próximo", () => {
    const sim = createSim(null), auryn = sim.creatures.find(c => c.speciesId === "auryn")!;
    auryn.x = sim.player.x; auryn.z = sim.player.z + 2; auryn.trust = 58; auryn.observe = 3; auryn.fear = 0;
    sim.inventory.glowfruit = 1;
    sim.props[0].x = sim.player.x; sim.props[0].z = sim.player.z;
    expect(interactionTarget(sim).kind).toBe("collect");
    expect(encounterNote(sim, auryn, true)).toMatchObject({ ready: false, message: expect.stringContaining("Colha-o") });
    sim.props[0].taken = true;
    expect(interactionTarget(sim).kind).toBe("offer");
    expect(encounterNote(sim, auryn, true)).toMatchObject({ ready: true, message: expect.stringContaining("Interaja") });
  });
});
