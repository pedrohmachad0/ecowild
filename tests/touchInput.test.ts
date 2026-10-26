import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindTouch } from '../src/game/input/touch';
import { InputManager } from '../src/game/input/InputManager';

// EventTarget exercises the production listeners; only layout/capture are supplied
// here. Native pointer routing and multitouch are checked separately in Chromium.
class Surface extends EventTarget {
  captures = new Set<number>();
  style = { transform: '' };
  clientWidth = 100;
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
  getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 100 }; }
}
function pointer(node: Surface, type: string, id: number, x = 0, y = 0) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: id, clientX: x, clientY: y, button: 0 });
  node.dispatchEvent(event);
  return event;
}

describe('input ativo: pinça independente de movimento e ações', () => {
  let windowEvents: EventTarget, documentEvents: EventTarget;
  let nodes: Record<string, Surface>, input: InputManager, binding: ReturnType<typeof bindTouch>;
  beforeEach(() => {
    windowEvents = new EventTarget(); documentEvents = new EventTarget();
    vi.stubGlobal('window', windowEvents); vi.stubGlobal('document', documentEvents);
    vi.stubGlobal('navigator', { getGamepads: () => [] });
    nodes = Object.fromEntries(['pad', 'pad-knob', 'camera-look', 'jump', 'sprint', 'interact', 'camera-touch', 'canvas'].map(id => [id, new Surface()]));
    input = new InputManager(nodes.canvas as unknown as HTMLCanvasElement);
    input.setGameplay(true);
    const root = { querySelector: (selector: string) => nodes[selector.slice(1)] } as unknown as HTMLElement;
    binding = bindTouch(root, input);
  });
  afterEach(() => { binding.dispose(); input.dispose(); vi.unstubAllGlobals(); });

  it('mantém joystick + corrida ao aproximar/afastar com dois dedos sem girar', () => {
    pointer(nodes.pad, 'pointerdown', 1, 82, 50);
    pointer(nodes.sprint, 'pointerdown', 4);
    pointer(nodes['camera-look'], 'pointerdown', 2, 300, 100);
    pointer(nodes['camera-look'], 'pointerdown', 3, 400, 100);
    pointer(nodes['camera-look'], 'pointermove', 3, 450, 100);
    expect(input.sample()).toMatchObject({ moveX: 1, sprint: true, zoom: -200, lookPx: 0, lookPy: 0 });
    pointer(nodes['camera-look'], 'pointermove', 3, 400, 100);
    expect(input.sample()).toMatchObject({ moveX: 1, sprint: true, zoom: 200, lookPx: 0 });
    expect(input.sample().zoom).toBe(0);
    pointer(nodes['camera-look'], 'pointerup', 3);
    pointer(nodes['camera-look'], 'pointerup', 2);
    expect(input.sample()).toMatchObject({ moveX: 1, sprint: true, zoom: 0 });
  });

  it('retoma arrasto na posição atual depois de soltar, cancelar ou perder captura de um dedo', () => {
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      pointer(nodes['camera-look'], 'pointerdown', 2, 300, 100);
      pointer(nodes['camera-look'], 'pointermove', 2, 320, 110);
      expect(input.sample()).toMatchObject({ lookPx: 20, lookPy: 10, zoom: 0 });
      pointer(nodes['camera-look'], 'pointerdown', 3, 400, 100);
      pointer(nodes['camera-look'], 'pointermove', 2, 280, 90);
      input.sample();
      pointer(nodes['camera-look'], ending, 3);
      pointer(nodes['camera-look'], 'pointermove', 2, 283, 92);
      expect(input.sample()).toMatchObject({ lookPx: 3, lookPy: 2, zoom: 0 });
      pointer(nodes['camera-look'], 'pointerup', 2);
      expect(nodes['camera-look'].captures.size).toBe(0);
    }
  });

  it('não aceita terceiro dedo na câmera nem o transfere ao encerrar a pinça', () => {
    pointer(nodes['camera-look'], 'pointerdown', 2, 300, 100);
    pointer(nodes['camera-look'], 'pointerdown', 3, 400, 100);
    pointer(nodes['camera-look'], 'pointerdown', 5, 500, 100);
    pointer(nodes['camera-look'], 'pointermove', 5, 800, 500);
    pointer(nodes['camera-look'], 'pointerup', 5);
    expect(input.sample()).toMatchObject({ lookPx: 0, lookPy: 0, zoom: 0 });
    expect(nodes['camera-look'].captures).toEqual(new Set([2, 3]));
    pointer(nodes['camera-look'], 'pointerup', 3);
    pointer(nodes['camera-look'], 'pointermove', 5, 900, 500);
    expect(input.sample()).toMatchObject({ lookPx: 0, lookPy: 0, zoom: 0 });
  });

  it('limpa ponteiros, corrida e zoom pendente no blur, resize e visibilitychange', () => {
    for (const [target, type] of [[windowEvents, 'blur'], [windowEvents, 'resize'], [documentEvents, 'visibilitychange']] as const) {
      pointer(nodes.pad, 'pointerdown', 1, 82, 50);
      pointer(nodes.sprint, 'pointerdown', 4);
      pointer(nodes['camera-look'], 'pointerdown', 2, 300, 100);
      pointer(nodes['camera-look'], 'pointerdown', 3, 400, 100);
      pointer(nodes['camera-look'], 'pointermove', 3, 450, 100);
      target.dispatchEvent(new Event(type));
      pointer(nodes['camera-look'], 'pointermove', 2, 310, 100);
      expect(input.sample()).toMatchObject({ moveX: 0, moveZ: 0, sprint: false, lookPx: 0, lookPy: 0, zoom: 0 });
      expect(nodes['camera-look'].captures.size).toBe(0);
      expect(nodes.pad.captures.size).toBe(0);
      expect(nodes.sprint.captures.size).toBe(0);
    }
  });

  it('preserva roda no desktop e não aplica zoom enquanto um menu está aberto', () => {
    const wheel = new Event('wheel', { cancelable: true }); Object.assign(wheel, { deltaY: 120 });
    nodes.canvas.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true); expect(input.sample().zoom).toBe(120);
    input.addZoom(-40); input.setGameplay(false);
    const menuWheel = new Event('wheel', { cancelable: true }); Object.assign(menuWheel, { deltaY: 120 });
    nodes.canvas.dispatchEvent(menuWheel); input.addZoom(-100);
    expect(menuWheel.defaultPrevented).toBe(false); expect(input.sample().zoom).toBe(0);
    input.setGameplay(true); input.addZoom(NaN);
    expect(input.sample().zoom).toBe(0);
  });

  it('remove listeners e capturas ao descartar os controles', () => {
    pointer(nodes['camera-look'], 'pointerdown', 2, 300, 100);
    pointer(nodes['camera-look'], 'pointerdown', 3, 400, 100);
    binding.dispose();
    pointer(nodes['camera-look'], 'pointermove', 3, 450, 100);
    pointer(nodes['camera-look'], 'pointerdown', 5, 500, 100);
    pointer(nodes.sprint, 'pointerdown', 4);
    expect(input.sample()).toMatchObject({ zoom: 0, lookPx: 0, sprint: false });
    expect(nodes['camera-look'].captures.size).toBe(0);
  });
});
