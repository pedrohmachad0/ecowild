import {
  ArcRotateCamera,
  FreeCamera,
  Scene,
  Vector3,
} from '@babylonjs/core';

export type CameraMode = 'third-person' | 'first-person';

export class CameraRig {
  readonly thirdPerson: ArcRotateCamera;
  readonly firstPerson: FreeCamera;
  private mode: CameraMode = 'third-person';

  constructor(private readonly scene: Scene, canvas: HTMLCanvasElement, player: Vector3) {
    this.thirdPerson = new ArcRotateCamera(
      'third-person-camera',
      -Math.PI / 2,
      1.1,
      8,
      new Vector3(0, 1.5, 0),
      scene,
    );
    this.thirdPerson.lowerRadiusLimit = 3;
    this.thirdPerson.upperRadiusLimit = 15;

    this.firstPerson = new FreeCamera('first-person-camera', new Vector3(0, 1.7, 0), scene);
    this.scene.activeCamera = this.thirdPerson;
    this.scene.activeCamera.attachControl(canvas, true);
    this.update(player);
  }

  get isFirstPerson() {
    return this.mode === 'first-person';
  }

  get movementYaw() {
    return this.isFirstPerson ? this.firstPerson.rotation.y : -this.thirdPerson.alpha - Math.PI / 2;
  }

  applyLook(deltaX: number, deltaY: number) {
    const sensitivity = 0.008;
    if (this.isFirstPerson) {
      this.firstPerson.rotation.y += deltaX * sensitivity;
      this.firstPerson.rotation.x = Math.max(
        -1.4,
        Math.min(1.4, this.firstPerson.rotation.x + deltaY * sensitivity),
      );
      return;
    }

    this.thirdPerson.alpha -= deltaX * sensitivity;
    this.thirdPerson.beta = Math.max(
      0.35,
      Math.min(1.45, this.thirdPerson.beta + deltaY * sensitivity),
    );
  }

  toggle(canvas: HTMLCanvasElement) {
    this.scene.activeCamera?.detachControl();
    this.mode = this.isFirstPerson ? 'third-person' : 'first-person';
    this.scene.activeCamera = this.isFirstPerson ? this.firstPerson : this.thirdPerson;
    this.scene.activeCamera.attachControl(canvas, true);
  }

  update(player: Vector3) {
    this.thirdPerson.target.copyFrom(player.add(new Vector3(0, 1.3, 0)));
    this.firstPerson.position.copyFrom(player.add(new Vector3(0, 0.75, 0)));
  }
}
