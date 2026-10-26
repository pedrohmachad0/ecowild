type TouchSink = {
  setStick(x: number, y: number): void;
  addLook(x: number, y: number): void;
  setHold(name: "jump" | "sprint" | "interact" | "camera", down: boolean): void;
};
/** Each region owns one pointer. Losing one finger never releases another region. */
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
  let last = { x: 0, y: 0 };
  region(root.querySelector("#camera-look")!, e => { last = { x: e.clientX, y: e.clientY }; }, e => {
    sink.addLook(e.clientX - last.x, e.clientY - last.y); last = { x: e.clientX, y: e.clientY };
  }, () => {});
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
