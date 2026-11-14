import type { WorldDef } from '../config/worlds';
import { rng, type Box } from './physics';

export interface Geyser { x: number; period: number; offset: number }
export interface WindZone { x: number; w: number; force: number }
export interface Level {
  length: number;
  boxes: Box[];
  stars: { x: number; y: number }[];
  geysers: Geyser[];
  winds: WindZone[];
  quicksand: { x: number; w: number }[];
  checkpoints: number[];
  finishX: number;
}

/**
 * Deterministic level builder: same world + level index = same course on every phone.
 * Difficulty grows with the level index; "easy" mode narrows gaps.
 */
export function buildLevel(world: WorldDef, index: number, easy: boolean): Level {
  const r = rng(world.id.length * 7919 + index * 104729 + 17);
  const L: Level = { length: 0, boxes: [], stars: [], geysers: [], winds: [], quicksand: [], checkpoints: [], finishX: 0 };
  const gapMax = (easy ? 2.6 : 3.4) + index * 0.35;
  const sections = 14 + index * 4;
  let x = -4;
  let y = 0;
  let id = 0;
  const ground = (x0: number, w: number, top: number) => {
    L.boxes.push({ x: x0 + w / 2, y: top - 4, w, h: 8, kind: 'solid', id: id++ });
  };

  ground(x, 14, y);
  x += 14;
  for (let s = 0; s < sections; s++) {
    const gap = 1.6 + r() * (gapMax - 1.6);
    const roll = r();
    if (s > 0 && s % 5 === 0) L.checkpoints.push(x - 3);

    if (roll < 0.22 && (world.hazard === 'water' || world.hazard === 'void' || index > 0)) {
      // Moving platform over a wide gap.
      const span = gap + 4;
      L.boxes.push({ x: x + span / 2, y: y + 0.3, w: 3, h: 0.5, kind: 'oneway', vx: 1.6 + r(), id: id++ });
      L.stars.push({ x: x + span / 2, y: y + 1.8 });
      x += span;
    } else if (roll < 0.45) {
      // Floating stepping stones.
      x += gap;
      const n = 2 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const py = y + 1 + r() * 1.8;
        L.boxes.push({ x: x + 1.2, y: py, w: 2.4, h: 0.5, kind: 'oneway', id: id++ });
        L.stars.push({ x: x + 1.2, y: py + 1.4 });
        x += 2.4 + 1.4 + r() * (easy ? 0.6 : 1.2);
      }
    } else {
      x += gap;
    }

    // Next ground block, sometimes higher/lower.
    const dy = Math.round((r() - 0.5) * (easy ? 2 : 3) * 2) / 2;
    y = Math.max(-1, Math.min(3, y + dy));
    const w = 6 + r() * 8;
    ground(x, w, y);
    // Stars on ground in a small arc.
    const k = 2 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) L.stars.push({ x: x + 1.5 + i * 1.1, y: y + 1 + Math.sin((i / (k - 1 || 1)) * Math.PI) * 1.2 });

    // World obstacles.
    const ox = x + w * 0.65;
    if (world.hazard === 'lava' && r() < 0.6) L.geysers.push({ x: ox, period: easy ? 3.2 : 2.4, offset: r() * 2 });
    if (world.hazard === 'wind' && r() < 0.55) L.winds.push({ x: x + w * 0.5, w: 3, force: 14 + index * 2 });
    if (world.hazard === 'quicksand' && r() < 0.5) L.quicksand.push({ x: x + w * 0.55, w: Math.min(3.5, w * 0.4) });
    if ((world.element === 'earth' || index >= 1) && r() < 0.3) {
      L.boxes.push({ x: ox, y: y + 0.6, w: 1.2, h: 1.2, kind: 'breakable', id: id++ });
    }
    x += w;
  }
  ground(x + 2, 18, y);
  L.finishX = x + 12;
  L.length = x + 20;
  return L;
}
