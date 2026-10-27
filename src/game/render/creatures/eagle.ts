import type { Scene, TransformNode } from "@babylonjs/core";
import type { Rig } from "../rig.ts";
import { Sculpt } from "./sculpt.ts";
import type { Point } from "./sculpt.ts";

/** Golden eagle: brown plumage, a golden nape, broad fingered wings and hooked bill. */
export function buildEagle(scene: Scene, id: string): Rig {
  const s = new Sculpt(scene, id, "eagle"), rig = s.rig, body = rig.body!;
  const brown = "#684a32", dark = "#352a24", warm = "#92663b", gold = "#bd9455";
  s.loft(body, brown, [
    [0, 0, -.34, .065, .055], [0, -.01, -.21, .14, .13],
    [0, 0, .01, .18, .17], [0, .025, .21, .13, .145], [0, .06, .3, .075, .09],
  ], 10);
  s.ball(body, warm, [.23, .24, .31], [0, -.075, .09]);
  // Small overlapping back coverts follow the body rather than a white saddle.
  for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
    s.ball(body, i === 0 ? warm : brown, [.105, .075, .23], [side * (.065 + i * .016), .135 - i * .018, .08 - i * .095], [.13, side * .15, 0]);
  }

  const head = s.joint("head", body, [0, .095, .28]); rig.head = head;
  s.ball(head, gold, [.225, .23, .21], [0, .005, -.025]);
  s.ball(head, brown, [.215, .205, .235], [0, .025, .065]);
  // Golden neck plumes remain visible behind the darker crown from either side.
  for (const side of [-1, 1]) {
    s.ball(head, gold, [.055, .13, .2], [side * .078, -.005, -.09], [.3, side * .24, 0]);
    s.eye(head, side, .102, .055, .13, .052, "#c99335");
    s.ball(head, "#70512d", [.052, .032, .13], [side * .095, .095, .095], [0, side * .12, side * -.1]);
  }
  s.loft(head, "#c4a15e", [[0, .015, .15, .07, .055], [0, .01, .205, .052, .042], [0, -.005, .23, .035, .032]], 8);
  // A bent, dark terminal hook, not a straight cone.
  s.loft(head, "#343c3c", [
    [0, .013, .215, .048, .041], [0, .005, .265, .034, .036],
    [0, -.018, .293, .025, .035], [0, -.047, .302, .007, .014],
  ], 8);

  const feather = (parent: TransformNode, color: string, position: Point, length: number, width: number, yaw: number) => {
    const mesh = s.loft(parent, color, [
      [0, 0, 0, width * .32, .022], [0, 0, length * .24, width * .55, .019],
      [0, -.008, length * .76, width * .43, .012], [0, -.018, length, .008, .004],
    ], 6);
    mesh.position.set(...position); mesh.rotation.y = yaw;
  };
  for (const side of [-1, 1]) {
    const wing = s.joint(side < 0 ? "wing-left" : "wing-right", body, [side * .13, .045, .015]);
    rig.wings.push(wing);
    // Broad shoulder/elbow with cambered sections; six long primaries open into fingers.
    const cover = s.loft(wing, brown, [
      [0, 0, 0, .2, .065], [0, .015, .24, .26, .045],
      [0, .01, .5, .24, .03], [0, -.01, .66, .12, .018],
    ], 8);
    cover.rotation.y = side * Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const angle = 1.19 + i * .15;
      const length = .55 - Math.abs(i - 2.2) * .045;
      feather(wing, i % 2 ? dark : "#46342b", [side * (.55 + i * .035), -.005, .21 - i * .085], length, .115, side * angle);
    }
    // Secondaries form a scalloped trailing edge close to the body.
    for (let i = 0; i < 5; i++) {
      feather(wing, i % 2 ? "#765037" : "#51382a", [side * (.1 + i * .11), -.018, -.11], .33 - i * .018, .11, side * (2.85 - i * .1));
    }
    for (let i = 0; i < 5; i++) {
      feather(wing, i % 2 ? warm : "#a17947", [side * (.17 + i * .09), .05, .04], .23, .1, side * 1.74);
    }
  }

  const tail = s.joint("tail", body, [0, -.015, -.27]); rig.tail = tail;
  for (let i = -2; i <= 2; i++) {
    feather(tail, i % 2 ? "#47342b" : "#725039", [i * .033, 0, 0], .34 - Math.abs(i) * .022, .085, Math.PI + i * .14);
  }
  // Feathered thighs and tucked feet, readable from a low camera without dangling legs.
  for (const side of [-1, 1]) {
    s.ball(body, brown, [.105, .17, .15], [side * .1, -.15, -.095], [-.35, 0, 0]);
    s.ball(body, "#c5a35b", [.047, .055, .13], [side * .105, -.23, -.13], [.3, 0, 0]);
    for (let toe = -1; toe <= 1; toe++) {
      s.ball(body, "#b38c42", [.024, .026, .09], [side * .105 + toe * .025, -.248, -.09]);
      s.cone(body, "#2a302d", .024, .045, [side * .105 + toe * .025, -.258, -.04], [-Math.PI / 2.3, 0, 0]);
    }
  }
  return s.finish();
}
