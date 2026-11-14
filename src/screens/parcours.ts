import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import type { Game, Screen } from '../core/game';
import { setupGraphics } from '../core/graphics';
import { Input } from '../core/input';
import { button, createUI, panel, place, text, GOLD } from '../core/ui';
import { heroById } from '../config/heroes';
import { worldById, levelKey } from '../config/worlds';
import { repo } from '../data/repository';
import { t } from '../i18n';
import { sfx } from '../systems/audio';
import { Character, col3 } from '../game/character';
import { buildLevel } from '../game/levelgen';
import { Body, type Box } from '../game/physics';
import { WorldView } from '../game/worldview';
import { burst, column } from '../game/fx';
import { nav } from './nav';

export async function parcoursScreen(game: Game, worldId: string, levelIndex: number): Promise<Screen> {
  const scene = new Scene(game.engine);
  const world = worldById(worldId);
  const hero = heroById(repo.profile().heroId);
  const easy = repo.settings().mode === 'easy';
  const level = buildLevel(world, levelIndex, easy);

  const camera = new FreeCamera('cam', new Vector3(0, 3, -13), scene);
  camera.fov = 0.78;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  const light = setupGraphics(scene, camera, { warm: world.hazard !== 'wind' });
  const view = new WorldView(scene, world);

  // --- Level geometry
  const meshes = new Map<number, Mesh>();
  for (const b of level.boxes) {
    let m: Mesh;
    if (b.kind === 'breakable') m = view.rock(b.x, b.y, b.w);
    else if (b.kind === 'oneway') m = view.platform(b.x, b.y, b.w, b.h);
    else m = view.groundBlock(b.x, b.y, b.w, b.h);
    light.shadows.addShadowCaster(m, true);
    meshes.set(b.id!, m);
  }
  const movers = level.boxes.filter((b) => b.vx).map((b) => ({ b, x0: b.x, phase: b.x }));

  const stars = level.stars.map((s) => ({ ...s, mesh: view.star(s.x, s.y), taken: false }));

  const geysers = level.geysers.map((g) => {
    const ps = column(scene, new Vector3(g.x, -1, 0), new Color4(1, 0.6, 0.1, 1), new Color4(1, 0.15, 0, 1), 6, 260);
    return { ...g, ps, active: false };
  });
  const winds = level.winds.map((w) => {
    const ps = column(scene, new Vector3(w.x, -1, 0), new Color4(0.85, 1, 0.95, 0.35), new Color4(1, 1, 1, 0.1), 9, 90, 'textures/disc.png');
    ps.minSize = 0.05; ps.maxSize = 0.12; ps.start();
    return w;
  });
  const sands = level.quicksand.map((q) => {
    const top = level.boxes.find((b) => b.kind === 'solid' && Math.abs(b.x - q.x) < b.w / 2);
    const y = top ? top.y + top.h / 2 : 0;
    const m = MeshBuilder.CreateBox('sand', { width: q.w, height: 0.06, depth: 3.6 }, scene);
    const mat = new PBRMaterial('sandMat', scene);
    mat.albedoColor = new Color3(0.62, 0.45, 0.22); mat.roughness = 1;
    m.material = mat; m.position.set(q.x, y + 0.03, 0.2);
    return { ...q, y };
  });

  // Checkpoints and finish portal.
  const flags = level.checkpoints.map((x) => {
    const top = groundTopAt(level.boxes, x);
    const pole = MeshBuilder.CreateCylinder('pole', { height: 2.6, diameter: 0.08 }, scene);
    pole.position.set(x, top + 1.3, 0.8);
    const flag = MeshBuilder.CreatePlane('flag', { width: 0.9, height: 0.55, sideOrientation: 2 }, scene);
    flag.parent = pole; flag.position.set(0.47, 1, 0);
    const fm = new PBRMaterial('flagMat', scene);
    fm.albedoColor = new Color3(0.5, 0.5, 0.55); fm.emissiveColor = new Color3(0, 0, 0); fm.roughness = 0.6;
    flag.material = fm;
    return { x, top, fm, on: false };
  });
  const finishTop = groundTopAt(level.boxes, level.finishX);
  const portal = MeshBuilder.CreateTorus('portal', { diameter: 3.4, thickness: 0.28, tessellation: 64 }, scene);
  portal.rotation.x = Math.PI / 2;
  portal.position.set(level.finishX, finishTop + 1.9, 0);
  const pm = new PBRMaterial('portalMat', scene);
  pm.albedoColor = col3(hero.color); pm.emissiveColor = col3(world.element === 'all' ? 0xffd76a : hero.color); pm.metallic = 1; pm.roughness = 0.2;
  portal.material = pm;
  column(scene, new Vector3(level.finishX, finishTop, 0), Color4.FromColor3(col3(hero.accent), 1), Color4.FromColor3(col3(hero.color), 1), 4, 80).start();

  // --- Player
  const ch = await Character.create(scene, hero, light.shadows);
  const body = new Body(0, 0.1);
  let checkpoint = { x: 0, y: 1 };
  const maxHearts = easy ? 5 : 3;
  let hearts = maxHearts;
  let collected = 0;
  let elapsed = 0;
  let airJumps = 0;
  let abilityT = 0;
  let abilityCd = 0;
  let invuln = 0;
  let finished = false;
  let paused = false;
  let tick = 0;

  // --- HUD
  const ui = createUI(scene);
  const input = new Input();
  input.attachTouch(ui);
  const hud = new StackPanel(); hud.isVertical = false; hud.heightInPixels = 60;
  place(hud, 24, 16, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP);
  hud.adaptWidthToChildren = true;
  const heartsTxt = text('', 30, '#ff8b8b'); heartsTxt.paddingRightInPixels = 28;
  const starsTxt = text('', 30, GOLD); starsTxt.paddingRightInPixels = 28;
  const timeTxt = text('', 28, '#ffffff');
  hud.addControl(heartsTxt); hud.addControl(starsTxt); hud.addControl(timeTxt);
  ui.addControl(hud);
  const levelName = text(`${t(world.nameKey)} · ${t('map.level')} ${levelIndex + 1}`, 22, '#ffffffcc');
  place(levelName, 0, 22, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(levelName);
  const toast = text('', 34, GOLD); place(toast, 0, -120); toast.alpha = 0; ui.addControl(toast);
  let toastT = 0;
  const say = (msg: string) => { toast.text = msg; toastT = 1.6; };

  const pauseBox = panel(420, 260); pauseBox.isVisible = false;
  const pStack = new StackPanel(); pStack.spacing = 18; pauseBox.addControl(pStack);
  pStack.addControl(text(t('hud.pause'), 38, GOLD));
  pStack.addControl(button(t('hud.resume'), () => { paused = false; pauseBox.isVisible = false; }, { primary: true }));
  pStack.addControl(button(t('hud.quit'), () => nav.map()));
  ui.addControl(pauseBox);
  const pauseBtn = button('II', () => { paused = true; pauseBox.isVisible = true; }, { w: 64, h: 64 });
  place(pauseBtn, -20, 16, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(pauseBtn);

  const refreshHud = () => {
    heartsTxt.text = '❤'.repeat(hearts) + '♡'.repeat(maxHearts - hearts);
    starsTxt.text = `★ ${collected}/${stars.length}`;
    timeTxt.text = fmt(elapsed);
  };

  const camPos = new Vector3(0, 2.7, -9.2);
  const camTarget = new Vector3(0, 1.2, 0);

  const loseHeart = (reason: Color3) => {
    if (invuln > 0) return;
    hearts--; sfx.hit(); ch.hurt();
    burst(scene, ch.position.add(new Vector3(0, 1, 0)), reason, 40, 4);
    invuln = 1.2;
    if (hearts <= 0) {
      finished = true; sfx.lose();
      setTimeout(() => nav.result({ kind: 'parcours', win: false, worldId, level: levelIndex, collected, total: stars.length, timeMs: elapsed * 1000 }), 900);
    }
  };

  const respawn = () => {
    body.x = checkpoint.x; body.y = checkpoint.y + 0.5; body.vx = body.vy = 0;
  };

  const update = (dt: number) => {
    if (paused || finished) { ch.update(dt, body.x, body.y, 0, true); return; }
    elapsed += dt;
    tick += dt;
    if (tick >= 1) { tick -= 1; repo.tickPlaytime(); if (repo.limitReached()) { finished = true; nav.limit(); return; } }
    invuln = Math.max(0, invuln - dt);
    abilityCd = Math.max(0, abilityCd - dt);

    // Moving platforms.
    for (const m of movers) {
      m.phase += dt;
      const prev = m.b.x;
      m.b.x = m.x0 + Math.sin(m.phase * 0.9) * 2.2;
      m.b.vx = (m.b.x - prev) / dt;
      meshes.get(m.b.id!)!.position.x = m.b.x;
    }

    // Input → velocity.
    const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    const inSand = hero.ability !== 'shield' && sands.some((q) => Math.abs(body.x - q.x) < q.w / 2 && body.onGround && Math.abs(body.y - q.y) < 0.2);
    const speed = hero.stats.speed * (inSand ? 0.45 : 1);
    if (abilityT <= 0) body.vx += (dir * speed - body.vx) * Math.min(1, dt * (body.onGround ? 14 : 6));
    ch.face(dir);
    if (body.onGround) airJumps = 0;

    if (input.consume('jump')) {
      if (body.onGround) { body.vy = hero.stats.jump * (inSand ? 0.75 : 1); sfx.jump(); }
      else if (hero.ability === 'doubleJump' && airJumps < 1) { airJumps++; body.vy = hero.stats.jump * 0.9; sfx.jump(); burst(scene, ch.position.clone(), col3(hero.accent), 25, 2); }
    }
    if (input.consume('power') && abilityCd <= 0) usePower();
    if (abilityT > 0) abilityT -= dt;

    // Wind zones push upward; Zephyr glides by holding power.
    let gScale = 1; let maxFall = 24;
    for (const w of winds) if (Math.abs(body.x - w.x) < w.w / 2 && body.y < 9) { body.vy += w.force * dt * 1.6; }
    if (hero.ability === 'doubleJump' && input.held.power && body.vy < 0) { gScale = 0.25; maxFall = 2.5; }

    const solid = level.boxes.filter((b) => !(b.kind === 'breakable' && b.dead));
    body.step(dt, solid, gScale, maxFall);

    // Breakable rocks: Earth shield dash smashes them.
    if (hero.ability === 'shield' && abilityT > 0) {
      for (const b of level.boxes) if (b.kind === 'breakable' && !b.dead && Math.abs(b.x - body.x) < 1.3 && Math.abs(b.y - (body.y + 0.6)) < 1.2) {
        b.dead = true; meshes.get(b.id!)!.dispose(); sfx.hit(); burst(scene, new Vector3(b.x, b.y, 0), col3(0xc9a46a), 70, 6, 0.3);
      }
    }

    // Geysers.
    for (const g of geysers) {
      const on = ((elapsed + g.offset) % g.period) < g.period * 0.4;
      if (on !== g.active) { g.active = on; on ? g.ps.start() : g.ps.stop(); }
      if (on && Math.abs(body.x - g.x) < 0.7 && !(hero.ability === 'dash' && abilityT > 0)) loseHeart(new Color3(1, 0.4, 0));
    }

    // Fell into the hazard.
    if (body.y < -2.6) {
      if (world.hazard === 'water' && hero.ability === 'slide') {
        body.y = -2.4; body.vy = hero.stats.jump * 1.05; sfx.jump(); burst(scene, ch.position.clone(), col3(0x58c8ff), 50, 5);
      } else {
        const c = world.hazard === 'lava' ? new Color3(1, 0.4, 0) : new Color3(0.6, 0.85, 1);
        invuln = 0; loseHeart(c);
        if (!finished) respawn();
      }
    }

    // Stars.
    for (const s of stars) {
      if (s.taken) continue;
      s.mesh.rotation.y += dt * 2.4;
      if (body.intersects(s.x, s.y, 0.8, 0.8)) {
        s.taken = true; s.mesh.dispose(); collected++; sfx.star();
        burst(scene, new Vector3(s.x, s.y, 0), new Color3(1, 0.8, 0.3), 30, 3, 0.14);
      }
    }

    // Checkpoints.
    for (const f of flags) if (!f.on && body.x > f.x) {
      f.on = true; checkpoint = { x: f.x, y: f.top }; f.fm.albedoColor = col3(hero.color); f.fm.emissiveColor = col3(hero.color).scale(0.8);
      sfx.checkpoint(); say(t('hud.checkpoint'));
    }

    // Finish.
    portal.rotation.z += dt * 0.6;
    if (body.x > level.finishX - 0.5) {
      finished = true; sfx.win();
      const ratio = collected / Math.max(1, stars.length);
      const rating = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
      repo.recordLevel(levelKey(worldId, levelIndex), { stars: rating, timeMs: Math.round(elapsed * 1000) });
      burst(scene, portal.position, col3(hero.accent), 150, 7, 0.3);
      setTimeout(() => nav.result({ kind: 'parcours', win: true, worldId, level: levelIndex, stars: rating, collected, total: stars.length, timeMs: elapsed * 1000 }), 1100);
    }

    ch.update(dt, body.x, body.y, Math.abs(body.vx) / hero.stats.speed, body.onGround);
    ch.setVisible(invuln <= 0 || Math.floor(invuln * 12) % 2 === 0);

    // Camera follow with look-ahead.
    camTarget.set(body.x + ch_facing() * 1.6, Math.max(0.8, body.y + 1.2), 0);
    camPos.set(camTarget.x - 0.6, camTarget.y + 1.5, -9.2);
    camera.position = Vector3.Lerp(camera.position, camPos, Math.min(1, dt * 5));
    camera.setTarget(Vector3.Lerp(camera.getTarget(), camTarget, Math.min(1, dt * 6)));
    view.update(dt, camera.position.x);

    if (toastT > 0) { toastT -= dt; toast.alpha = Math.min(1, toastT * 2); }
    refreshHud();
  };

  let lastDir = 1;
  const ch_facing = () => { const d = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0); if (d) lastDir = d; return lastDir; };

  function usePower() {
    sfx.power();
    const f = lastDir;
    switch (hero.ability) {
      case 'dash': body.vx = 19 * f; body.vy = Math.max(body.vy, 2); abilityT = 0.22; abilityCd = 0.8; break;
      case 'slide': body.vx = 15 * f; abilityT = 0.35; abilityCd = 0.7; break;
      case 'shield': body.vx = 12 * f; abilityT = 0.45; abilityCd = 1; invuln = Math.max(invuln, 0.5); break;
      case 'lightLeap': body.vy = 15; body.vx = 6 * f; abilityT = 0.15; abilityCd = 1.1; break;
      case 'doubleJump': abilityCd = 0; return; // glide is held, handled in update
    }
    burst(scene, ch.position.add(new Vector3(0, 0.9, 0)), col3(hero.color), 45, 5);
  }

  refreshHud();
  respawn();
  let disposed = false;
  return {
    scene,
    update,
    dispose() {
      if (disposed) return; disposed = true;
      input.dispose(); ch.dispose(); geysers.forEach((g) => (g.ps as ParticleSystem).dispose()); scene.dispose();
    },
  };
}

function groundTopAt(boxes: Box[], x: number): number {
  const b = boxes.find((bb) => bb.kind === 'solid' && Math.abs(bb.x - x) <= bb.w / 2);
  return b ? b.y + b.h / 2 : 0;
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
