import type { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  power: boolean;
}

/** Edge-triggered + held input from keyboard and on-screen touch buttons (multi-touch). */
export class Input {
  readonly held: InputState = { left: false, right: false, jump: false, attack: false, power: false };
  private pressed = new Set<keyof InputState>();
  private onKey = (e: KeyboardEvent) => this.key(e, e.type === 'keydown');

  constructor() {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  /** True only on the frame the action was pressed. */
  consume(k: keyof InputState): boolean {
    const v = this.pressed.has(k);
    this.pressed.delete(k);
    return v;
  }

  private set(k: keyof InputState, down: boolean) {
    if (down && !this.held[k]) this.pressed.add(k);
    this.held[k] = down;
  }

  private key(e: KeyboardEvent, down: boolean) {
    const map: Record<string, keyof InputState> = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyJ: 'attack', KeyX: 'attack', KeyK: 'power', KeyC: 'power',
    };
    const k = map[e.code];
    if (k) { this.set(k, down); e.preventDefault(); }
  }

  /** On-screen controls: D-pad left, actions right. Sized for thumbs. */
  attachTouch(ui: AdvancedDynamicTexture, actions: { attack?: boolean } = {}) {
    const mk = (label: string, k: keyof InputState, x: number, y: number, size: number, h: number, color: string) => {
      const b = new Ellipse(`touch-${k}`);
      b.widthInPixels = b.heightInPixels = size;
      b.thickness = 3;
      b.color = 'rgba(255,255,255,0.55)';
      b.background = color;
      b.alpha = 0.8;
      b.horizontalAlignment = h;
      b.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      b.leftInPixels = x;
      b.topInPixels = y;
      const t = new TextBlock(undefined, label);
      t.color = 'white'; t.fontSize = size * 0.38; t.fontWeight = '700';
      b.addControl(t);
      b.onPointerDownObservable.add(() => this.set(k, true));
      b.onPointerUpObservable.add(() => this.set(k, false));
      b.onPointerOutObservable.add(() => { if (this.held[k]) this.set(k, false); });
      ui.addControl(b);
    };
    const L = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const R = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    mk('◀', 'left', 36, -40, 120, L, 'rgba(20,13,38,0.45)');
    mk('▶', 'right', 176, -40, 120, L, 'rgba(20,13,38,0.45)');
    mk('⤒', 'jump', -36, -40, 130, R, 'rgba(60,140,255,0.45)');
    mk('✦', 'power', -186, -40, 104, R, 'rgba(255,190,60,0.45)');
    if (actions.attack) mk('✊', 'attack', -60, -190, 104, R, 'rgba(255,80,80,0.45)');
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }
}
