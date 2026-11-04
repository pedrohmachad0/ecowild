import type { SpeciesId } from "../types.ts";

/**
 * Optional external models (GLB) that replace the procedural look of a species or of
 * the explorer. The procedural rig always exists underneath: animation keeps driving
 * the body joint, and if a file is missing or fails to load the procedural model stays.
 *
 * Rules (checked by tests/models.test.ts):
 * - the file lives in public/models/ and is listed here;
 * - at most MODEL_BUDGET.bytes bytes and MODEL_BUDGET.triangles triangles;
 * - `license` says where it came from and under which terms, and docs/ASSETS.md
 *   mentions the file name. No file without a verified license.
 */
export type ModelAsset = {
  /** File name inside public/models/. */
  file: string;
  /** Uniform scale so the model matches the procedural size. */
  scale: number;
  /** Lift or lower the model (metres) so the feet touch the ground. */
  yOffset?: number;
  /** Turn the model so it faces local +Z (radians). */
  rotationY?: number;
  /** Source and terms, e.g. "Gerado no Higgsfield (Meshy 6, lowpoly) em 2026-11-05; termos do plano X". */
  license: string;
};

export type ModelKey = SpeciesId | "player";

export const MODEL_BUDGET = { bytes: 700 * 1024, triangles: 8000 } as const;

/** Empty until a model with a verified license is added. */
export const MODEL_ASSETS: Partial<Record<ModelKey, ModelAsset>> = {};
