import type { Rig, RigPose } from "../rig.ts";

/** Animation only changes local joints. World position and behavior belong to simulation. */
export function animateRig(rig: Rig, phase: number, moving: boolean, time: number, pose: RigPose = {}): void {
  if (!rig.species || !rig.body || !rig.rests || !rig.poseBlend) {
    const swing = Math.sin(phase) * (moving ? 0.55 : 0.02);
    rig.legs.forEach((joint, i) => { joint.rotation.x = i % 2 ? -swing : swing; });
    return;
  }
  const dt = Math.max(0, Math.min(pose.dt ?? 1 / 60, 0.1));
  const blend = 1 - Math.exp(-7 * dt), state = pose.state ?? "IDLE";
  const rest = state === "REST" ? 1 : 0;
  const feed = state === "DRINK" || state === "EAT" ? 1 : 0;
  const fear = Math.max(0, Math.min(1, pose.fear ?? 0));
  rig.poseBlend.rest += (rest - rig.poseBlend.rest) * blend;
  rig.poseBlend.feed += (feed - rig.poseBlend.feed) * blend;
  rig.poseBlend.fear += (fear - rig.poseBlend.fear) * blend;
  const r = rig.poseBlend.rest, f = rig.poseBlend.feed, scared = rig.poseBlend.fear;
  for (const [node, original] of rig.rests) {
    node.position.set(original.x, original.y, original.z);
    node.rotation.set(original.rx, original.ry, original.rz);
  }
  const body = rig.body, active = moving ? 1 - r : 0;
  const breathing = Math.sin(time * 2.1 + phase * 0.05);
  body.scaling.y = 1 + breathing * 0.009;
  if (rig.species === "eagle") {
    const chasing = state === "CHASE";
    // Long glides interrupted by short wing beats, not perpetual frantic flapping.
    const beat = chasing ? 1 : Math.max(0, Math.sin(time * 1.3)) ** 6;
    rig.wings.forEach((wing, i) => { wing.rotation.z += (i ? 1 : -1) * (0.08 + Math.sin(time * 6) * 0.48 * beat); });
    body.rotation.z = Math.sin(time * .7) * .09;
    body.rotation.x = chasing ? .14 : -.035;
    if (rig.tail) rig.tail.rotation.x += .08 + Math.sin(time * 1.4) * .035;
    if (rig.head) rig.head.rotation.y += Math.sin(time * .8) * .08;
    return;
  }
  const rabbit = rig.species === "rabbit", capybara = rig.species === "capybara";
  body.position.y -= r * (capybara ? .16 : rabbit ? .10 : .22);
  body.position.y += active * (rabbit ? Math.max(0, Math.sin(phase)) * .12 : Math.abs(Math.sin(phase)) * .018);
  body.rotation.x += active * (rabbit ? Math.sin(phase) * .10 : .012 * Math.sin(phase));
  rig.legs.forEach((leg, i) => {
    const stride = Math.sin(phase + (rabbit ? (i < 2 ? 0 : Math.PI) : (i === 0 || i === 3 ? 0 : Math.PI)));
    leg.rotation.x += stride * active * (capybara ? .24 : rabbit ? .55 : .43) + r * (i < 2 ? .95 : -.85);
  });
  if (rig.head) {
    rig.head.rotation.x += f * (capybara ? .47 : .65) + r * .18 - scared * .13;
    rig.head.rotation.x += Math.sin(time * 6.5) * f * .035;
    rig.head.rotation.y += Math.sin(time * .8) * .045 * (1 - f) * (1 - r);
    rig.head.rotation.z += Math.sin(time * .55) * (rig.species === "auryn" ? .07 : .025) * (1 - f);
  }
  rig.ears?.forEach((ear, i) => {
    const side = i ? 1 : -1;
    ear.rotation.x += scared * .65 + r * .3;
    ear.rotation.z += side * (scared * .18 + Math.sin(time * 2 + i * 1.7) ** 12 * .09 * (1 - r));
  });
  if (rig.tail) {
    const friendly = rig.species === "auryn" && pose.tamed;
    rig.tail.rotation.y += Math.sin(time * (friendly ? 4 : 1.6)) * (friendly ? .28 : .065) * (1 - r) * (1 - scared);
    rig.tail.rotation.x += scared * .35 - r * .25;
    rig.tail.rotation.z += r * .55;
  }
  // Animate the glow's geometry, not the shared material used by other individuals.
  if (rig.lumen) {
    const pulse = 1 + Math.sin(time * (pose.tamed ? 2 : 2.8)) * .045;
    rig.lumen.scaling.setAll(pulse);
  }
}
