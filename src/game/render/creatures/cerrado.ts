import type { Scene } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import { Sculpt } from "./sculpt.ts";

/** Upright leg made of thigh, shin and foot; the foot sole touches y = 0. */
function longLeg(s: Sculpt, name: string, x: number, z: number, height: number, upper: string, lower: string, foot: string, width: number): void {
  const leg = s.joint(name, s.rig.body!, [x, height, z]);
  s.rig.legs.push(leg);
  s.ball(leg, upper, [width * 1.5, height * 0.5, width * 1.6], [0, -height * 0.2, 0]);
  s.ball(leg, lower, [width, height * 0.62, width], [0, -height * 0.62, 0]);
  s.ball(leg, foot, [width * 1.3, 0.05, width * 1.9], [0, -height + 0.025, width * 0.4]);
}

/** Tamanduá-bandeira: tubular snout, diagonal black-and-white shoulder band, huge fan tail. */
export function buildAnteater(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "anteater"), b = s.rig.body!;
  const coat = "#6e5a48", grey = "#9a8f80", black = "#24201c", white = "#e9e2d0";
  s.loft(b, coat, [[0, .52, -.55, .12, .14], [0, .58, -.35, .25, .27], [0, .6, 0, .27, .3], [0, .58, .28, .22, .26], [0, .55, .45, .14, .17]], 12);
  s.loft(b, grey, [[0, .74, .05, .16, .07], [0, .8, .3, .14, .06], [0, .72, .46, .08, .04]], 8);
  // The signature band: black stripe edged in white running from chest to shoulders.
  for (const side of [-1, 1]) {
    s.loft(b, black, [[side * .1, .42, .38, .06, .05], [side * .2, .6, .18, .07, .05], [side * .18, .76, -.1, .06, .04]], 6);
    s.loft(b, white, [[side * .13, .5, .43, .03, .03], [side * .23, .67, .2, .035, .03], [side * .2, .82, -.06, .03, .025]], 6);
  }
  const head = s.joint("head", b, [0, .6, .48]); s.rig.head = head;
  s.loft(head, grey, [[0, 0, -.05, .1, .11], [0, -.03, .15, .07, .07], [0, -.07, .38, .045, .045], [0, -.1, .55, .03, .03]], 8);
  s.ball(head, black, [.035, .03, .03], [0, -.1, .56]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .065, .02, .04, .025, "#1c1612");
    s.ball(head, grey, [.05, .06, .03], [side * .07, .08, -.04]);
  }
  const tail = s.joint("tail", b, [0, .58, -.55]); s.rig.tail = tail;
  s.ball(tail, coat, [.12, .5, .6], [0, .08, -.3], [-.6, 0, 0]);
  s.ball(tail, grey, [.08, .38, .5], [0, .18, -.36], [-.6, 0, 0]);
  // Walks on its knuckles to protect the long front claws.
  for (const [z, front] of [[.28, true], [-.36, false]] as const) for (const side of [-1, 1]) {
    longLeg(s, `leg-${front ? "f" : "h"}-${side}`, side * .17, z, .44, front ? white : coat, front ? black : coat, black, .1);
    if (front) for (const toe of [-1, 1]) s.cone(s.rig.legs.at(-1)!, "#d9cdb4", .03, .1, [toe * .03, -.42, .09], [1.4, 0, 0]);
  }
  return s.finish();
}

/** Seriema: long red legs, grey-brown plumage, tuft crest above the red beak, long tail. */
export function buildSeriema(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "seriema"), b = s.rig.body!;
  const plume = "#a89a80", dark = "#6e6250", pale = "#e6dcc4", red = "#d0412c";
  s.loft(b, plume, [[0, .6, -.22, .06, .07], [0, .64, -.1, .14, .15], [0, .66, .06, .14, .16], [0, .7, .16, .08, .1]], 10);
  s.ball(b, pale, [.18, .2, .16], [0, .58, .1]);
  for (const side of [-1, 1]) s.ball(b, dark, [.05, .2, .3], [side * .13, .66, -.02], [0, 0, side * .1]);
  const tail = s.joint("tail", b, [0, .64, -.22]); s.rig.tail = tail;
  s.ball(tail, dark, [.12, .05, .38], [0, -.02, -.18], [.15, 0, 0]);
  const head = s.joint("head", b, [0, .78, .2]); s.rig.head = head;
  s.loft(head, plume, [[0, -.08, -.02, .045, .045], [0, .05, .02, .05, .05], [0, .16, .05, .06, .06]], 8);
  s.ball(head, plume, [.12, .11, .13], [0, .2, .07]);
  s.cone(head, red, .05, .12, [0, .19, .18], [Math.PI / 2, 0, 0]);
  for (const i of [-1, 0, 1]) s.ball(head, dark, [.015, .09, .015], [i * .015, .3, .14], [.4, 0, 0]);
  for (const side of [-1, 1]) s.eye(head, side, .05, .21, .1, .028, "#d8b04a");
  for (const side of [-1, 1]) longLeg(s, `leg-${side}`, side * .06, .02, .56, plume, red, red, .045);
  return s.finish();
}

/** Lobo-guará: very long black legs, red coat, black mane, large ears, white throat and tail tip. */
export function buildManedWolf(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "manedwolf"), b = s.rig.body!;
  const red = "#c9632f", deep = "#a84a22", black = "#1e1a17", white = "#efe6d6";
  s.loft(b, red, [[0, .8, -.42, .1, .12], [0, .84, -.25, .17, .19], [0, .86, .05, .17, .2], [0, .9, .3, .16, .21], [0, .95, .42, .11, .15]], 12);
  s.loft(b, black, [[0, 1.02, .02, .07, .05], [0, 1.08, .28, .11, .08], [0, 1.1, .44, .07, .05]], 8);
  s.ball(b, white, [.14, .22, .12], [0, .88, .44]);
  const head = s.joint("head", b, [0, 1.06, .5]); s.rig.head = head;
  s.loft(head, red, [[0, 0, -.06, .1, .1], [0, 0, .08, .12, .11], [0, -.04, .22, .06, .06], [0, -.06, .32, .035, .035]], 10);
  s.ball(head, black, [.05, .04, .04], [0, -.06, .33]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .07, .04, .12, .03, "#c99a2e");
    const ear = s.joint(`ear-${side}`, head, [side * .07, .1, 0]); s.rig.ears!.push(ear);
    s.cone(ear, red, .11, .22, [side * .02, .1, 0], [0, 0, -side * .2]);
    s.cone(ear, white, .06, .14, [side * .02, .08, .015], [0, 0, -side * .2]);
  }
  const tail = s.joint("tail", b, [0, .82, -.42]); s.rig.tail = tail;
  s.loft(tail, red, [[0, 0, 0, .06, .06], [0, -.15, -.15, .08, .08], [0, -.32, -.24, .06, .06]], 8);
  s.ball(tail, white, [.1, .12, .1], [0, -.36, -.26]);
  for (const [z, front] of [[.3, true], [-.32, false]] as const) for (const side of [-1, 1]) {
    longLeg(s, `leg-${front ? "f" : "h"}-${side}`, side * .1, z, .8, front ? red : deep, black, black, .07);
  }
  return s.finish();
}

/** Brasalume: original Cerrado creature, stocky body with amber plates that glow like cool embers. */
export function buildBrasalume(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "brasalume"), b = s.rig.body!;
  const hide = "#5a3a2a", belly = "#c9a27a";
  s.loft(b, hide, [[0, .2, -.22, .08, .08], [0, .24, -.1, .17, .15], [0, .25, .06, .17, .15], [0, .23, .17, .11, .11]], 12);
  s.ball(b, belly, [.2, .1, .3], [0, .14, 0]);
  const lumen = s.joint("lumen", b, [0, .38, -.02]); s.rig.lumen = lumen;
  for (const [z, w] of [[-.12, .14], [-.03, .18], [.06, .17], [.14, .12]] as const) {
    s.ball(lumen, "#3a241a", [w * 1.15, .05, .08], [0, -.01, z]);
    s.ball(lumen, "#ffb347", [w, .045, .065], [0, .01, z], [0, 0, 0], true);
  }
  const head = s.joint("head", b, [0, .27, .2]); s.rig.head = head;
  s.ball(head, hide, [.2, .15, .18], [0, 0, .02]);
  s.ball(head, belly, [.1, .06, .08], [0, -.04, .1]);
  s.ball(head, "#ffcf7a", [.03, .03, .03], [0, .08, .02], [0, 0, 0], true);
  for (const side of [-1, 1]) s.eye(head, side, .06, .03, .07, .05, "#ffcf7a");
  const tail = s.joint("tail", b, [0, .2, -.22]); s.rig.tail = tail;
  s.loft(tail, hide, [[0, 0, 0, .05, .05], [0, -.03, -.14, .03, .03], [0, -.06, -.24, .008, .008]], 7);
  s.ball(tail, "#ffb347", [.04, .04, .04], [0, -.05, -.22], [0, 0, 0], true);
  for (const z of [.1, -.14]) for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${z}-${side}`, b, [side * .11, .13, z]); s.rig.legs.push(leg);
    s.ball(leg, hide, [.08, .12, .08], [0, -.05, 0]);
    s.ball(leg, "#2e1e16", [.1, .04, .12], [0, -.11, .02]);
  }
  return s.finish();
}
