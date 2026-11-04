import type { Scene } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import { Sculpt } from "./sculpt.ts";

/** Morcego-de-cauda-curta: small furry body, big ears, leaf-shaped nose and membrane wings. */
export function buildBat(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "bat"), b = s.rig.body!;
  const fur = "#6a5040", membrane = "#3a2a24", face = "#8a6a56";
  s.ball(b, fur, [.16, .14, .24], [0, 0, 0]);
  const head = s.joint("head", b, [0, .03, .13]); s.rig.head = head;
  s.ball(head, face, [.11, .1, .1], [0, 0, .02]);
  s.cone(head, face, .04, .05, [0, .03, .08], [-.3, 0, 0]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .035, .02, .06, .02, "#1a1210");
    const ear = s.joint(`ear-${side}`, head, [side * .04, .05, 0]); s.rig.ears!.push(ear);
    s.ball(ear, membrane, [.04, .09, .02], [side * .01, .04, 0], [0, 0, -side * .3]);
  }
  for (const side of [-1, 1]) {
    const wing = s.joint(side < 0 ? "wing-left" : "wing-right", b, [side * .07, .02, 0]);
    s.rig.wings.push(wing);
    s.ball(wing, membrane, [.36, .02, .22], [side * .2, 0, -.02]);
    s.ball(wing, membrane, [.22, .015, .16], [side * .38, -.01, -.06]);
    for (const k of [0.15, 0.3, 0.45]) s.ball(wing, fur, [.012, .012, .2], [side * k, .01, -.02], [0, side * (k - .25), 0]);
  }
  return s.finish();
}

/** Grilo-de-caverna: pale, humped body, very long antennae and long jumping hind legs. */
export function buildCaveCricket(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "cavecricket"), b = s.rig.body!;
  const shell = "#b89a76", dark = "#7a5f44";
  s.loft(b, shell, [[0, .05, -.06, .02, .02], [0, .07, -.02, .035, .035], [0, .07, .03, .03, .03], [0, .06, .06, .02, .02]], 8);
  const head = s.joint("head", b, [0, .06, .07]); s.rig.head = head;
  s.ball(head, shell, [.035, .035, .03], [0, 0, 0]);
  for (const side of [-1, 1]) {
    s.ball(head, "#2a2018", [.01, .01, .01], [side * .015, .008, .012]);
    // Antennae longer than the body: the main sense in the dark.
    s.ball(head, dark, [.004, .004, .26], [side * .03, .05, .11], [-.35, side * .2, 0]);
  }
  for (const [z, len] of [[.03, .05], [0, .05], [-.03, .07]] as const) for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${z}-${side}`, b, [side * .025, .05, z]); s.rig.legs.push(leg);
    s.ball(leg, dark, [.008, len, .008], [side * .02, -len * .45, 0], [0, 0, side * .5]);
    s.ball(leg, dark, [.012, .006, .016], [side * .035, -.047, 0]);
  }
  return s.finish();
}

/** Bagre-cego: depigmented pinkish catfish, no visible eyes, long barbels. */
export function buildCaveFish(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "cavefish"), b = s.rig.body!;
  const pale = "#ead2c8", pink = "#d9a9a0";
  s.loft(b, pale, [[0, 0, -.1, .01, .015], [0, 0, -.05, .022, .025], [0, 0, .03, .028, .026], [0, -.003, .09, .022, .018], [0, -.005, .11, .01, .008]], 8);
  s.ball(b, pink, [.04, .01, .05], [0, -.018, .06]);
  for (const side of [-1, 1]) for (const k of [0, 1]) s.ball(b, pink, [.003, .003, .06], [side * (.012 + k * .008), -.006, .14], [k * .2, side * .35, 0]);
  const tail = s.joint("tail", b, [0, 0, -.1]); s.rig.tail = tail;
  s.ball(tail, pink, [.006, .05, .04], [0, 0, -.02]);
  return s.finish();
}
