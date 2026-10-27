import type { StandardMaterial, TransformNode } from "@babylonjs/core";
import type { AiState, SpeciesId } from "../types.ts";

export type RigPose = { state?: AiState; fear?: number; trust?: number; tamed?: boolean; dt?: number };
export type Rig = {
  root: TransformNode;
  legs: TransformNode[];
  wings: TransformNode[];
  crest: StandardMaterial | null;
  species?: SpeciesId;
  body?: TransformNode;
  head?: TransformNode;
  tail?: TransformNode;
  ears?: TransformNode[];
  lumen?: TransformNode;
  eyeLids?: TransformNode[];
  /** Rest coordinates are captured once; animations never move the simulation root. */
  rests?: Map<TransformNode, { x: number; y: number; z: number; rx: number; ry: number; rz: number }>;
  poseBlend?: { rest: number; feed: number; fear: number };
};
