import { normalizeMovement, type MovementVector } from './movement';

export class Input {
  private readonly keys = new Set<string>();
  private axis: MovementVector = { x: 0, y: 0 };
  private jump = false;

  constructor() {
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
      if (event.code === 'Space') {
        this.jump = true;
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.axis = { x: 0, y: 0 };
    });

    const pad = document.querySelector<HTMLElement>('#pad');
    const move = (event: PointerEvent) => {
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      this.axis = normalizeMovement(x, -y);
    };

    pad?.addEventListener('pointerdown', (event) => {
      pad.setPointerCapture(event.pointerId);
      move(event);
    });
    pad?.addEventListener('pointermove', (event) => {
      if (pad.hasPointerCapture(event.pointerId)) move(event);
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      pad?.addEventListener(eventName, () => {
        this.axis = { x: 0, y: 0 };
      });
    }
    document.querySelector('#jump')?.addEventListener('pointerdown', () => {
      this.jump = true;
    });
  }

  get movement(): MovementVector {
    const x = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.axis.x;
    const y = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')) + this.axis.y;
    return normalizeMovement(x, y);
  }

  consumeJump() {
    const jump = this.jump;
    this.jump = false;
    return jump;
  }
}
