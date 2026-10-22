import { describe, expect, it } from 'vitest';
import {
  beginTouch,
  consumeLookDelta,
  createTouchState,
  endTouch,
  moveLook,
  setJoystickAxis,
} from '../src/controls/touchState';
import { getScreenOrientation, shouldPromptLandscape } from '../src/controls/orientation';

describe('controles multitouch', () => {
  it('mantém joystick e câmera ativos com ponteiros independentes', () => {
    const state = createTouchState();
    expect(beginTouch(state, 1, 'joystick')).toBe(true);
    expect(beginTouch(state, 2, 'look', 300, 200)).toBe(true);
    setJoystickAxis(state, 1, { x: 0.7, y: 0.7 });
    moveLook(state, 2, 340, 180);

    expect(state.joystickAxis).toEqual({ x: 0.7, y: 0.7 });
    expect(consumeLookDelta(state)).toEqual({ x: 40, y: -20 });
    expect(state.joystickPointerId).toBe(1);
    expect(state.lookPointerId).toBe(2);
  });

  it('libera cada ponteiro sem interromper o outro controle', () => {
    const state = createTouchState();
    beginTouch(state, 1, 'joystick');
    beginTouch(state, 2, 'look');
    endTouch(state, 2);
    expect(state.joystickPointerId).toBe(1);
    expect(state.lookPointerId).toBeNull();
    endTouch(state, 1);
    expect(state.joystickAxis).toEqual({ x: 0, y: 0 });
  });
});

describe('orientação mobile', () => {
  it('classifica orientações pela proporção da tela', () => {
    expect(getScreenOrientation(844, 390)).toBe('landscape');
    expect(getScreenOrientation(390, 844)).toBe('portrait');
  });

  it('solicita giro apenas para touch em portrait', () => {
    expect(shouldPromptLandscape(390, 844, true)).toBe(true);
    expect(shouldPromptLandscape(390, 844, false)).toBe(false);
    expect(shouldPromptLandscape(844, 390, true)).toBe(false);
  });
});
