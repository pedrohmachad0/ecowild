import type { MovementVector } from './movement';

export type TouchControl = 'joystick' | 'look';

export interface TouchState {
  joystickPointerId: number | null;
  lookPointerId: number | null;
  lookPoint: { x: number; y: number } | null;
  joystickAxis: MovementVector;
  lookDelta: MovementVector;
}

export function createTouchState(): TouchState {
  return {
    joystickPointerId: null,
    lookPointerId: null,
    lookPoint: null,
    joystickAxis: { x: 0, y: 0 },
    lookDelta: { x: 0, y: 0 },
  };
}

export function beginTouch(
  state: TouchState,
  pointerId: number,
  control: TouchControl,
  x = 0,
  y = 0,
): boolean {
  if (control === 'joystick') {
    if (state.joystickPointerId !== null) return false;
    state.joystickPointerId = pointerId;
    return true;
  }
  if (state.lookPointerId !== null) return false;
  state.lookPointerId = pointerId;
  state.lookPoint = { x, y };
  return true;
}

export function setJoystickAxis(state: TouchState, pointerId: number, axis: MovementVector) {
  if (state.joystickPointerId === pointerId) state.joystickAxis = axis;
}

export function moveLook(state: TouchState, pointerId: number, x: number, y: number) {
  if (state.lookPointerId !== pointerId || !state.lookPoint) return;
  state.lookDelta.x += x - state.lookPoint.x;
  state.lookDelta.y += y - state.lookPoint.y;
  state.lookPoint = { x, y };
}

export function endTouch(state: TouchState, pointerId: number) {
  if (state.joystickPointerId === pointerId) {
    state.joystickPointerId = null;
    state.joystickAxis = { x: 0, y: 0 };
  }
  if (state.lookPointerId === pointerId) {
    state.lookPointerId = null;
    state.lookPoint = null;
  }
}

export function consumeLookDelta(state: TouchState): MovementVector {
  const delta = state.lookDelta;
  state.lookDelta = { x: 0, y: 0 };
  return delta;
}
