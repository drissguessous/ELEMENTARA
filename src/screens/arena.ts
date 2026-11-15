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
import type { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { Game, Screen } from '../core/game';
import { setupGraphics } from '../core/graphics';
import { Input } from '../core/input';
import { button, createUI, panel, place, text, GOLD } from '../core/ui';
import { aiFor, heroById, HEROES, type AiProfile, type HeroDef } from '../config/heroes';
import { worldById, levelKey, worldForElement } from '../config/worlds';
import { repo } from '../data/repository';
import { t } from '../i18n';
import { sfx } from '../systems/audio';
import { Character, col3 } from '../game/character';
import { Body, type Box } from '../game/physics';
import { WorldView } from '../game/worldview';
import { burst } from '../game/fx';
import { nav, type ArenaOptions } from './nav';

interface Fighter {
  def: HeroDef;
  ch: Character;
  body: Body;
  ai: AiProfile | null;
  hpMax: number;
  hp: number;
  lives: number;
  facing: number;
  atkCd: number;
  spCd: number;
  stun: number;
  invuln: number;
  airJumps: number;
  comboStep: number;
  comboT: number;
  guarding: boolean;
  guardHp: number;
  dashT: number;
  dashHit: boolean;
  novaT: number;
  shield: Mesh;
  bar: Rectangle;
  guardBar: Rectangle;
  livesTxt: TextBlock;
}

type ShotKind = 'orb' | 'bomb' | 'wave' | 'homing';
interface Shot { mesh: Mesh; kind: ShotKind; vx: number; vy: number; g: number; owner: Fighter; life: number; dmg: number }
interface Cmd { dir: number; jump: boolean; attack: boolean; power: boolean; guard: boolean }

const FLOOR_HALF = 9;
const GUARD_MAX = 100;
/** Global pacing: a fight lasts roughly 30-90 s depending on the opponent. */
const DAMAGE_SCALE = 0.5;

export async function arenaScreen(game: Game, opts: ArenaOptions): Promise<Screen> {
  const scene = new Scene(game.engine);
  const easy = repo.settings().mode === 'easy';
  const me = heroById(opts.me ?? (opts.mode === 'story' ? repo.profile().heroId : repo.fighterId()));
  const story = opts.mode === 'story' ? worldById(opts.worldId!) : null;
  const foe = heroById(opts.foe ?? (story ? (story.boss === me.id ? pickOther(me.id) : story.boss) : pickOther(me.id)));
  const world = story ?? worldById(opts.worldId ?? worldForElement(foe));

  const camera = new FreeCamera('cam', new Vector3(0, 4, -14), scene);
  camera.fov = 0.8; camera.minZ = 0.1;
  const light = setupGraphics(scene, camera, { warm: world.hazard !== 'wind' });
  const view = new WorldView(scene, world, true);
  view.backdrop.position.set(0, 7, 40);

  // Stage: main floor + two floating platforms.
  const boxes: Box[] = [
    { x: 0, y: -3, w: FLOOR_HALF * 2, h: 6, kind: 'solid' },
    { x: -5.2, y: 3.4, w: 4, h: 0.5, kind: 'oneway' },
    { x: 5.2, y: 3.4, w: 4, h: 0.5, kind: 'oneway' },
    // Arena barriers: no ring-outs, a fighter is only KO'd when their energy runs out (clearer for kids).
    { x: -FLOOR_HALF - 0.5, y: 8, w: 1, h: 22, kind: 'solid' },
    { x: FLOOR_HALF + 0.5, y: 8, w: 1, h: 22, kind: 'solid' },
  ];
  light.shadows.addShadowCaster(view.groundBlock(0, -3, FLOOR_HALF * 2, 6, 6), true);
  light.shadows.addShadowCaster(view.platform(-5.2, 3.4, 4, 0.5), true);
  light.shadows.addShadowCaster(view.platform(5.2, 3.4, 4, 0.5), true);
  const ring = MeshBuilder.CreateTorus('ring', { diameter: 8, thickness: 0.06, tessellation: 96 }, scene);
  ring.position.set(0, 0.03, 0.5);
  const rm = new PBRMaterial('ringMat', scene); rm.emissiveColor = new Color3(1, 0.75, 0.35); rm.albedoColor = Color3.Black();
  ring.material = rm;
  // Rune pillars marking the barriers.
  for (const sx of [-1, 1]) {
    const pillar = MeshBuilder.CreateCylinder('pillar', { height: 7, diameter: 0.4, tessellation: 24 }, scene);
    pillar.position.set(sx * (FLOOR_HALF + 0.1), 3.5, 0.6);
    const pm = new PBRMaterial('pillarMat', scene); pm.albedoColor = new Color3(0.2, 0.17, 0.15); pm.roughness = 0.6;
    pm.emissiveColor = new Color3(1, 0.7, 0.3).scale(0.08);
    pillar.material = pm;
    light.shadows.addShadowCaster(pillar);
    light.glow.addExcludedMesh(pillar);
  }

  const ui = createUI(scene);
  const input = new Input();
  input.attachTouch(ui, { combat: true });

  const mkFighter = async (def: HeroDef, x: number, ai: AiProfile | null, side: 'L' | 'R'): Promise<Fighter> => {
    const ch = await Character.create(scene, def, light.shadows);
    const card = panel(400, 92, 'rgba(14,9,30,0.72)');
    const H = side === 'L' ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
    place(card, side === 'L' ? 20 : -20, 14, H, Control.VERTICAL_ALIGNMENT_TOP);
    const name = text(def.name, 22, GOLD); place(name, 16, 6, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP);
    const rank = text(`${t('kind.' + def.kind)} · ${t('combat.tier')} ${def.tier}`, 15, '#ffffffaa');
    place(rank, 16, 34, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP);
    const livesTxt = text('', 22, '#ff9b9b'); place(livesTxt, -16, 6, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_TOP);
    const mkBar = (h: number, y: number, color: string) => {
      const track = new Rectangle(); track.widthInPixels = 368; track.heightInPixels = h; track.cornerRadius = h / 2; track.thickness = 0;
      track.background = 'rgba(255,255,255,0.14)';
      place(track, 0, y, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
      const bar = new Rectangle(); bar.heightInPixels = h; bar.cornerRadius = h / 2; bar.thickness = 0; bar.background = color;
      bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      track.addControl(bar); card.addControl(track);
      return bar;
    };
    const bar = mkBar(14, -18, '#' + def.color.toString(16).padStart(6, '0'));
    const guardBar = mkBar(5, -8, '#9fd4ff');
    card.addControl(name); card.addControl(rank); card.addControl(livesTxt);
    ui.addControl(card);

    const shield = MeshBuilder.CreateSphere('shield', { diameter: 2.1 * def.scale, segments: 24 }, scene);
    const sm = new PBRMaterial('shieldMat', scene);
    sm.unlit = true; sm.emissiveColor = col3(def.accent); sm.albedoColor = col3(def.color); sm.alpha = 0.22;
    shield.material = sm; shield.isVisible = false; shield.isPickable = false;

    const hpMax = 100 * (ai ? ai.hp : 1);
    const body = new Body(x, 4, 0.7 * def.scale, 1.75 * def.scale);
    const lives = ai ? 2 : easy ? 3 : 2;
    return {
      def, ch, body, ai, hpMax, hp: hpMax, lives, facing: x < 0 ? 1 : -1, atkCd: 0, spCd: 0.6, stun: 0, invuln: 1,
      airJumps: 0, comboStep: 0, comboT: 0, guarding: false, guardHp: GUARD_MAX, dashT: 0, dashHit: false, novaT: 0,
      shield, bar, guardBar, livesTxt,
    };
  };

  // Spawn on the main floor, clear of the floating platforms.
  const p1 = await mkFighter(me, -2.6, null, 'L');
  const p2 = await mkFighter(foe, 2.6, aiFor(foe.tier, easy), 'R');
  const fighters = [p1, p2];
  const other = (f: Fighter) => (f === p1 ? p2 : p1);
  const shots: Shot[] = [];
  scene.metadata = { fighters }; // QA / debugging (read by automated fight simulations)

  const banner = text(t('arena.fight'), 64, GOLD, '"Cinzel", Georgia, serif'); ui.addControl(banner);
  const help = text(t('combat.controls'), 18, '#ffffffcc'); place(help, 0, 118, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(help);
  let bannerT = 1.6;
  let helpT = 5;
  const say = (msg: string, dur = 1) => { banner.text = msg; bannerT = dur; };
  let over = false;
  let elapsed = 0;
  let tick = 0;
  let paused = false;
  let shake = 0;
  const camLook = new Vector3(0, 1.5, 0);

  const leave = () => (opts.mode === 'story' ? nav.map() : opts.mode === 'tournament' ? nav.tournament() : nav.combat());
  const pauseBox = panel(420, 260); pauseBox.isVisible = false;
  const pStack = new StackPanel(); pStack.spacing = 18; pauseBox.addControl(pStack);
  pStack.addControl(text(t('hud.pause'), 38, GOLD));
  pStack.addControl(button(t('hud.resume'), () => { paused = false; pauseBox.isVisible = false; }, { primary: true }));
  pStack.addControl(button(t('hud.quit'), () => leave()));
  ui.addControl(pauseBox);
  const pauseBtn = button('II', () => { paused = true; pauseBox.isVisible = true; }, { w: 64, h: 64 });
  place(pauseBtn, 0, 16, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(pauseBtn);

  // ------------------------------------------------------------------ combat rules
  const dmgMul = (f: Fighter) => (f.ai ? f.ai.damage : 1);

  const hit = (from: Fighter, to: Fighter, base: number, dir: number, kbScale = 1) => {
    if (to.invuln > 0 || over) return;
    const raw = base * dmgMul(from) * DAMAGE_SCALE;
    const facingAttacker = Math.sign(from.body.x - to.body.x || -dir) === to.facing;
    if (to.guarding && facingAttacker) {
      // Blocked: tiny chip damage, the guard gauge absorbs the rest.
      to.hp = Math.max(1, to.hp - raw * 0.12);
      to.guardHp -= raw * 2.4;
      to.body.vx = dir * 2.5 * kbScale;
      burst(scene, to.ch.position.add(new Vector3(-dir * 0.4, to.def.scale, -0.3)), col3(to.def.accent), 25, 3, 0.12);
      sfx.click();
      if (to.guardHp <= 0) { to.guarding = false; to.guardHp = 0; to.stun = 1.1; say(t('combat.guardBreak'), 0.9); sfx.hit(); }
      return;
    }
    to.hp = Math.max(0, to.hp - raw * to.def.stats.guard);
    const hurt = 1 - to.hp / to.hpMax;
    to.body.vx = dir * (4 + hurt * 9) * kbScale;
    to.body.vy = (3 + hurt * 5) * Math.min(1.4, kbScale);
    to.stun = 0.25 + 0.1 * kbScale;
    to.comboStep = 0; to.guarding = false;
    to.ch.hurt();
    sfx.hit();
    shake = Math.max(shake, 0.12 * kbScale);
    burst(scene, to.ch.position.add(new Vector3(0, 1.1 * to.def.scale, 0)), col3(from.def.color), 30 + 15 * kbScale, 4 + kbScale, 0.16);
    if (to.hp <= 0) ko(to);
  };

  const ko = (f: Fighter) => {
    f.lives--; sfx.ko();
    burst(scene, f.ch.position.add(new Vector3(0, 1, 0)), col3(f.def.accent), 160, 8, 0.3);
    if (f.lives <= 0) { end(f === p2); return; }
    f.hp = f.hpMax; f.guardHp = GUARD_MAX; f.body.x = 0; f.body.y = 9; f.body.vx = f.body.vy = 0; f.invuln = 1.5;
    say(t('arena.ko'));
  };

  const end = (win: boolean) => {
    if (over) return;
    over = true;
    win ? sfx.win() : sfx.lose();
    say(win ? t('result.win') : t('result.lose'), 99);
    const durationMs = Math.round(elapsed * 1000);
    repo.recordMatch({ heroId: me.id, opponent: foe.id, arena: world.id, result: win ? 'win' : 'lose', durationMs });
    const stars = win ? (p1.lives >= 2 ? 3 : 2) : 0;
    let unlocked: string | undefined;
    if (win && opts.mode === 'story') repo.recordLevel(levelKey(world.id, 'arena'), { stars, timeMs: durationMs, won: true });
    if (win && opts.mode === 'tournament' && repo.recordTournamentWin(foe.id) && !HEROES.some((h) => h.id === foe.id)) unlocked = foe.id;
    setTimeout(() => nav.result({ kind: 'arena', win, worldId: world.id, level: -1, timeMs: durationMs, stars, arena: opts, unlocked }), 1600);
  };

  // ------------------------------------------------------------------ specials
  const orb = (f: Fighter, kind: ShotKind, vx: number, vy: number, g: number, dmg: number, size = 0.5, life = 1.4) => {
    const m = MeshBuilder.CreateSphere('shot', { diameter: size, segments: 12 }, scene);
    const mat = new PBRMaterial('shotMat', scene);
    mat.emissiveColor = col3(f.def.projectile); mat.albedoColor = col3(f.def.projectile); mat.unlit = true;
    m.material = mat;
    if (kind === 'wave') { m.scaling.set(1.6, 0.45, 1.2); m.position.set(f.body.x + f.facing * 0.9, 0.3, 0); }
    else m.position.set(f.body.x + f.facing * 0.8 * f.def.scale, f.body.y + 1.15 * f.def.scale, 0);
    shots.push({ mesh: m, kind, vx, vy, g, owner: f, life, dmg });
  };

  const special = (f: Fighter) => {
    const p = f.def.stats.power;
    const d = f.facing;
    f.ch.attack();
    sfx.power();
    switch (f.def.special) {
      case 'bolt': orb(f, 'orb', 15 * d, 0, 0, p * 1.2); f.spCd = 1.4; break;
      case 'triple': [-2.2, 0, 2.2].forEach((vy) => orb(f, 'orb', 13 * d, vy, 0, p * 0.75, 0.38)); f.spCd = 1.9; break;
      case 'arc': orb(f, 'bomb', 7.5 * d, 10, 22, p * 1.6, 0.6, 3); f.spCd = 1.9; break;
      case 'wave': orb(f, 'wave', 10.5 * d, 0, 0, p * 1.3, 0.7, 1.6); f.spCd = 1.8; break;
      case 'homing': orb(f, 'homing', 6 * d, 1, 0, p * 1.1, 0.55, 3); f.spCd = 2.2; break;
      case 'dash': f.dashT = 0.26; f.dashHit = false; f.invuln = Math.max(f.invuln, 0.2); f.spCd = 1.5; break;
      case 'nova': f.novaT = 0.22; f.spCd = 2.1; break;
    }
  };

  const novaBurst = (f: Fighter) => {
    const o = other(f);
    const pos = f.ch.position.add(new Vector3(0, f.def.scale, 0));
    burst(scene, pos, col3(f.def.projectile), 140, 9, 0.28);
    const sphere = MeshBuilder.CreateSphere('nova', { diameter: 1, segments: 20 }, scene);
    const m = new PBRMaterial('novaMat', scene); m.unlit = true; m.emissiveColor = col3(f.def.projectile); m.alpha = 0.35;
    sphere.material = m; sphere.position.copyFrom(pos);
    let s = 1;
    const obs = scene.onBeforeRenderObservable.add(() => {
      s += 0.35; sphere.scaling.setAll(s); m.alpha -= 0.03;
      if (m.alpha <= 0) { scene.onBeforeRenderObservable.remove(obs); sphere.dispose(); }
    });
    const dx = o.body.x - f.body.x;
    if (Math.hypot(dx, o.body.y - f.body.y) < 2.4 + 0.5 * (f.def.scale - 1)) hit(f, o, f.def.stats.power * 1.4, Math.sign(dx) || f.facing, 1.5);
  };

  // ------------------------------------------------------------------ per-fighter step
  const control = (f: Fighter, dt: number, cmd: Cmd) => {
    const o = other(f);
    f.atkCd = Math.max(0, f.atkCd - dt); f.spCd = Math.max(0, f.spCd - dt);
    f.stun = Math.max(0, f.stun - dt); f.invuln = Math.max(0, f.invuln - dt);
    f.comboT = Math.max(0, f.comboT - dt); if (f.comboT === 0) f.comboStep = 0;
    const speed = f.def.stats.speed * (f.ai ? f.ai.speed : 1);

    f.guarding = f.stun <= 0 && cmd.guard && f.body.onGround && f.guardHp > 10 && f.dashT <= 0;
    if (!f.guarding) f.guardHp = Math.min(GUARD_MAX, f.guardHp + 22 * dt);

    if (f.dashT > 0) {
      f.dashT -= dt;
      f.body.vx = 20 * f.facing;
      if (!f.dashHit && f.body.intersects(o.body.x, o.body.y + o.body.h / 2, o.body.w + 0.4, o.body.h)) {
        f.dashHit = true; hit(f, o, f.def.stats.power * 1.5, f.facing, 1.4);
      }
    } else if (f.stun <= 0) {
      const target = f.guarding ? 0 : cmd.dir * speed;
      f.body.vx += (target - f.body.vx) * Math.min(1, dt * (f.body.onGround ? 14 : 5));
      if (cmd.dir && !f.guarding) f.facing = Math.sign(cmd.dir);
      if (f.body.onGround) f.airJumps = 0;
      if (cmd.jump && !f.guarding) {
        if (f.body.onGround) { f.body.vy = f.def.stats.jump; sfx.jump(); }
        else if (f.airJumps < (f.def.element === 'wind' ? 2 : 1)) { f.airJumps++; f.body.vy = f.def.stats.jump * 0.85; }
      }
      if (cmd.attack && f.atkCd <= 0 && !f.guarding) {
        // Three-hit combo: two quick jabs, then a finisher that launches.
        f.comboStep = f.comboT > 0 && f.comboStep < 3 ? f.comboStep + 1 : 1;
        f.comboT = 0.55;
        const finisher = f.comboStep === 3;
        f.atkCd = finisher ? 0.5 : 0.2;
        f.ch.attack();
        const reach = 1.55 * f.def.scale + (finisher ? 0.2 : 0);
        const dx = o.body.x - f.body.x;
        if (Math.sign(dx) === f.facing && Math.abs(dx) < reach + o.body.w / 2 && Math.abs(o.body.y - f.body.y) < 1.4 * Math.max(f.def.scale, o.def.scale)) {
          hit(f, o, f.def.stats.power * (finisher ? 1.5 : 0.7), f.facing, finisher ? 1.7 : 0.45);
        }
      }
      if (cmd.power && f.spCd <= 0 && !f.guarding) special(f);
    }
    if (f.novaT > 0) { f.novaT -= dt; if (f.novaT <= 0) novaBurst(f); }

    f.ch.face(f.facing);
    f.body.step(dt, boxes);
    if (f.body.y < -8 || Math.abs(f.body.x) > 17) { f.hp = 0; ko(f); }
    f.ch.update(dt, f.body.x, f.body.y, Math.abs(f.body.vx) / speed, f.body.onGround);
    f.ch.setVisible(f.invuln <= 0 || Math.floor(f.invuln * 12) % 2 === 0);
    f.shield.isVisible = f.guarding;
    f.shield.position.set(f.body.x, f.body.y + 0.95 * f.def.scale, 0);
    f.bar.widthInPixels = 368 * (f.hp / f.hpMax);
    f.guardBar.widthInPixels = 368 * (f.guardHp / GUARD_MAX);
    f.livesTxt.text = '❤'.repeat(Math.max(0, f.lives));
  };

  // ------------------------------------------------------------------ AI (strength from the fighter's tier)
  let aiThink = 0;
  let aiCmd: Cmd = { dir: 0, jump: false, attack: false, power: false, guard: false };
  const aiControl = (f: Fighter, dt: number): Cmd => {
    const p = f.ai!;
    const o = other(f);
    const dx = o.body.x - f.body.x;
    const dist = Math.abs(dx);
    const dy = o.body.y - f.body.y;
    aiThink -= dt;
    const keepCombo = f.comboStep > 0 && f.comboStep < 3 && f.atkCd <= 0 && dist < 1.9 * f.def.scale && Math.random() < p.combo;
    // Climb toward a target standing on a platform: jump, then use air jumps near the apex.
    const climb = dy > 1.2 && Math.abs(dx) < 4.5 && !f.body.onGround && f.body.vy < 1.5 && f.airJumps < (f.def.element === 'wind' ? 2 : 1);
    if (aiThink > 0) return { ...aiCmd, jump: climb, power: false, attack: keepCombo };
    aiThink = p.think * (0.7 + Math.random() * 0.6);

    const incoming = shots.some((s) => s.owner !== f && Math.sign(f.body.x - s.mesh.position.x) === Math.sign(s.vx) && Math.abs(f.body.x - s.mesh.position.x) < 5);
    const waveIncoming = shots.some((s) => s.owner !== f && s.kind === 'wave' && Math.abs(f.body.x - s.mesh.position.x) < 3.2);
    const threatened = (o.comboT > 0.3 && dist < 2.2) || o.novaT > 0 || o.dashT > 0 || incoming;
    const offStage = Math.abs(f.body.x) > FLOOR_HALF - 0.5 && f.body.y < 0.5;

    const cmd: Cmd = { dir: 0, jump: false, attack: false, power: false, guard: false };
    if (offStage) {
      cmd.dir = -Math.sign(f.body.x); cmd.jump = f.body.vy < 1;
    } else if (waveIncoming && f.body.onGround && Math.random() < 0.3 + p.block) {
      cmd.jump = true; cmd.dir = Math.sign(dx);
    } else if (threatened && Math.random() < p.block) {
      cmd.guard = true; f.facing = Math.sign(dx) || f.facing;
    } else {
      const ranged = ['bolt', 'triple', 'arc', 'wave', 'homing'].includes(f.def.special);
      const close = f.def.special === 'nova' || f.def.special === 'dash';
      const goodSpecial = f.spCd <= 0 && ((ranged && dist > 3.5 && Math.abs(dy) < 1.5) || (close && dist < (f.def.special === 'dash' ? 5 : 2.3)));
      if (goodSpecial && Math.random() < p.special) { f.facing = Math.sign(dx) || f.facing; cmd.power = true; }
      else if (dist < 1.6 * f.def.scale + 0.3 && Math.abs(dy) < 1.3) { f.facing = Math.sign(dx) || f.facing; cmd.attack = Math.random() < p.aggression; }
      else cmd.dir = Math.sign(dx);
      if (dy > 1.2 && f.body.onGround && Math.abs(dx) < 4.5) cmd.jump = true;
      if (Math.random() < 0.03) cmd.jump = true;
    }
    aiCmd = cmd;
    return cmd;
  };

  // ------------------------------------------------------------------ frame
  const update = (dt: number) => {
    if (paused) return;
    view.update(dt, camera.position.x);
    ring.rotation.y += dt * 0.3;
    bannerT -= dt; banner.alpha = Math.max(0, Math.min(1, bannerT * 2));
    helpT -= dt; help.alpha = Math.max(0, Math.min(1, helpT));
    if (over) { fighters.forEach((f) => { f.shield.isVisible = false; f.ch.update(dt, f.body.x, f.body.y, 0, true); }); return; }
    elapsed += dt;
    tick += dt;
    if (tick >= 1) { tick -= 1; repo.tickPlaytime(); if (repo.limitReached()) { over = true; nav.limit(); return; } }

    const dir = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0);
    control(p1, dt, { dir, jump: input.consume('jump'), attack: input.consume('attack'), power: input.consume('power'), guard: input.held.guard });
    control(p2, dt, aiControl(p2, dt));

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const target = other(s.owner);
      if (s.kind === 'homing') {
        const tx = target.body.x - s.mesh.position.x;
        const ty = target.body.y + target.body.h * 0.55 - s.mesh.position.y;
        const len = Math.hypot(tx, ty) || 1;
        s.vx += ((tx / len) * 7 - s.vx) * Math.min(1, dt * 2.2);
        s.vy += ((ty / len) * 7 - s.vy) * Math.min(1, dt * 2.2);
      }
      s.vy -= s.g * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.life -= dt;
      const pos = s.mesh.position;
      let done = s.life <= 0;
      const onFloor = Math.abs(pos.x) < FLOOR_HALF && pos.y <= 0.25;
      if (s.kind === 'bomb') {
        if (onFloor || target.body.intersects(pos.x, pos.y, 0.7, 0.7)) {
          burst(scene, pos.clone(), col3(s.owner.def.projectile), 90, 6, 0.25);
          if (Math.abs(target.body.x - pos.x) < 1.7 && Math.abs(target.body.y - pos.y) < 1.8) hit(s.owner, target, s.dmg, Math.sign(target.body.x - pos.x) || 1, 1.3);
          done = true;
        }
      } else if (s.kind === 'wave') {
        if (Math.abs(pos.x) > FLOOR_HALF) done = true;
        else if (target.body.onGround && target.body.y < 0.6 && Math.abs(target.body.x - pos.x) < 0.8) { hit(s.owner, target, s.dmg, Math.sign(s.vx), 1.2); done = true; }
      } else if (target.body.intersects(pos.x, pos.y, 0.6, 0.6)) {
        hit(s.owner, target, s.dmg, Math.sign(s.vx) || 1, 1); done = true;
      }
      if (done) { s.mesh.dispose(); shots.splice(i, 1); }
    }

    // Camera frames both fighters, with a short shake on heavy hits.
    const cx = (p1.body.x + p2.body.x) / 2;
    const cy = Math.max(1.5, (p1.body.y + p2.body.y) / 2 + 1);
    const spread = Math.abs(p1.body.x - p2.body.x);
    const big = Math.max(p1.def.scale, p2.def.scale);
    const dist = Math.min(17, Math.max(7.6 * big, spread * 0.8 + 5));
    shake = Math.max(0, shake - dt);
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
    camera.position = Vector3.Lerp(camera.position, new Vector3(cx * 0.8 + sx, cy + 2.4 + sy, -dist), Math.min(1, dt * 3));
    camLook.copyFrom(Vector3.Lerp(camLook, new Vector3(cx * 0.8, cy, 0), Math.min(1, dt * 4)));
    camera.setTarget(camLook);
  };

  let disposed = false;
  return {
    scene,
    update,
    dispose() { if (disposed) return; disposed = true; input.dispose(); fighters.forEach((f) => f.ch.dispose()); scene.dispose(); },
  };
}

function pickOther(id: string) {
  const ids = HEROES.map((h) => h.id).filter((x) => x !== id);
  return ids[Math.floor(Math.random() * ids.length)];
}
