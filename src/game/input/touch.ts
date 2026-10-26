type TouchSink = {
  setStick(x: number, y: number): void;
  addLook(x: number, y: number): void;
  addZoom(delta: number): void;
  setHold(name: "jump" | "sprint" | "interact" | "camera", down: boolean): void;
};
/** Regions own independent pointers; only the camera accepts a second finger for pinch. */
export function bindTouch(root: HTMLElement, sink: TouchSink) {
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const resets: (() => void)[] = [];
  const region = (node: HTMLElement, down: (e: PointerEvent) => void, move: (e: PointerEvent) => void, end: () => void) => {
    let pointer: number | null = null;
    const reset = () => {
      const old = pointer; pointer = null; end();
      if (old !== null && node.hasPointerCapture(old)) node.releasePointerCapture(old);
    };
    resets.push(reset);
    node.addEventListener("pointerdown", e => {
      if (pointer !== null) return;
      e.preventDefault(); pointer = e.pointerId; node.setPointerCapture(pointer); down(e);
    }, options);
    node.addEventListener("pointermove", e => { if (e.pointerId === pointer) move(e); }, options);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
      node.addEventListener(type, e => { if (e.pointerId === pointer) reset(); }, options);
    }
  };
  const pad = root.querySelector<HTMLElement>("#pad")!;
  const knob = root.querySelector<HTMLElement>("#pad-knob")!;
  let origin = { x: 0, y: 0 };
  const stickMove = (e: PointerEvent) => {
    const dx = e.clientX - origin.x, dy = e.clientY - origin.y;
    const radius = pad.clientWidth * 0.32;
    const scale = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
    knob.style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
    sink.setStick(dx * scale / radius, dy * scale / radius);
  };
  region(pad, e => { const rect = pad.getBoundingClientRect(); origin = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }; stickMove(e); }, stickMove,
    () => { knob.style.transform = "translate(-50%, -50%)"; sink.setStick(0, 0); });
  const camera = root.querySelector<HTMLElement>("#camera-look")!;
  const fingers = new Map<number, { x: number; y: number }>();
  const separation = () => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  camera.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (fingers.has(e.pointerId) || fingers.size >= 2) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camera.setPointerCapture(e.pointerId);
  }, options);
  camera.addEventListener("pointermove", e => {
    const last = fingers.get(e.pointerId);
    if (!last) return;
    const before = fingers.size === 2 ? separation() : 0;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2) {
      // Match wheel units: spreading fingers moves the camera closer.
      sink.addZoom((before - separation()) * 4);
    } else sink.addLook(e.clientX - last.x, e.clientY - last.y);
  }, options);
  const endCamera = (pointerId: number) => {
    if (!fingers.delete(pointerId)) return;
    // The surviving finger already has its latest position: no jump on 2 → 1.
    if (camera.hasPointerCapture(pointerId)) camera.releasePointerCapture(pointerId);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    camera.addEventListener(type, e => endCamera(e.pointerId), options);
  }
  resets.push(() => { for (const id of [...fingers.keys()]) endCamera(id); });
  for (const id of ["jump", "sprint", "interact", "camera"] as const) {
    const button = root.querySelector<HTMLElement>(id === "camera" ? "#camera-touch" : `#${id}`)!;
    region(button, () => sink.setHold(id, true), () => {}, () => { if (id === "sprint") sink.setHold(id, false); });
    button.addEventListener("click", e => { if (e.detail === 0 && id !== "sprint") sink.setHold(id, true); }, options);
  }
  const clear = () => resets.forEach(reset => reset());
  window.addEventListener("blur", clear, options);
  window.addEventListener("resize", clear, options);
  document.addEventListener("visibilitychange", clear, options);
  return { clear, dispose() { clear(); abort.abort(); } };
}
