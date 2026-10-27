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
  observeEdge: boolean;
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
  "KeyQ",
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
  return { jump: false, interact: false, sprint: false, camera: false, observe: false, pause: false, catalog: false, inventory: false, map: false, berry: false };
}

export class InputManager {
  private keys = new Set<string>();
  private override: Set<string> | null = null;
  private prevKeys = new Set<string>();
  private holds = emptyHold();
  private prevPad = emptyHold();
  private lookPx = 0;
  private lookPy = 0;
  private zoom = 0;
  private stickX = 0;
  private stickY = 0;
  private deadzone = 0.16;
  private petQueued: PetCommand | null = null;
  private dragging = new Set<number>();
  private abort = new AbortController();
  private gameplay = false;

  constructor(private canvas: HTMLCanvasElement) {
    const signal = this.abort.signal;
    window.addEventListener("keydown", this.onKeyDown, { signal });
    window.addEventListener("keyup", e => this.keys.delete(e.code), { signal });
    window.addEventListener("blur", this.clear, { signal });
    window.addEventListener("resize", this.clear, { signal });
    document.addEventListener("visibilitychange", this.clear, { signal });
    canvas.addEventListener("pointerdown", e => {
      if (!this.gameplay || (e.button !== 0 && e.button !== 2)) return;
      this.dragging.add(e.pointerId); canvas.setPointerCapture(e.pointerId);
    }, { signal });
    canvas.addEventListener("pointermove", e => {
      if (this.dragging.has(e.pointerId)) this.addLook(e.movementX, e.movementY);
    }, { signal });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
      canvas.addEventListener(type, e => this.dragging.delete(e.pointerId), { signal });
    }
    canvas.addEventListener("wheel", e => {
      if (this.gameplay) { e.preventDefault(); this.addZoom(e.deltaY); }
    }, { signal, passive: false });
    canvas.addEventListener("contextmenu", e => e.preventDefault(), { signal });
  }
  setGameplay(active: boolean): void {
    if (active !== this.gameplay) this.clear();
    this.gameplay = active;
  }
  setDeadzone(value: number): void { this.deadzone = Math.max(0.05, Math.min(0.35, value)); }
  setKeys(codes: readonly string[]): void { this.override = new Set(codes); }
  setStick(x: number, y: number): void { this.stickX = x; this.stickY = y; }
  setHold(name: keyof ReturnType<typeof emptyHold>, down: boolean): void { this.holds[name] = down; }
  addLook(dx: number, dy: number): void { this.lookPx += dx; this.lookPy += dy; }
  addZoom(delta: number): void { if (this.gameplay && Number.isFinite(delta)) this.zoom += delta; }
  queuePet(command: PetCommand): void { this.petQueued = command; }

  sample(): FrameInput {
    const keys = this.override ?? this.keys;
    const axes = axesFromKeys(keys);
    const stick = stickAxes(this.stickX, this.stickY, this.deadzone);
    let moveX = axes.moveX + stick.x;
    let moveZ = axes.moveZ - stick.y;
    let lookStickX = 0, lookStickY = 0;
    const pad = emptyHold();
    for (const gp of navigator.getGamepads?.() ?? []) {
      if (!gp || gp.mapping !== "standard") continue;
      const left = stickAxes(gp.axes[0] ?? 0, gp.axes[1] ?? 0, this.deadzone);
      const right = stickAxes(gp.axes[2] ?? 0, gp.axes[3] ?? 0, this.deadzone);
      moveX += left.x; moveZ -= left.y;
      lookStickX += right.x; lookStickY += right.y;
      pad.jump ||= !!gp.buttons[0]?.pressed;
      pad.interact ||= !!gp.buttons[1]?.pressed;
      pad.camera ||= !!gp.buttons[2]?.pressed;
      pad.catalog ||= !!gp.buttons[3]?.pressed;
      pad.sprint ||= !!gp.buttons[5]?.pressed || !!gp.buttons[7]?.pressed;
      pad.pause ||= !!gp.buttons[9]?.pressed;
    }
    const mag = Math.max(1, Math.hypot(moveX, moveZ));
    const edge = (code: string, action: keyof typeof pad) =>
      (keys.has(code) && !this.prevKeys.has(code)) || this.holds[action] || (pad[action] && !this.prevPad[action]);
    const frame: FrameInput = {
      moveX: moveX / mag, moveZ: moveZ / mag,
      lookPx: this.lookPx, lookPy: this.lookPy, lookStickX, lookStickY,
      sprint: axes.sprint || this.holds.sprint || pad.sprint, zoom: this.zoom,
      jumpEdge: edge("Space", "jump"), interactEdge: edge("KeyE", "interact"),
      useBerryEdge: edge("KeyF", "berry"), cameraEdge: edge("KeyV", "camera"), observeEdge: edge("KeyQ", "observe"),
      pauseEdge: edge("Escape", "pause"), catalogEdge: edge("KeyC", "catalog"),
      inventoryEdge: edge("Tab", "inventory"), mapEdge: edge("KeyM", "map"),
      pet: this.petQueued ?? petFromKeyEdge(this.prevKeys, keys),
    };
    this.prevKeys = new Set(keys);
    this.prevPad = pad;
    this.holds = { ...emptyHold(), sprint: this.holds.sprint };
    this.lookPx = this.lookPy = this.zoom = 0;
    this.petQueued = null;
    return frame;
  }
  clear = (): void => {
    this.keys.clear(); this.prevKeys.clear(); this.override = null;
    this.dragging.clear(); this.stickX = this.stickY = 0;
    this.holds = emptyHold(); this.prevPad = emptyHold();
    this.lookPx = this.lookPy = this.zoom = 0; this.petQueued = null;
  };
  dispose(): void { this.clear(); this.abort.abort(); }
  private onKeyDown = (e: KeyboardEvent): void => {
    const el = e.target instanceof HTMLElement ? e.target : null;
    if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
    // Menus retain native Tab/Space navigation. Escape still closes a panel.
    if (!this.gameplay && e.code !== "Escape") return;
    if (el?.closest("button") && (e.code === "Space" || e.code === "Enter")) return;
    if (GAME_KEYS.has(e.code)) {
      e.preventDefault();
      if (!e.repeat && !this.keys.has(e.code)) {
        const actions: Record<string, keyof ReturnType<typeof emptyHold>> = {
          Space: "jump", KeyE: "interact", KeyF: "berry", KeyV: "camera", KeyQ: "observe", Escape: "pause", KeyC: "catalog", Tab: "inventory", KeyM: "map",
        };
        const action = actions[e.code];
        if (action) this.holds[action] = true;
        this.petQueued = petFromKeyEdge(this.keys, new Set([...this.keys, e.code])) ?? this.petQueued;
      }
      this.keys.add(e.code);
    }
  };
}
