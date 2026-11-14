import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Image } from '@babylonjs/gui/2D/controls/image';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Scene } from '@babylonjs/core/scene';
import { sfx } from '../systems/audio';

export const FONT = '"Cinzel", "Trajan Pro", Georgia, serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const GOLD = '#ffd98a';
export const INK = '#140d26';

/** Full-screen GUI at a 1280x720 design resolution, scaled to any phone. */
export function createUI(scene: Scene): AdvancedDynamicTexture {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, scene);
  ui.idealWidth = 1280;
  ui.idealHeight = 720;
  ui.useSmallestIdeal = true;
  ui.renderAtIdealSize = false;
  return ui;
}

export function bgImage(ui: AdvancedDynamicTexture, src: string, dim = 0.35) {
  // "Cover" fit: fill the screen whatever the phone ratio, never distort the artwork.
  const img = new Image('bg', src);
  img.stretch = Image.STRETCH_FILL;
  const fit = () => {
    const size = ui.getSize();
    const A = size.width / Math.max(1, size.height);
    const a = img.imageWidth && img.imageHeight ? img.imageWidth / img.imageHeight : 1376 / 768;
    if (A > a) { img.width = '100%'; img.height = `${(A / a) * 100}%`; } else { img.height = '100%'; img.width = `${(a / A) * 100}%`; }
  };
  fit();
  img.onImageLoadedObservable.add(fit);
  const obs = ui.getScene()!.getEngine().onResizeObservable.add(fit);
  img.onDisposeObservable.add(() => obs.remove());
  ui.addControl(img);
  if (dim > 0) {
    const veil = new Rectangle('veil');
    veil.thickness = 0;
    veil.background = `rgba(10,6,24,${dim})`;
    ui.addControl(veil);
  }
  return img;
}

export function text(value: string, size = 28, color = '#ffffff', font = FONT_UI): TextBlock {
  const t = new TextBlock(undefined, value);
  t.fontSize = size;
  t.color = color;
  t.fontFamily = font;
  t.shadowColor = 'rgba(0,0,0,0.7)';
  t.shadowBlur = 8;
  t.resizeToFit = true;
  return t;
}

export function button(label: string, onClick: () => void, opts: { w?: number; h?: number; primary?: boolean; size?: number } = {}): Button {
  const b = Button.CreateSimpleButton(`btn-${label}`, label);
  b.widthInPixels = opts.w ?? 300;
  b.heightInPixels = opts.h ?? 64;
  b.cornerRadius = 18;
  b.thickness = 2;
  b.color = opts.primary ? INK : GOLD;
  b.background = opts.primary ? '#ffcf6b' : 'rgba(20,13,38,0.72)';
  b.fontFamily = FONT_UI;
  b.fontWeight = '700';
  b.fontSize = opts.size ?? 26;
  b.shadowColor = 'rgba(0,0,0,0.6)';
  b.shadowBlur = 12;
  b.pointerEnterAnimation = () => { b.scaleX = b.scaleY = 1.04; };
  b.pointerOutAnimation = () => { b.scaleX = b.scaleY = 1; };
  b.onPointerUpObservable.add(() => { sfx.click(); onClick(); });
  return b;
}

export function panel(w: number, h: number, bg = 'rgba(14,9,30,0.78)'): Rectangle {
  const r = new Rectangle();
  r.widthInPixels = w;
  r.heightInPixels = h;
  r.cornerRadius = 22;
  r.thickness = 2;
  r.color = 'rgba(255,217,138,0.55)';
  r.background = bg;
  return r;
}

export function place(c: Control, x: number, y: number, h = Control.HORIZONTAL_ALIGNMENT_CENTER, v = Control.VERTICAL_ALIGNMENT_CENTER) {
  c.horizontalAlignment = h;
  c.verticalAlignment = v;
  c.leftInPixels = x;
  c.topInPixels = y;
  return c;
}
