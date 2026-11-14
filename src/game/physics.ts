/** Axis-aligned box in the gameplay plane (x right, y up), centred, in metres. */
export interface Box { x: number; y: number; w: number; h: number; kind?: 'solid' | 'oneway' | 'breakable'; vx?: number; id?: number; dead?: boolean }

export const GRAVITY = 32;

/** Lightweight deterministic platformer body (no physics engine needed, cheap on mobile). */
export class Body {
  vx = 0;
  vy = 0;
  onGround = false;
  ground: Box | null = null;
  constructor(public x: number, public y: number, public w = 0.7, public h = 1.75) {}

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  /** y is the feet position. */
  get top() { return this.y + this.h; }

  step(dt: number, boxes: Box[], gravityScale = 1, maxFall = 24) {
    // Ride moving platforms.
    if (this.onGround && this.ground?.vx) this.x += this.ground.vx * dt;

    this.vy = Math.max(this.vy - GRAVITY * gravityScale * dt, -maxFall);

    // Horizontal
    this.x += this.vx * dt;
    for (const b of boxes) {
      if (b.dead || b.kind === 'oneway') continue;
      if (this.overlap(b)) {
        if (this.vx > 0) this.x = b.x - b.w / 2 - this.w / 2 - 1e-4;
        else if (this.vx < 0) this.x = b.x + b.w / 2 + this.w / 2 + 1e-4;
        this.vx = 0;
      }
    }

    // Vertical
    const prevY = this.y;
    this.y += this.vy * dt;
    this.onGround = false;
    this.ground = null;
    for (const b of boxes) {
      if (b.dead) continue;
      const bTop = b.y + b.h / 2;
      const bBottom = b.y - b.h / 2;
      if (!this.overlap(b)) continue;
      if (this.vy <= 0 && prevY >= bTop - 0.05) {
        this.y = bTop; this.vy = 0; this.onGround = true; this.ground = b;
      } else if (b.kind !== 'oneway' && this.vy > 0 && prevY + this.h <= bBottom + 0.05) {
        this.y = bBottom - this.h; this.vy = 0;
      }
    }
  }

  overlap(b: Box) {
    return this.right > b.x - b.w / 2 && this.left < b.x + b.w / 2 && this.top > b.y - b.h / 2 && this.y < b.y + b.h / 2;
  }

  intersects(x: number, y: number, w: number, h: number) {
    return this.right > x - w / 2 && this.left < x + w / 2 && this.top > y - h / 2 && this.y < y + h / 2;
  }
}

/** Seeded RNG (mulberry32) so every level is identical on every device. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
