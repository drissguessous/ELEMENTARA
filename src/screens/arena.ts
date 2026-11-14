import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import type { Game, Screen } from '../core/game';
import { setupGraphics } from '../core/graphics';
import { Input } from '../core/input';
import { button, createUI, panel, place, text, GOLD } from '../core/ui';
import { heroById, type HeroDef } from '../config/heroes';
import { worldById, levelKey } from '../config/worlds';
import { repo } from '../data/repository';
import { t } from '../i18n';
import { sfx } from '../systems/audio';
import { Character, col3 } from '../game/character';
import { Body, type Box } from '../game/physics';
import { WorldView } from '../game/worldview';
import { burst } from '../game/fx';
import { nav } from './nav';

interface Fighter {
  hero: HeroDef;
  ch: Character;
  body: Body;
  hp: number;
  lives: number;
  facing: number;
  atkCd: number;
  spCd: number;
  stun: number;
  invuln: number;
  airJumps: number;
  bar: Rectangle;
  livesTxt: ReturnType<typeof text>;
  ai: boolean;
}

interface Shot { mesh: Mesh; vx: number; owner: Fighter; life: number; dmg: number }

export async function arenaScreen(game: Game, worldId: string, opponentId?: string, free = false): Promise<Screen> {
  const scene = new Scene(game.engine);
  const world = worldById(worldId);
  const easy = repo.settings().mode === 'easy';
  const camera = new FreeCamera('cam', new Vector3(0, 4, -14), scene);
  camera.fov = 0.8; camera.minZ = 0.1;
  const light = setupGraphics(scene, camera, { warm: world.hazard !== 'wind' });
  const view = new WorldView(scene, world, true);
  view.backdrop.position.set(0, 7, 40);

  // Stage: main floor + two floating platforms.
  const boxes: Box[] = [
    { x: 0, y: -3, w: 18, h: 6, kind: 'solid' },
    { x: -5.2, y: 3.4, w: 4, h: 0.5, kind: 'oneway' },
    { x: 5.2, y: 3.4, w: 4, h: 0.5, kind: 'oneway' },
  ];
  light.shadows.addShadowCaster(view.groundBlock(0, -3, 18, 6, 6), true);
  light.shadows.addShadowCaster(view.platform(-5.2, 3.4, 4, 0.5), true);
  light.shadows.addShadowCaster(view.platform(5.2, 3.4, 4, 0.5), true);
  // Glowing runic ring on the floor.
  const ring = MeshBuilder.CreateTorus('ring', { diameter: 8, thickness: 0.06, tessellation: 96 }, scene);
  ring.position.set(0, 0.03, 0.5);
  const rm = new PBRMaterial('ringMat', scene); rm.emissiveColor = new Color3(1, 0.75, 0.35); rm.albedoColor = Color3.Black();
  ring.material = rm;

  const me = heroById(repo.profile().heroId);
  const foe = heroById(opponentId ?? (world.boss === me.id ? pickOther(me.id) : world.boss));
  const ui = createUI(scene);
  const input = new Input();
  input.attachTouch(ui, { attack: true });

  const mkFighter = async (hero: HeroDef, x: number, ai: boolean, side: 'L' | 'R'): Promise<Fighter> => {
    const ch = await Character.create(scene, hero, light.shadows);
    const card = panel(380, 74, 'rgba(14,9,30,0.7)');
    place(card, side === 'L' ? 20 : -20, 16, side === 'L' ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_TOP);
    const name = text(hero.name, 22, GOLD); place(name, 16, 8, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP);
    const livesTxt = text('', 22, '#ff9b9b'); place(livesTxt, -16, 8, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_TOP);
    const track = new Rectangle(); track.widthInPixels = 348; track.heightInPixels = 16; track.cornerRadius = 8; track.thickness = 0; track.background = 'rgba(255,255,255,0.15)';
    place(track, 0, -12, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
    const bar = new Rectangle(); bar.heightInPixels = 16; bar.cornerRadius = 8; bar.thickness = 0;
    bar.background = '#' + hero.color.toString(16).padStart(6, '0');
    bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    track.addControl(bar);
    card.addControl(name); card.addControl(livesTxt); card.addControl(track);
    ui.addControl(card);
    const lives = ai ? 2 : easy ? 3 : 2;
    return { hero, ch, body: new Body(x, 4), hp: 100, lives, facing: x < 0 ? 1 : -1, atkCd: 0, spCd: 0, stun: 0, invuln: 1, airJumps: 0, bar, livesTxt, ai };
  };

  const p1 = await mkFighter(me, -4, false, 'L');
  const p2 = await mkFighter(foe, 4, true, 'R');
  const fighters = [p1, p2];
  const shots: Shot[] = [];
  const banner = text(t('arena.fight'), 64, GOLD, '"Cinzel", Georgia, serif'); ui.addControl(banner);
  let bannerT = 1.4;
  let over = false;
  let elapsed = 0;
  let tick = 0;
  let paused = false;

  const pauseBox = panel(420, 260); pauseBox.isVisible = false;
  const pStack = new StackPanel(); pStack.spacing = 18; pauseBox.addControl(pStack);
  pStack.addControl(text(t('hud.pause'), 38, GOLD));
  pStack.addControl(button(t('hud.resume'), () => { paused = false; pauseBox.isVisible = false; }, { primary: true }));
  pStack.addControl(button(t('hud.quit'), () => (free ? nav.title() : nav.map())));
  ui.addControl(pauseBox);
  const pauseBtn = button('II', () => { paused = true; pauseBox.isVisible = true; }, { w: 64, h: 64 });
  place(pauseBtn, 0, 16, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(pauseBtn);

  const hit = (from: Fighter, to: Fighter, dmg: number, dir: number) => {
    if (to.invuln > 0) return;
    const real = dmg * to.hero.stats.guard;
    to.hp = Math.max(0, to.hp - real);
    const kb = 6 + (100 - to.hp) * 0.09;
    to.body.vx = dir * kb; to.body.vy = 5 + (100 - to.hp) * 0.03;
    to.stun = 0.3; to.ch.hurt();
    sfx.hit();
    burst(scene, to.ch.position.add(new Vector3(0, 1.1, 0)), col3(from.hero.color), 40, 5);
    if (to.hp <= 0) ko(to);
  };

  const ko = (f: Fighter) => {
    f.lives--; sfx.ko();
    burst(scene, f.ch.position.add(new Vector3(0, 1, 0)), col3(f.hero.accent), 160, 8, 0.3);
    if (f.lives <= 0) { end(f === p2); return; }
    f.hp = 100; f.body.x = 0; f.body.y = 9; f.body.vx = f.body.vy = 0; f.invuln = 1.5;
    banner.text = t('arena.ko'); bannerT = 1;
  };

  const end = (win: boolean) => {
    if (over) return;
    over = true;
    win ? sfx.win() : sfx.lose();
    banner.text = win ? t('result.win') : t('result.lose'); bannerT = 99;
    repo.recordMatch({ heroId: me.id, opponent: foe.id, arena: worldId, result: win ? 'win' : 'lose', durationMs: Math.round(elapsed * 1000) });
    if (win && !free) repo.recordLevel(levelKey(worldId, 'arena'), { stars: p1.lives >= 2 ? 3 : 2, timeMs: Math.round(elapsed * 1000), won: true });
    setTimeout(() => nav.result({ kind: 'arena', win, worldId, level: -1, timeMs: elapsed * 1000, free, stars: win ? (p1.lives >= 2 ? 3 : 2) : 0 }), 1600);
  };

  const shoot = (f: Fighter) => {
    const m = MeshBuilder.CreateSphere('shot', { diameter: 0.5, segments: 12 }, scene);
    const mat = new PBRMaterial('shotMat', scene);
    mat.emissiveColor = col3(f.hero.projectile); mat.albedoColor = col3(f.hero.projectile); mat.unlit = true;
    m.material = mat;
    m.position.set(f.body.x + f.facing * 0.8, f.body.y + 1.15, 0);
    shots.push({ mesh: m, vx: 15 * f.facing, owner: f, life: 1.4, dmg: f.hero.stats.power * 1.2 });
    sfx.power();
  };

  const control = (f: Fighter, dt: number, cmd: { dir: number; jump: boolean; attack: boolean; power: boolean }) => {
    const other = f === p1 ? p2 : p1;
    f.atkCd = Math.max(0, f.atkCd - dt); f.spCd = Math.max(0, f.spCd - dt);
    f.stun = Math.max(0, f.stun - dt); f.invuln = Math.max(0, f.invuln - dt);
    if (f.stun <= 0) {
      f.body.vx += (cmd.dir * f.hero.stats.speed - f.body.vx) * Math.min(1, dt * (f.body.onGround ? 14 : 5));
      if (cmd.dir) f.facing = Math.sign(cmd.dir);
      if (f.body.onGround) f.airJumps = 0;
      if (cmd.jump) {
        if (f.body.onGround) { f.body.vy = f.hero.stats.jump; sfx.jump(); }
        else if (f.airJumps < (f.hero.ability === 'doubleJump' ? 2 : 1)) { f.airJumps++; f.body.vy = f.hero.stats.jump * 0.85; }
      }
      if (cmd.attack && f.atkCd <= 0) {
        f.atkCd = 0.38; f.ch.attack();
        const dx = other.body.x - f.body.x;
        if (Math.sign(dx) === f.facing && Math.abs(dx) < 1.6 && Math.abs(other.body.y - f.body.y) < 1.4) hit(f, other, f.hero.stats.power, f.facing);
      }
      if (cmd.power && f.spCd <= 0) { f.spCd = 1.6; f.ch.attack(); shoot(f); }
    }
    f.ch.face(f.facing);
    f.body.step(dt, boxes);
    if (f.body.y < -8 || Math.abs(f.body.x) > 17) { f.hp = 0; ko(f); }
    f.ch.update(dt, f.body.x, f.body.y, Math.abs(f.body.vx) / f.hero.stats.speed, f.body.onGround);
    f.ch.setVisible(f.invuln <= 0 || Math.floor(f.invuln * 12) % 2 === 0);
    f.bar.widthInPixels = 348 * (f.hp / 100);
    f.livesTxt.text = '❤'.repeat(Math.max(0, f.lives));
  };

  // Simple, readable AI. Expert mode reacts faster and attacks more.
  let aiThink = 0;
  let aiCmd = { dir: 0, jump: false, attack: false, power: false };
  const ai = (f: Fighter, dt: number) => {
    aiThink -= dt;
    const o = p1.body;
    const dx = o.x - f.body.x;
    if (aiThink <= 0) {
      aiThink = easy ? 0.32 : 0.16;
      const offStage = Math.abs(f.body.x) > 8.5;
      aiCmd = {
        dir: offStage ? -Math.sign(f.body.x) : Math.abs(dx) > 1.2 ? Math.sign(dx) : 0,
        jump: offStage ? f.body.vy < 1 : (o.y - f.body.y > 1.5 && Math.random() < 0.5) || Math.random() < 0.04,
        attack: Math.abs(dx) < 1.6 && Math.abs(o.y - f.body.y) < 1.2 && Math.random() < (easy ? 0.45 : 0.8),
        power: Math.abs(dx) > 4 && Math.abs(o.y - f.body.y) < 1 && Math.random() < (easy ? 0.15 : 0.35),
      };
      if (aiCmd.dir) f.facing = Math.sign(aiCmd.dir);
      else f.facing = Math.sign(dx) || f.facing;
    } else { aiCmd.jump = false; aiCmd.attack = false; aiCmd.power = false; }
    return aiCmd;
  };

  const update = (dt: number) => {
    if (paused) return;
    view.update(dt, camera.position.x);
    ring.rotation.y += dt * 0.3;
    if (bannerT > 0) { bannerT -= dt; banner.alpha = Math.min(1, bannerT * 2); }
    if (over) { fighters.forEach((f) => f.ch.update(dt, f.body.x, f.body.y, 0, true)); return; }
    elapsed += dt;
    tick += dt;
    if (tick >= 1) { tick -= 1; repo.tickPlaytime(); if (repo.limitReached()) { over = true; nav.limit(); return; } }
    const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    control(p1, dt, { dir, jump: input.consume('jump'), attack: input.consume('attack'), power: input.consume('power') });
    control(p2, dt, ai(p2, dt));

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.mesh.position.x += s.vx * dt; s.life -= dt;
      const target = s.owner === p1 ? p2 : p1;
      const hitIt = target.body.intersects(s.mesh.position.x, s.mesh.position.y, 0.6, 0.6);
      if (hitIt) hit(s.owner, target, s.dmg, Math.sign(s.vx));
      if (hitIt || s.life <= 0) { s.mesh.dispose(); shots.splice(i, 1); }
    }

    // Camera frames both fighters.
    const cx = (p1.body.x + p2.body.x) / 2;
    const cy = Math.max(1.5, (p1.body.y + p2.body.y) / 2 + 1);
    const spread = Math.abs(p1.body.x - p2.body.x);
    const dist = Math.min(19, Math.max(10.5, spread * 0.95 + 6.5));
    camera.position = Vector3.Lerp(camera.position, new Vector3(cx * 0.8, cy + 3, -dist), Math.min(1, dt * 3));
    camera.setTarget(Vector3.Lerp(camera.getTarget(), new Vector3(cx * 0.8, cy, 0), Math.min(1, dt * 4)));
  };

  let disposed = false;
  return {
    scene,
    update,
    dispose() { if (disposed) return; disposed = true; input.dispose(); fighters.forEach((f) => f.ch.dispose()); scene.dispose(); },
  };
}

function pickOther(id: string) {
  const ids = ['fire', 'water', 'wind', 'earth', 'light'].filter((x) => x !== id);
  return ids[Math.floor(Math.random() * ids.length)];
}
