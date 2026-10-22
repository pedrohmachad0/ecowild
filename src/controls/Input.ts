import { normalizeMovement, type MovementVector } from './movement';
import {
  beginTouch,
  consumeLookDelta as consumeTouchLookDelta,
  createTouchState,
  endTouch,
  moveLook,
  setJoystickAxis,
} from './touchState';

export class Input {
  private readonly keys = new Set<string>();
  private readonly abort = new AbortController();
  private readonly touch = createTouchState();
  private jump = false;
  private interact = false;
  private readonly joystickKnob = document.querySelector<HTMLElement>('#pad-knob');

  constructor() {
    const options: AddEventListenerOptions = { signal: this.abort.signal };
    const preventOptions: AddEventListenerOptions = { ...options, passive: false };

    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
      if (event.code === 'Space') {
        this.jump = true;
        event.preventDefault();
      }
    }, options);
    window.addEventListener('keyup', (event) => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => this.reset(), options);
    document.addEventListener('contextmenu', (event) => event.preventDefault(), preventOptions);

    const pad = document.querySelector<HTMLElement>('#pad');
    pad?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!beginTouch(this.touch, event.pointerId, 'joystick')) return;
      pad.setPointerCapture(event.pointerId);
      this.updateJoystick(event, pad);
    }, preventOptions);
    pad?.addEventListener('pointermove', (event) => {
      if (this.touch.joystickPointerId === event.pointerId) {
        event.preventDefault();
        this.updateJoystick(event, pad);
      }
    }, preventOptions);

    const lookZone = document.querySelector<HTMLElement>('#camera-look');
    lookZone?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!beginTouch(this.touch, event.pointerId, 'look', event.clientX, event.clientY)) return;
      lookZone.setPointerCapture(event.pointerId);
    }, preventOptions);
    lookZone?.addEventListener('pointermove', (event) => {
      if (this.touch.lookPointerId === event.pointerId) {
        event.preventDefault();
        moveLook(this.touch, event.pointerId, event.clientX, event.clientY);
      }
    }, preventOptions);

    for (const element of [pad, lookZone]) {
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        element?.addEventListener(eventName, (event) => {
          this.endPointer((event as PointerEvent).pointerId, pad, lookZone);
        }, options);
      }
    }

    document.querySelector('#jump')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.jump = true;
    }, preventOptions);
    document.querySelector('#interact')?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.interact = true;
    }, preventOptions);
  }

  get movement(): MovementVector {
    const x = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.touch.joystickAxis.x;
    const y = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')) + this.touch.joystickAxis.y;
    return normalizeMovement(x, y);
  }

  consumeLookDelta() {
    return consumeTouchLookDelta(this.touch);
  }

  consumeJump() {
    const jump = this.jump;
    this.jump = false;
    return jump;
  }

  consumeInteract() {
    const interact = this.interact;
    this.interact = false;
    return interact;
  }

  dispose() {
    this.abort.abort();
    this.reset();
  }

  private updateJoystick(event: PointerEvent, pad: HTMLElement) {
    const rect = pad.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const axis = normalizeMovement(x, -y);
    setJoystickAxis(this.touch, event.pointerId, axis);
    if (this.joystickKnob) {
      this.joystickKnob.style.transform = `translate(calc(-50% + ${axis.x * 35}px), calc(-50% + ${-axis.y * 35}px))`;
    }
  }

  private endPointer(pointerId: number, pad: HTMLElement | null, lookZone: HTMLElement | null) {
    const wasJoystick = this.touch.joystickPointerId === pointerId;
    endTouch(this.touch, pointerId);
    if (wasJoystick && this.joystickKnob) {
      this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    if (pad?.hasPointerCapture(pointerId)) pad.releasePointerCapture(pointerId);
    if (lookZone?.hasPointerCapture(pointerId)) lookZone.releasePointerCapture(pointerId);
  }

  private reset() {
    this.keys.clear();
    Object.assign(this.touch, createTouchState());
    if (this.joystickKnob) this.joystickKnob.style.transform = 'translate(-50%, -50%)';
  }
}
