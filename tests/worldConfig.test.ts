import { describe, expect, it } from 'vitest';
import {
  clampToWorldBounds,
  MATA_BOUNDS,
  MATA_LAKE,
  MATA_PATHS,
  MATA_ROCKS,
  MATA_TREES,
} from '../src/world/worldConfig';

describe('Mata da Nascente', () => {
  it('declara lago, trilhas, pedras e vegetação', () => {
    expect(MATA_LAKE.width).toBeGreaterThan(0);
    expect(MATA_LAKE.depth).toBeGreaterThan(0);
    expect(MATA_PATHS.length).toBeGreaterThan(0);
    expect(MATA_ROCKS.length).toBeGreaterThan(0);
    expect(MATA_TREES.length).toBeGreaterThan(0);
  });

  it('mantém o jogador dentro dos limites do mapa', () => {
    expect(clampToWorldBounds({ x: -100, z: 100 })).toEqual({
      x: MATA_BOUNDS.minX,
      z: MATA_BOUNDS.maxZ,
    });
    expect(clampToWorldBounds({ x: 4, z: -8 })).toEqual({ x: 4, z: -8 });
  });
});
