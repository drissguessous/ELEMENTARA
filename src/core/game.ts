import { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';

export interface Screen {
  scene: Scene;
  /** Called every frame before render (seconds). */
  update?(dt: number): void;
  dispose(): void;
}

type ScreenFactory = (game: Game) => Promise<Screen> | Screen;

/** Owns the Babylon engine and switches between screens (one Babylon scene per screen). */
export class Game {
  readonly engine: Engine;
  private current: Screen | null = null;
  private switching = false;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }, true);
    // Cap the rendering resolution on very high-DPI phones to keep 60 fps.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.engine.setHardwareScalingLevel(1 / dpr);
    window.addEventListener('resize', () => this.engine.resize());
    // Adaptive resolution: if a phone cannot hold ~30 fps, render fewer pixels (up to 2x less).
    const base = 1 / dpr;
    const adaptive = !new URLSearchParams(location.search).has('fixedres');
    let level = base;
    let acc = 0;
    let slow = 0;
    this.engine.runRenderLoop(() => {
      if (!this.current) return;
      acc += this.engine.getDeltaTime();
      if (acc > 2000) {
        acc = 0;
        const fps = this.engine.getFps();
        slow = fps < 28 ? slow + 1 : 0;
        if (adaptive && slow >= 2 && level < base * 2) { level = Math.min(base * 2, level * 1.25); this.engine.setHardwareScalingLevel(level); slow = 0; }
      }
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 1 / 20);
      this.current.update?.(dt);
      this.current.scene.render();
    });
  }

  async go(factory: ScreenFactory) {
    if (this.switching) return;
    this.switching = true;
    const loading = document.getElementById('loading');
    loading?.classList.add('show');
    try {
      const next = await factory(this);
      await next.scene.whenReadyAsync();
      const prev = this.current;
      this.current = next;
      prev?.dispose();
    } finally {
      loading?.classList.remove('show');
      this.switching = false;
    }
  }
}
