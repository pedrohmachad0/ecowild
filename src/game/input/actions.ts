import { radialDeadzone } from "../math.ts";
import type { PetCommand } from "../types.ts";

export type HoldSet = {
  jump: boolean;
  sprint: boolean;
  interact: boolean;
};

export function axesFromKeys(keys: ReadonlySet<string>): { moveX: number; moveZ: number; sprint: boolean } {
  let moveX = 0;
  let moveZ = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) moveZ += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) moveZ -= 1;
  const m = Math.hypot(moveX, moveZ);
  if (m > 1) {
    moveX /= m;
    moveZ /= m;
  }
  const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
  return { moveX, moveZ, sprint };
}

export function petFromKeyEdge(prev: ReadonlySet<string>, next: ReadonlySet<string>): PetCommand | null {
  const hit = (code: string) => next.has(code) && !prev.has(code);
  if (hit("Digit1")) return "FOLLOW";
  if (hit("Digit2")) return "STAY";
  if (hit("Digit3")) return "PROTECT";
  if (hit("Digit4")) return "RETURN";
  return null;
}

export function buttonEdges(prev: HoldSet, next: HoldSet) {
  return {
    jump: next.jump && !prev.jump,
    interact: next.interact && !prev.interact,
  };
}

export function stickAxes(x: number, y: number, deadzone = 0.16): { x: number; y: number } {
  return radialDeadzone(x, y, deadzone);
}
