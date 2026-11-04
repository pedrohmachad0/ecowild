import type { Scene, TransformNode } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import { Sculpt } from "./sculpt.ts";

/** Four short legs whose feet touch y = 0 (the root sits on the ground). */
function stubLegs(s: Sculpt, coat: string, foot: string, height: number, width: number, front: number, back: number, size = 0.07, splay = 0): void {
  for (const z of [front, back]) for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${z}-${side}`, s.rig.body!, [side * width, height, z]);
    s.rig.legs.push(leg);
    s.ball(leg, coat, [size, height * 0.95, size], [side * splay, -height * 0.45, 0]);
    s.ball(leg, foot, [size * 1.25, 0.04, size * 1.5], [side * splay * 1.6, -height + 0.02, size * 0.2]);
  }
}

/** Tatu-galinha: banded carapace, long snout, upright ears and a tapering armoured tail. */
export function buildArmadillo(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "armadillo"), b = s.rig.body!;
  const shell = "#8e7d66", band = "#b5a284", skin = "#c9a98c", dark = "#5d5142";
  s.loft(b, shell, [[0, .17, -.30, .08, .07], [0, .22, -.22, .17, .15], [0, .24, 0, .19, .17], [0, .23, .18, .17, .15], [0, .19, .27, .10, .09]], 12);
  for (const z of [-.12, -.06, 0, .06, .12]) s.loft(b, band, [[0, .24, z - .012, .195, .175], [0, .245, z + .012, .195, .175]], 12);
  s.ball(b, skin, [.26, .08, .42], [0, .09, 0]);
  const head = s.joint("head", b, [0, .2, .27]); s.rig.head = head;
  s.loft(head, shell, [[0, 0, -.03, .08, .07], [0, -.01, .06, .065, .055], [0, -.03, .17, .025, .022]], 8);
  s.ball(head, "#3a2f27", [.03, .025, .02], [0, -.03, .18]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .045, .02, .05, .022, "#2a2018");
    const ear = s.joint(`ear-${side}`, head, [side * .05, .06, -.02]); s.rig.ears!.push(ear);
    s.ball(ear, skin, [.035, .09, .02], [0, .04, 0], [0, 0, -side * .3]);
  }
  const tail = s.joint("tail", b, [0, .17, -.29]); s.rig.tail = tail;
  s.loft(tail, band, [[0, 0, 0, .045, .045], [0, -.03, -.16, .025, .025], [0, -.07, -.32, .006, .006]], 7);
  stubLegs(s, dark, dark, .12, .12, .15, -.17, .07);
  return s.finish();
}

/** Sapo-cururu: squat warty body, raised parotoid glands, golden eyes and folded hind legs. */
export function buildToad(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "toad"), b = s.rig.body!;
  const skin = "#8a6c43", warts = "#6d5232", belly = "#d8c79e";
  s.ball(b, skin, [.30, .17, .32], [0, .13, -.01]);
  s.ball(b, belly, [.24, .08, .26], [0, .07, .01]);
  for (const [x, z] of [[-.08, -.08], [.09, -.05], [-.04, .04], [.06, .07], [0, -.12], [-.1, .02], [.11, -.11]] as const) s.ball(b, warts, [.035, .025, .035], [x, .21, z]);
  const head = s.joint("head", b, [0, .15, .14]); s.rig.head = head;
  s.ball(head, skin, [.24, .11, .16], [0, 0, .02]);
  s.ball(head, belly, [.17, .03, .1], [0, -.05, .06]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .065, .055, .03, .045, "#c99a2e");
    s.ball(head, "#7b5a34", [.06, .04, .09], [side * .085, .05, -.05]);
  }
  for (const side of [-1, 1]) {
    const hind = s.joint(`hind-${side}`, b, [side * .13, .07, -.1]); s.rig.legs.push(hind);
    s.ball(hind, skin, [.12, .09, .16], [0, 0, 0]);
    s.ball(hind, warts, [.09, .03, .13], [side * .02, -.055, .07]);
    const fore = s.joint(`fore-${side}`, b, [side * .11, .08, .1]); s.rig.legs.push(fore);
    s.ball(fore, skin, [.05, .09, .05], [0, -.03, 0]);
    s.ball(fore, warts, [.07, .025, .08], [side * .01, -.068, .02]);
  }
  return s.finish();
}

/** Lambari: small silver fish with a dark caudal spot and a red-tinged tail. */
export function buildFish(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "fish"), b = s.rig.body!;
  const silver = "#c4ccc8", back = "#7d8f86";
  s.loft(b, silver, [[0, 0, -.11, .012, .03], [0, 0, -.06, .03, .05], [0, .005, .03, .035, .058], [0, 0, .1, .022, .038], [0, -.003, .14, .006, .012]], 8);
  s.loft(b, back, [[0, .035, -.07, .012, .012], [0, .045, .02, .02, .014], [0, .03, .1, .01, .008]], 6);
  s.ball(b, "#262a28", [.012, .018, .018], [0, 0, -.085]);
  s.ball(b, "#d8a14a", [.006, .02, .03], [0, .06, .01]);
  for (const side of [-1, 1]) s.eye(b, side, .022, .012, .1, .016, "#d0b060");
  const tail = s.joint("tail", b, [0, 0, -.11]); s.rig.tail = tail;
  s.ball(tail, "#c46a4a", [.006, .08, .06], [0, .02, -.035], [.5, 0, 0]);
  s.ball(tail, "#c46a4a", [.006, .08, .06], [0, -.02, -.035], [-.5, 0, 0]);
  return s.finish();
}

/** Teiú: long black-and-white banded lizard with a pointed head and long tail. */
export function buildTegu(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "tegu"), b = s.rig.body!;
  const black = "#2c2b27", white = "#ddd6c2", belly = "#cfc6ac";
  s.loft(b, black, [[0, .1, -.26, .06, .05], [0, .12, -.16, .13, .08], [0, .13, .04, .14, .085], [0, .12, .2, .09, .065]], 10);
  s.ball(b, belly, [.24, .05, .42], [0, .065, -.03]);
  for (const z of [-.15, -.07, .01, .09, .16]) for (const x of [-.07, 0, .07]) s.ball(b, white, [.045, .015, .03], [x, .2, z]);
  const head = s.joint("head", b, [0, .13, .22]); s.rig.head = head;
  s.loft(head, black, [[0, 0, -.02, .075, .06], [0, -.005, .07, .065, .045], [0, -.02, .16, .028, .02]], 8);
  s.ball(head, white, [.1, .02, .12], [0, -.035, .06]);
  for (const side of [-1, 1]) s.eye(head, side, .05, .02, .06, .024, "#4a3220");
  const tail = s.joint("tail", b, [0, .1, -.26]); s.rig.tail = tail;
  s.loft(tail, black, [[0, 0, 0, .055, .045], [0, -.03, -.22, .035, .03], [0, -.05, -.45, .018, .016], [0, -.06, -.62, .004, .004]], 8);
  for (const z of [-.08, -.2, -.32, -.44]) s.ball(tail, white, [.07 - z * -.05, .02, .03], [0, -.01 + z * .1, z]);
  // Lizards sprawl: legs reach out to the side before touching the ground.
  for (const z of [.12, -.17]) for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${z}-${side}`, b, [side * .12, .1, z]); s.rig.legs.push(leg);
    s.ball(leg, black, [.12, .05, .05], [side * .05, -.03, 0], [0, 0, side * .5]);
    s.ball(leg, black, [.04, .08, .04], [side * .1, -.06, 0]);
    s.ball(leg, white, [.07, .03, .08], [side * .11, -.085, .02]);
  }
  return s.finish();
}

/** Musgarim: original creature, round mossy body, leaf ears and glowing moss on its back. */
export function buildMosslight(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "mosslight"), b = s.rig.body!;
  const fur = "#566f3f", deep = "#3b4f2c", cream = "#e6dcb8", bark = "#6b5136";
  s.loft(b, fur, [[0, .22, -.2, .1, .1], [0, .26, -.1, .19, .18], [0, .27, .05, .2, .19], [0, .27, .16, .14, .15]], 12);
  s.ball(b, cream, [.22, .16, .2], [0, .21, .12]);
  const lumen = s.joint("lumen", b, [0, .43, -.02]); s.rig.lumen = lumen;
  for (const [x, z, r] of [[0, 0, .1], [-.08, -.08, .06], [.08, -.07, .06], [.06, .07, .05], [-.06, .06, .045]] as const) {
    s.ball(lumen, deep, [r * 1.4, r * .55, r * 1.4], [x, -.02, z]);
    s.ball(lumen, "#a8f5c4", [r, r * .5, r], [x, .01, z], [0, 0, 0], true);
  }
  const head = s.joint("head", b, [0, .36, .2]); s.rig.head = head;
  s.ball(head, fur, [.24, .2, .2], [0, 0, 0]);
  s.ball(head, cream, [.14, .08, .08], [0, -.05, .09]);
  s.ball(head, "#2a2a22", [.04, .03, .03], [0, -.02, .135]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .07, .03, .07, .055, "#7fd8a8");
    const ear = s.joint(`ear-${side}`, head, [side * .1, .08, -.02]); s.rig.ears!.push(ear);
    s.ball(ear, deep, [.05, .16, .025], [side * .03, .07, 0], [0, 0, -side * .55]);
    s.ball(ear, "#7fae5a", [.03, .11, .02], [side * .035, .07, .008], [0, 0, -side * .55]);
  }
  const tail = s.joint("tail", b, [0, .27, -.2]); s.rig.tail = tail;
  s.ball(tail, fur, [.16, .14, .22], [0, .05, -.08], [-.5, 0, 0]);
  s.ball(tail, "#a8f5c4", [.06, .05, .06], [0, .12, -.15], [0, 0, 0], true);
  stubLegs(s, bark, deep, .16, .1, .1, -.12, .075);
  return s.finish();
}

export type SmallFaunaJoint = TransformNode;
