import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { CameraRig } from '../camera/CameraRig';
import { Input } from '../controls/Input';
import { clampToWorldBounds, type WorldBounds } from '../world/worldConfig';

export interface PlayerRuntime {
  mesh: ReturnType<typeof MeshBuilder.CreateCapsule>;
  verticalVelocity: number;
}

export function createPlayer(scene: Scene): PlayerRuntime {
  const mesh = MeshBuilder.CreateCapsule('player-placeholder', { height: 1.8, radius: 0.4 }, scene);
  mesh.position.y = 0.9;
  const material = new StandardMaterial('player-color', scene);
  material.diffuseColor = new Color3(0.9, 0.72, 0.3);
  mesh.material = material;
  return { mesh, verticalVelocity: 0 };
}

export function updatePlayer(
  player: PlayerRuntime,
  input: Input,
  camera: CameraRig,
  bounds: WorldBounds,
  deltaSeconds: number,
) {
  const movement = input.movement;
  const forward = new Vector3(Math.sin(camera.movementYaw), 0, Math.cos(camera.movementYaw));
  const right = new Vector3(Math.cos(camera.movementYaw), 0, -Math.sin(camera.movementYaw));
  const displacement = forward.scale(movement.y * 5 * deltaSeconds)
    .add(right.scale(movement.x * 5 * deltaSeconds));
  player.mesh.position.addInPlace(displacement);

  const bounded = clampToWorldBounds(player.mesh.position, bounds);
  player.mesh.position.x = bounded.x;
  player.mesh.position.z = bounded.z;

  if (player.mesh.position.y <= 0.901 && input.consumeJump()) {
    player.verticalVelocity = 6;
  }
  player.verticalVelocity -= 18 * deltaSeconds;
  player.mesh.position.y = Math.max(0.9, player.mesh.position.y + player.verticalVelocity * deltaSeconds);
  if (player.mesh.position.y === 0.9) player.verticalVelocity = 0;
}
