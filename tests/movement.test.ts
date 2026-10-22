import { describe, expect, it } from 'vitest';
import { normalizeMovement } from '../src/controls/movement';

describe('normalizeMovement', () => {
  it('mantém o vetor parado', () => {
    expect(normalizeMovement(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('limita diagonais a magnitude unitária', () => {
    const movement = normalizeMovement(1, 1);
    expect(movement.x).toBeCloseTo(Math.SQRT1_2);
    expect(movement.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('preserva vetores já normalizados', () => {
    expect(normalizeMovement(-1, 0)).toEqual({ x: -1, y: 0 });
  });
});
