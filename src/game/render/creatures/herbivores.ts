import type { Scene } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import { Sculpt } from "./sculpt.ts";

/** The wide muzzle, high nostrils and low barrel silhouette identify a capybara. */
export function buildCapybara(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "capybara"), b = s.rig.body!;
  const coat = "#947047", warm = "#aa8254", shade = "#765536", sand = "#c1a176";
  s.loft(b, coat, [
    [0, .48, -.68, .20, .23], [0, .52, -.47, .40, .32],
    [0, .53, -.13, .46, .34], [0, .52, .22, .43, .31],
    [0, .55, .48, .29, .25], [0, .58, .59, .20, .18],
  ], 12);
  // A subtle warm saddle makes the back readable in the forest's green light.
  s.loft(b, warm, [
    [0, .75, -.45, .12, .055], [0, .83, -.12, .25, .045],
    [0, .78, .27, .20, .045], [0, .70, .43, .08, .025],
  ], 8);
  const h = s.joint("head", b, [0, .59, .47]); s.rig.head = h;
  s.loft(h, warm, [
    [0, .03, -.15, .19, .21], [0, .07, .03, .27, .25],
    [0, .04, .28, .29, .22], [0, -.01, .51, .27, .18],
    [0, -.015, .58, .21, .15],
  ], 10);
  s.loft(h, sand, [[0, -.10, .26, .20, .11], [0, -.12, .49, .25, .095], [0, -.11, .585, .20, .07]], 8);
  s.ball(h, shade, [.26, .022, .06], [0, -.105, .588]);
  for (const side of [-1, 1]) {
    s.eye(h, side, .244, .175, .25, .064, "#503622");
    // Nostrils sit above the broad snout, away from the mouth seam.
    s.ball(h, "#4b3929", [.06, .03, .04], [side * .125, .105, .52]);
    const ear = s.joint(`ear-${side}`, h, [side * .225, .255, -.035]);
    s.rig.ears!.push(ear);
    s.ball(ear, coat, [.16, .17, .09], [0, .045, 0], [0, 0, -side * .17]);
    s.ball(ear, "#71503a", [.095, .105, .035], [0, .045, .04], [0, 0, -side * .17]);
  }
  for (const z of [.32, -.43]) for (const side of [-1, 1]) {
    const leg = s.joint(`leg-${z}-${side}`, b, [side * .28, .36, z]);
    s.rig.legs.push(leg);
    s.ball(leg, shade, [.22, .40, .24], [0, -.135, 0], [-.08, 0, 0]);
    s.ball(leg, coat, [.25, .15, .34], [0, -.285, .06]);
    for (let toe = -1; toe <= 1; toe++) {
      s.ball(leg, "#68503a", [.052, .045, .085], [toe * .072, -.335, .18]);
    }
  }
  return s.finish();
}

/** A tapiti has a compact woodland silhouette, powerful haunches and modest ears. */
export function buildRabbit(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "rabbit"), b = s.rig.body!;
  const fur = "#9c7957", tawny = "#b18b65", dark = "#72553c", cream = "#e4ceb0";
  s.loft(b, fur, [
    [0, .27, -.38, .08, .14], [0, .32, -.27, .24, .25],
    [0, .33, -.05, .23, .24], [0, .35, .17, .16, .19],
    [0, .39, .28, .115, .13],
  ], 10);
  s.ball(b, cream, [.22, .24, .19], [0, .34, .185]);
  const head = s.joint("head", b, [0, .43, .235]); s.rig.head = head;
  s.loft(head, tawny, [
    [0, .035, -.11, .10, .13], [0, .06, .015, .16, .16],
    [0, .03, .14, .12, .11], [0, -.01, .23, .055, .05],
  ], 10);
  for (const side of [-1, 1]) {
    s.ball(head, cream, [.105, .075, .095], [side * .048, -.018, .185]);
    s.eye(head, side, .124, .09, .075, .078, "#462f25");
    // Low cheeks and brows soften the expression without giving the animal a human face.
    s.ball(head, dark, [.08, .022, .115], [side * .13, .142, .055], [0, side * .1, side * .12]);
    const ear = s.joint(`ear-${side}`, head, [side * .075, .18, -.025]);
    ear.rotation.z = -side * .13; ear.rotation.x = -.09;
    s.rig.ears!.push(ear);
    s.ball(ear, fur, [.11, .285, .07], [0, .115, 0]);
    s.ball(ear, "#bb9783", [.059, .218, .023], [0, .12, .031]);
    s.ball(ear, dark, [.075, .055, .052], [0, .245, 0]);
  }
  s.ball(head, "#705044", [.055, .035, .035], [0, .018, .242]);
  s.ball(head, dark, [.012, .045, .014], [0, -.012, .237]);
  // Front feet swing separately; hind legs carry the folded haunch and long foot.
  for (const side of [-1, 1]) {
    const front = s.joint(`front-${side}`, b, [side * .102, .27, .16]);
    s.rig.legs.push(front);
    s.ball(front, tawny, [.09, .245, .105], [0, -.10, 0], [.12, 0, 0]);
    s.ball(front, cream, [.105, .07, .19], [0, -.225, .05]);
  }
  for (const side of [-1, 1]) {
    const hind = s.joint(`hind-${side}`, b, [side * .17, .29, -.23]);
    s.rig.legs.push(hind);
    s.ball(hind, tawny, [.19, .34, .29], [0, -.07, .005], [-.2, 0, 0]);
    s.ball(hind, cream, [.15, .09, .33], [0, -.245, .08]);
  }
  const tail = s.joint("tail", b, [0, .29, -.365]); s.rig.tail = tail;
  s.ball(tail, fur, [.16, .15, .15], [0, .025, -.035]);
  s.ball(tail, cream, [.12, .09, .105], [0, -.005, -.07]);
  return s.finish();
}
