import { axesFromKeys, petFromKeyEdge, stickAxes } from "./actions.ts";
import type { PetCommand } from "../types.ts";

export type FrameInput = {
  moveX: number;
  moveZ: number;
  lookPx: number;
  lookPy: number;
  lookStickX: number;
  lookStickY: number;
  sprint: boolean;
  zoom: number;
  jumpEdge: boolean;
  interactEdge: boolean;
  useBerryEdge: boolean;
  cameraEdge: boolean;
  pauseEdge: boolean;
  catalogEdge: boolean;
  inventoryEdge: boolean;
  mapEdge: boolean;
  pet: PetCommand | null;
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyE",
  "KeyV",
  "KeyC",
  "KeyM",
  "KeyF",
  "Tab",
  "Escape",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
]);

function emptyHold() {
  return { jump: false, interact: false, sprint: false, camera: false, pause: false, catalog: false, inventory: false, map: false, berry: false };
}

export class InputManager {
  private keys = new Set<string>();
  private override: Set<string> | null = null;
  private prevKeys = new Set<string>();
  private holds = emptyHold();
  private prevHolds = emptyHold();
  private sprintLatch = false;
  private lookPx = 0;
  private lookPy = 0;
  private zoom = 0;
  private stickX = 0;
  private stickY = 0;
  private petQueued: PetCommand | null = null;
  private dragging = new Set<number>();
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    const opt = { passive: false } as const;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.clear);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, opt);
    canvas.addEventListener("contextmenu", this.onMenu);
  }

  /** QA probe: replace the keyboard until the next call. */
  setKeys(codes: readonly string[]): void {
    this.override = new Set(codes);
  }

  setStick(x: number, y: number): void {
    const d = stickAxes(x, y);
    this.stickX = d.x;
    this.stickY = d.y;
  }

  setHold(name: keyof ReturnType<typeof emptyHold>, down: boolean): void {
    if (name === "sprint") {
      if (down) this.sprintLatch = !this.sprintLatch;
      return;
    }
    this.holds[name] = down;
  }

  addLook(dx: number, dy: number): void {
    this.lookPx += dx;
    this.lookPy += dy;
  }

  queuePet(command: PetCommand): void {
    this.petQueued = command;
  }

  sample(): FrameInput {
    const keys = this.override ?? this.keys;
    const axes = axesFromKeys(keys);
    const stick = stickAxes(this.stickX, this.stickY);
    let moveX = axes.moveX + stick.x;
    let moveZ = axes.moveZ + -stick.y;
    const mag = Math.hypot(moveX, moveZ);
    if (mag > 1) {
      moveX /= mag;
      moveZ /= mag;
    }
    let lookStickX = 0;
    let lookStickY = 0;
    let padSprint = false;
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
    if (pads) {
      for (const gp of pads) {
        if (!gp) continue;
        const left = stickAxes(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
        moveX += left.x;
        moveZ += -left.y;
        const right = stickAxes(gp.axes[2] ?? 0, gp.axes[3] ?? 0);
        lookStickX += right.x;
        lookStickY += right.y;
        if (gp.buttons[0]?.pressed) this.holds.jump = true;
        if (gp.buttons[1]?.pressed) this.holds.interact = true;
        if (gp.buttons[2]?.pressed) this.holds.camera = true;
        if (gp.buttons[3]?.pressed) this.holds.catalog = true;
        if (gp.buttons[5]?.pressed || gp.buttons[7]?.pressed) padSprint = true;
        if (gp.buttons[9]?.pressed) this.holds.pause = true;
      }
      const m2 = Math.hypot(moveX, moveZ);
      if (m2 > 1) {
        moveX /= m2;
        moveZ /= m2;
      }
    }
    const jumpEdge = (keys.has("Space") && !this.prevKeys.has("Space")) || (this.holds.jump && !this.prevHolds.jump);
    const interactEdge =
      (keys.has("KeyE") && !this.prevKeys.has("KeyE")) || (this.holds.interact && !this.prevHolds.interact);
    const frame: FrameInput = {
      moveX,
      moveZ,
      lookPx: this.lookPx,
      lookPy: this.lookPy,
      lookStickX,
      lookStickY,
      sprint: axes.sprint || this.sprintLatch || this.holds.sprint || padSprint,
      zoom: this.zoom,
      jumpEdge,
      interactEdge,
      useBerryEdge: keys.has("KeyF") && !this.prevKeys.has("KeyF"),
      cameraEdge: (keys.has("KeyV") && !this.prevKeys.has("KeyV")) || (this.holds.camera && !this.prevHolds.camera),
      pauseEdge: (keys.has("Escape") && !this.prevKeys.has("Escape")) || (this.holds.pause && !this.prevHolds.pause),
      catalogEdge: (keys.has("KeyC") && !this.prevKeys.has("KeyC")) || (this.holds.catalog && !this.prevHolds.catalog),
      inventoryEdge: (keys.has("Tab") && !this.prevKeys.has("Tab")) || (this.holds.inventory && !this.prevHolds.inventory),
      mapEdge: (keys.has("KeyM") && !this.prevKeys.has("KeyM")) || (this.holds.map && !this.prevHolds.map),
      pet: this.petQueued ?? petFromKeyEdge(this.prevKeys, keys),
    };
    this.prevKeys = new Set(keys);
    this.prevHolds = { ...this.holds };
    this.holds.camera = false;
    this.holds.pause = false;
    this.holds.catalog = false;
    this.holds.inventory = false;
    this.holds.map = false;
    this.holds.jump = false;
    this.holds.interact = false;
    this.lookPx = 0;
    this.lookPy = 0;
    this.zoom = 0;
    this.petQueued = null;
    return frame;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.clear);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onMenu);
  }

  private typingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.typingTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private clear = (): void => {
    this.keys.clear();
    this.dragging.clear();
    this.stickX = 0;
    this.stickY = 0;
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;
    this.dragging.add(e.pointerId);
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging.has(e.pointerId)) return;
    this.lookPx += e.movementX;
    this.lookPy += e.movementY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.dragging.delete(e.pointerId);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoom += e.deltaY;
  };

  private onMenu = (e: Event): void => {
    e.preventDefault();
  };
}
