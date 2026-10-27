import type { Scene, TransformNode } from "@babylonjs/core";
import { Sculpt } from "./sculpt.ts";
import type { Rig } from "../rig.ts";

function ear(s: Sculpt, head: TransformNode, side: number, height: number, width: number, coat: string, lining: string, glow = false): void {
  const joint = s.joint(`ear-${side}`, head, [side * 0.13, 0.14, -0.025]);
  joint.rotation.z = -side * 0.16;
  s.loft(joint, coat, [[0, 0, 0, width * .50, .055], [side * .025, 0, height * .48, width * .43, .047], [side * .045, 0, height, .012, .008]], 8).rotation.x = -Math.PI / 2;
  s.loft(joint, lining, [[0, -.046, .045, width * .31, .015], [side * .025, -.04, height * .52, width * .27, .011], [side * .043, -.017, height * .85, .008, .005]], 8).rotation.x = -Math.PI / 2;
  if (glow) s.ball(joint, "#ffe3a1", [.025, .07, .025], [side * .037, height * .79, .035], [0, 0, -side * .14], true);
  s.rig.ears!.push(joint);
}

function paws(s: Sculpt, coat: string, dark: string, height: number, width: number, fore: number, hind: number): void {
  for (const [z, front] of [[fore, true], [hind, false]] as const) for (const side of [-1, 1]) {
    const joint = s.joint(`${front ? "fore" : "hind"}-leg-${side}`, s.rig.body!, [side * width, height, z]);
    s.ball(joint, coat, [front ? .17 : .23, height * .75, .22], [0, -height * .2, front ? -.01 : -.055], [.12, 0, 0]);
    s.ball(joint, dark, [.115, height * .70, .12], [0, -height * .62, front ? .012 : -.04], [-.08, 0, 0]);
    s.ball(joint, dark, [.175, .115, .25], [0, -height + .067, .055]);
    for (const toe of [-1, 0, 1]) s.ball(joint, "#d4cbb6", [.036, .036, .065], [toe * .047, -height + .053, .16]);
    s.rig.legs.push(joint);
  }
}

export function buildWolf(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "wolf"), b = s.rig.body!;
  // The raised shoulder and narrow waist create a wolf's silhouette before detail.
  s.loft(b, "#929b98", [[0, .58, -.62, .10, .15], [0, .61, -.45, .23, .27], [0, .63, -.08, .22, .28], [0, .67, .25, .27, .35], [0, .69, .46, .17, .29]], 12);
  s.loft(b, "#56676b", [[0, .78, -.47, .12, .08], [0, .84, -.10, .19, .09], [0, .91, .28, .19, .10], [0, .93, .40, .06, .02]], 10);
  s.ball(b, "#d9d6c4", [.34, .52, .35], [0, .61, .37], [.13, 0, 0]);
  for (const side of [-1, 1]) {
    s.loft(b, "#bdc3b8", [[side * .19, .74, .08, .055, .10], [side * .25, .83, .26, .095, .18], [side * .21, .86, .43, .065, .11]], 7);
    s.cone(b, "#b6bdb4", .12, .25, [side * .23, .66, .35], [0, 0, side * .65]);
  }
  const head = s.joint("head", b, [0, .82, .45]); s.rig.head = head;
  s.loft(head, "#abb4ad", [[0, .015, -.07, .14, .15], [0, .015, .08, .19, .19], [0, -.025, .21, .14, .13], [0, -.055, .39, .075, .065]], 10);
  s.loft(head, "#e5dfca", [[0, -.11, .09, .15, .065], [0, -.115, .25, .11, .05], [0, -.095, .41, .072, .038]], 8);
  s.ball(head, "#202f32", [.14, .09, .09], [0, -.045, .415]);
  s.ball(head, "#4a5e63", [.19, .035, .14], [0, .012, .235], [.1, 0, 0]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .144, .077, .13, .075, "#d9aa53");
    s.ball(head, "#596e72", [.13, .039, .12], [side * .128, .13, .12], [0, 0, -side * .20]);
    s.loft(head, "#ced0bd", [[side * .13, -.045, -.05, .035, .07], [side * .21, -.07, .04, .045, .09], [side * .13, -.07, .18, .035, .04]], 7);
    ear(s, head, side, .24, .18, "#687e80", "#c0a890");
  }
  paws(s, "#a0aaa3", "#6d7f7b", .55, .175, .30, -.39);
  const tail = s.joint("tail", b, [0, .67, -.53]); s.rig.tail = tail;
  s.loft(tail, "#697b7b", [[0, 0, 0, .09, .10], [0, -.09, -.24, .14, .15], [0, -.22, -.48, .13, .13], [0, -.27, -.66, .035, .04]], 10);
  s.loft(tail, "#394f56", [[0, -.23, -.48, .132, .12], [0, -.28, -.63, .055, .06], [0, -.27, -.70, .008, .01]], 10);
  return s.finish();
}

export function buildAuryn(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "auryn"), b = s.rig.body!;
  // A light fox-like body and sweeping leaf-plume tail distinguish the fantasy animal.
  s.loft(b, "#369f91", [[0, .43, -.43, .10, .13], [0, .46, -.28, .22, .21], [0, .49, .05, .19, .23], [0, .51, .27, .23, .26], [0, .54, .40, .13, .20]], 12);
  s.loft(b, "#207c78", [[0, .59, -.36, .11, .045], [0, .66, -.05, .155, .07], [0, .71, .27, .14, .07]], 10);
  s.ball(b, "#f0e4bd", [.36, .40, .30], [0, .46, .32], [.12, 0, 0]);
  for (const side of [-1, 1]) {
    s.cone(b, "#e3d9b1", .15, .25, [side * .15, .45, .35], [0, 0, side * .45]);
    s.ball(b, "#5fbca4", [.09, .13, .16], [side * .20, .55, .1], [0, 0, -side * .55]);
    s.ball(b, "#dfc77e", [.055, .07, .045], [side * .222, .56, .19]);
  }
  const head = s.joint("head", b, [0, .68, .36]); s.rig.head = head;
  s.loft(head, "#52b5a0", [[0, .01, -.07, .13, .13], [0, .025, .06, .19, .18], [0, -.005, .20, .14, .11], [0, -.035, .35, .055, .05]], 12);
  s.loft(head, "#fff0cd", [[0, -.075, .08, .145, .07], [0, -.075, .22, .105, .06], [0, -.06, .36, .052, .03]], 10);
  s.ball(head, "#203f44", [.095, .06, .075], [0, -.027, .36]);
  for (const side of [-1, 1]) {
    s.eye(head, side, .15, .068, .145, .092, "#f2c966");
    s.ball(head, "#166e70", [.13, .033, .10], [side * .139, .127, .135], [0, 0, -side * .15]);
    s.loft(head, "#f4e7c2", [[side * .125, -.025, -.04, .035, .065], [side * .23, -.04, .04, .045, .07], [side * .13, -.05, .18, .025, .035]], 7);
    ear(s, head, side, .40, .25, "#278e84", "#dfd5a8", true);
    s.ball(head, "#ffda8b", [.036, .035, .022], [side * .177, -.005, .205], [0, 0, 0], true);
  }
  const crest = s.joint("lumen-crest", head, [0, .16, .06]); s.rig.lumen = crest;
  const leaf = s.loft(crest, "#f6d68b", [[0, 0, 0, .055, .035], [0, -.015, .12, .075, .036], [0, -.04, .28, .008, .006]], 8, true); leaf.rotation.x = -Math.PI / 2;
  s.ball(head, "#dfb866", [.055, .08, .04], [0, .12, .20]);
  paws(s, "#3b9e8e", "#236d69", .38, .145, .20, -.28);
  const tail = s.joint("tail", b, [0, .51, -.37]); s.rig.tail = tail;
  s.loft(tail, "#2e9285", [[0, 0, 0, .08, .10], [.04, .04, -.20, .17, .18], [.10, .16, -.43, .24, .24], [.12, .27, -.64, .17, .20], [.09, .36, -.78, .04, .06]], 12);
  s.loft(tail, "#7bc5a5", [[.04, .12, -.28, .11, .12], [.10, .27, -.45, .19, .16], [.12, .40, -.63, .10, .13], [.09, .42, -.77, .025, .025]], 10);
  s.loft(tail, "#e8d6a0", [[.12, .28, -.63, .172, .19], [.10, .39, -.77, .07, .09], [.08, .43, -.85, .005, .008]], 10);
  s.ball(tail, "#ffe8ab", [.075, .12, .14], [.10, .40, -.78], [.5, 0, 0], true);
  return s.finish();
}
