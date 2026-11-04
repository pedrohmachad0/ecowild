import type { Scene } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import { Sculpt } from "./sculpt.ts";

/** Jacaré-do-pantanal: low armoured body, rows of dorsal scutes, broad snout and a long keeled tail. */
export function buildCaiman(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "caiman"), b = s.rig.body!;
  const hide = "#4a4a32", scute = "#34331f", belly = "#c9c09a";
  s.loft(b, hide, [[0, .12, -.4, .09, .07], [0, .15, -.25, .2, .1], [0, .16, .05, .22, .11], [0, .15, .3, .16, .09]], 10);
  s.ball(b, belly, [.34, .06, .7], [0, .07, -.05]);
  for (const z of [-.3, -.18, -.06, .06, .18]) for (const x of [-.07, .07]) s.cone(b, scute, .06, .07, [x, .25, z]);
  const head = s.joint("head", b, [0, .15, .32]); s.rig.head = head;
  s.loft(head, hide, [[0, 0, -.02, .12, .07], [0, -.01, .15, .09, .05], [0, -.02, .34, .07, .035]], 8);
  s.ball(head, belly, [.13, .025, .3], [0, -.04, .17]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .055, .06, .06, .035, "#c8a23a");
    s.ball(head, scute, [.04, .03, .04], [side * .03, .04, .34]);
  }
  const tail = s.joint("tail", b, [0, .13, -.4]); s.rig.tail = tail;
  s.loft(tail, hide, [[0, 0, 0, .09, .07], [0, -.01, -.3, .06, .05], [0, -.03, -.6, .03, .03], [0, -.04, -.85, .006, .006]], 8);
  for (const z of [-.12, -.28, -.44, -.6]) s.cone(tail, scute, .05 + z * .04, .07, [0, .06 + z * .04, z]);
  for (const z of [.2, -.24]) for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${z}-${side}`, b, [side * .19, .11, z]); s.rig.legs.push(leg);
    s.ball(leg, hide, [.12, .05, .06], [side * .05, -.03, 0], [0, 0, side * .5]);
    s.ball(leg, hide, [.05, .08, .05], [side * .09, -.06, 0]);
    s.ball(leg, scute, [.09, .03, .1], [side * .1, -.095, .02]);
  }
  return s.finish();
}

/** Tuiuiú: white body, bare black head and neck, red collar, heavy black bill and long black legs. */
export function buildJabiru(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "jabiru"), b = s.rig.body!;
  const white = "#eeeae0", black = "#1c1c1c", red = "#c3302a";
  s.loft(b, white, [[0, .82, -.3, .08, .08], [0, .86, -.15, .2, .2], [0, .88, .05, .2, .21], [0, .92, .18, .12, .14]], 12);
  for (const side of [-1, 1]) s.ball(b, "#f6f3ec", [.07, .26, .46], [side * .17, .9, -.04], [0, 0, side * .08]);
  s.ball(b, white, [.14, .06, .3], [0, .86, -.36], [.2, 0, 0]);
  const neck = s.joint("head", b, [0, 1, .2]); s.rig.head = neck;
  s.loft(neck, red, [[0, 0, 0, .1, .1], [0, .05, .02, .085, .085]], 10);
  s.loft(neck, black, [[0, .05, .02, .07, .07], [0, .28, .06, .055, .055], [0, .42, .08, .07, .075]], 8);
  s.cone(neck, black, .09, .44, [0, .4, .3], [Math.PI / 2 - .12, 0, 0]);
  for (const side of [-1, 1]) s.eye(neck, side, .05, .45, .1, .025, "#3a2a1a");
  for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${side}`, b, [side * .07, .78, .02]); s.rig.legs.push(leg);
    s.ball(leg, white, [.09, .14, .1], [0, -.06, 0]);
    s.ball(leg, black, [.035, .7, .035], [0, -.43, 0]);
    s.ball(leg, black, [.06, .03, .16], [0, -.765, .05]);
  }
  return s.finish();
}
