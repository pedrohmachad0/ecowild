import {
  Color4,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { CameraRig } from './camera/CameraRig';
import { Input } from './controls/Input';
import { requestLandscapeOrientation } from './controls/orientation';
import { createPlayer, updatePlayer } from './player/Player';
import { createMataDaNascente } from './world/MataDaNascente';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas não encontrado');

const engine = new Engine(canvas, true);
engine.setHardwareScalingLevel(Math.max(1, devicePixelRatio / 1.5));

const scene = new Scene(engine);
scene.clearColor = new Color4(0.62, 0.82, 0.92, 1);
new HemisphericLight('daylight', new Vector3(0, 1, 0), scene);

const world = createMataDaNascente(scene);
const player = createPlayer(scene);
const camera = new CameraRig(scene, canvas, player.mesh.position);
const input = new Input();

const toggleCamera = () => camera.toggle(canvas);
document.querySelector('#camera')?.addEventListener('click', toggleCamera);
document.querySelector('#camera-touch')?.addEventListener('click', toggleCamera);
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyV' && !event.repeat) toggleCamera();
});

document.querySelector('#rotate-screen')?.addEventListener('click', async () => {
  const status = document.querySelector<HTMLElement>('#orientation-status');
  const locked = await requestLandscapeOrientation();
  if (status) status.textContent = locked
    ? 'Orientação horizontal solicitada.'
    : 'Gire o celular manualmente para continuar.';
});

engine.runRenderLoop(() => {
  const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.05);
  const look = input.consumeLookDelta();
  camera.applyLook(look.x, look.y);
  updatePlayer(player, input, camera, world.bounds, deltaSeconds);
  camera.update(player.mesh.position);
  scene.render();
});

window.addEventListener('resize', () => engine.resize());
