import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { Grid } from '@babylonjs/gui/2D/controls/grid';
import { Image } from '@babylonjs/gui/2D/controls/image';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import type { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import type { Game, Screen } from '../core/game';
import { bgImage, button, createUI, FONT, GOLD, panel, place, text } from '../core/ui';
import { HEROES, heroById } from '../config/heroes';
import { WORLDS, levelKey, worldById } from '../config/worlds';
import { repo } from '../data/repository';
import { t } from '../i18n';
import { sfx } from '../systems/audio';
import { fmt } from './parcours';
import { nav, type ResultInfo } from './nav';

/** Base for 2D GUI screens: an empty scene + full-screen UI. */
function guiScene(game: Game): { scene: Scene; ui: AdvancedDynamicTexture } {
  const scene = new Scene(game.engine);
  scene.clearColor = new Color4(0.07, 0.05, 0.14, 1);
  new FreeCamera('c', Vector3.Zero(), scene);
  return { scene, ui: createUI(scene) };
}
const done = (scene: Scene): Screen => ({ scene, dispose: () => scene.dispose() });
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

function backButton(ui: AdvancedDynamicTexture, onClick: () => void) {
  const b = button('← ' + t('common.back'), onClick, { w: 190, h: 56, size: 22 });
  place(b, 24, 20, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(b);
}

// ---------------------------------------------------------------- Title
export function titleScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/temple-arena.webp', 0.25);
  const logo = text('ELEMENTARA', 104, GOLD, FONT);
  logo.shadowColor = 'rgba(255,170,60,0.85)'; logo.shadowBlur = 34;
  place(logo, 0, 70, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(logo);
  const tag = text(t('title.tagline'), 28, '#fff3d6', FONT);
  place(tag, 0, 200, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(tag);

  const menu = new StackPanel(); menu.spacing = 16; place(menu, 0, 110);
  menu.addControl(button(t('title.play'), () => nav.heroSelect('map'), { primary: true, w: 340, h: 72, size: 30 }));
  menu.addControl(button(t('title.arena'), () => nav.heroSelect('arena'), { w: 340 }));
  menu.addControl(button(t('title.leaderboard'), () => nav.leaderboard(), { w: 340 }));
  ui.addControl(menu);

  const parents = button('🔒 ' + t('title.parents'), () => nav.parents(), { w: 240, h: 52, size: 20 });
  place(parents, -24, -20, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM);
  ui.addControl(parents);

  const p = repo.profile();
  const card = panel(330, 70);
  place(card, 24, -20, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_BOTTOM);
  const who = text(`${t('title.player')} : ${p.nickname}  ★ ${p.totalStars}`, 22, '#fff');
  place(who, 18, 0, Control.HORIZONTAL_ALIGNMENT_LEFT);
  card.addControl(who);
  if (repo.profiles().length > 1) {
    const sw = button(t('title.switch'), () => { repo.cycleProfile(); nav.title(); }, { w: 100, h: 44, size: 18 });
    place(sw, -12, 0, Control.HORIZONTAL_ALIGNMENT_RIGHT);
    card.addControl(sw);
  }
  ui.addControl(card);
  return done(scene);
}

// ---------------------------------------------------------------- Hero select
export function heroSelectScreen(game: Game, next: 'map' | 'arena'): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/riad-arena.webp', 0.55);
  backButton(ui, () => nav.title());
  const title = text(t('select.title'), 44, GOLD, FONT);
  place(title, 0, 24, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(title);

  let current = heroById(repo.profile().heroId);
  // Large artwork — the original image, untouched.
  const art = new Image('art', current.art);
  art.stretch = Image.STRETCH_UNIFORM;
  art.widthInPixels = 360; art.heightInPixels = 520;
  place(art, -300, 40);
  ui.addControl(art);

  const info = panel(500, 380);
  place(info, 230, -30);
  const stack = new StackPanel(); stack.paddingTopInPixels = 20; stack.spacing = 10;
  info.addControl(stack);
  const name = text('', 46, GOLD, FONT);
  const role = text('', 22, '#ffffff');
  const ability = new TextBlock(); ability.fontSize = 20; ability.color = '#ffe6b3'; ability.textWrapping = true;
  ability.heightInPixels = 60; ability.widthInPixels = 440;
  stack.addControl(name); stack.addControl(role); stack.addControl(ability);
  const bars: Rectangle[] = [];
  const labels = ['select.speed', 'select.jump', 'select.power', 'select.guard'];
  for (const l of labels) {
    const row = new Grid(); row.widthInPixels = 440; row.heightInPixels = 34;
    row.addColumnDefinition(0.35); row.addColumnDefinition(0.65);
    const lt = new TextBlock(undefined, t(l)); lt.color = '#ddd'; lt.fontSize = 20; lt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    row.addControl(lt, 0, 0);
    const track = new Rectangle(); track.heightInPixels = 14; track.cornerRadius = 7; track.thickness = 0; track.background = 'rgba(255,255,255,0.15)';
    const bar = new Rectangle(); bar.heightInPixels = 14; bar.cornerRadius = 7; bar.thickness = 0; bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    track.addControl(bar); row.addControl(track, 0, 1); bars.push(bar);
    stack.addControl(row);
  }
  ui.addControl(info);

  const refresh = () => {
    art.source = current.art;
    name.text = current.name;
    role.text = t(current.roleKey);
    ability.text = t(current.abilityKey);
    const s = current.stats;
    const vals = [(s.speed - 5.5) / 2.2, (s.jump - 11) / 2.4, s.power / 12, (1.2 - s.guard) / 0.4];
    bars.forEach((b, i) => { b.widthInPixels = Math.max(30, Math.min(1, vals[i]) * 280); b.background = hex(current.color); });
  };

  // Portrait strip.
  const strip = new StackPanel(); strip.isVertical = false; strip.heightInPixels = 100; strip.spacing = 14;
  place(strip, -230, -18, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
  for (const h of HEROES) {
    const e = new Ellipse(); e.widthInPixels = e.heightInPixels = 96; e.thickness = 4; e.color = hex(h.color); e.background = 'rgba(14,9,30,0.85)';
    const img = new Image(`p-${h.id}`, `assets/portraits/${h.id}.png`); img.stretch = Image.STRETCH_UNIFORM; img.heightInPixels = 100; img.topInPixels = 8;
    e.addControl(img);
    e.onPointerUpObservable.add(() => { sfx.click(); current = h; refresh(); });
    strip.addControl(e);
  }
  ui.addControl(strip);

  const go = button(t('select.confirm'), () => {
    repo.setHero(current.id);
    if (next === 'map') nav.map();
    else nav.arena(WORLDS[Math.floor(Math.random() * 5)].id, undefined, true);
  }, { primary: true, w: 280, h: 68, size: 28 });
  place(go, 230, 190);
  ui.addControl(go);
  refresh();
  return done(scene);
}

// ---------------------------------------------------------------- World map
export function mapScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/atlas-cliffs.webp', 0.45);
  backButton(ui, () => nav.title());
  const title = text(t('map.title'), 42, GOLD, FONT);
  place(title, 0, 24, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(title);

  const realms = WORLDS.filter((w) => w.levels > 0);
  const unlocked = (i: number) => i === 0 || repo.isDone(levelKey(realms[i - 1].id, 'arena'));
  const allArenas = realms.every((w) => repo.isDone(levelKey(w.id, 'arena')));

  const details = panel(460, 300); details.isVisible = false; place(details, 0, 60);
  ui.addControl(details);

  const showWorld = (i: number) => {
    const w = realms[i];
    details.clearControls(); details.isVisible = true;
    const st = new StackPanel(); st.spacing = 12; st.paddingTopInPixels = 18; details.addControl(st);
    st.addControl(text(t(w.nameKey), 32, GOLD, FONT));
    for (let l = 0; l < w.levels; l++) {
      const open = l === 0 || repo.isDone(levelKey(w.id, l - 1));
      const res = repo.profile().levels[levelKey(w.id, l)];
      const label = `${t('map.level')} ${l + 1}  ${res ? '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars) : open ? '' : '🔒'}`;
      const b = button(label, () => open && nav.parcours(w.id, l), { w: 380, h: 50, size: 22 });
      b.alpha = open ? 1 : 0.45; st.addControl(b);
    }
    const arenaOpen = repo.isDone(levelKey(w.id, w.levels - 1));
    const ab = button(`⚔ ${t('map.arena')}${repo.isDone(levelKey(w.id, 'arena')) ? ' ✓' : arenaOpen ? '' : ' 🔒'}`,
      () => arenaOpen && nav.arena(w.id), { w: 380, h: 50, size: 22, primary: arenaOpen });
    ab.alpha = arenaOpen ? 1 : 0.45; st.addControl(ab);
  };

  realms.forEach((w, i) => {
    const node = new Ellipse(); node.widthInPixels = node.heightInPixels = 92; node.thickness = 4;
    const open = unlocked(i);
    const hero = heroById(w.element as string);
    node.color = open ? hex(hero.color) : '#777'; node.background = open ? 'rgba(14,9,30,0.85)' : 'rgba(30,30,30,0.85)';
    const img = new Image(`n-${w.id}`, `assets/portraits/${hero.id}.png`); img.stretch = Image.STRETCH_UNIFORM; img.heightInPixels = 88; img.topInPixels = 8;
    img.alpha = open ? 1 : 0.35;
    node.addControl(img);
    place(node, w.map.x - 640, w.map.y - 360 - 40);
    node.onPointerUpObservable.add(() => { sfx.click(); open ? showWorld(i) : (lock.text = t('map.locked')); });
    ui.addControl(node);
    const label = text(t(w.nameKey), 18, open ? '#fff' : '#aaa'); place(label, w.map.x - 640, w.map.y - 360 + 26);
    ui.addControl(label);
  });
  const temple = button(`✦ ${t('world.temple')}`, () => (allArenas ? nav.arena('temple') : (lock.text = t('map.templeLocked'))), { w: 320, h: 56, primary: allArenas });
  place(temple, 0, -30, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
  ui.addControl(temple);
  const lock = text('', 22, '#ffb3b3'); place(lock, 0, -100, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
  ui.addControl(lock);
  scene.onPointerDown = () => { /* tap elsewhere keeps panel */ };
  return done(scene);
}

// ---------------------------------------------------------------- Result
export function resultScreen(game: Game, r: ResultInfo): Screen {
  const { scene, ui } = guiScene(game);
  const w = worldById(r.worldId);
  bgImage(ui, `assets/bg/${r.kind === 'arena' ? w.arenaBg : w.parcoursBg}.webp`, 0.55);
  const box = panel(560, 420); ui.addControl(box);
  const st = new StackPanel(); st.spacing = 14; st.paddingTopInPixels = 24; box.addControl(st);
  const head = r.win ? (r.kind === 'arena' ? t('result.win') : t('result.levelDone')) : t('result.lose');
  st.addControl(text(head, 48, r.win ? GOLD : '#ffd0d0', FONT));
  if (r.win && r.stars) st.addControl(text('★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), 64, GOLD));
  if (r.total) st.addControl(text(`★ ${r.collected}/${r.total}`, 24, '#fff'));
  st.addControl(text(`${t('result.time')} : ${fmt(r.timeMs / 1000)}`, 24, '#fff'));
  const row = new StackPanel(); row.isVertical = false; row.spacing = 16; row.heightInPixels = 70; row.paddingTopInPixels = 10;
  const retry = () => (r.kind === 'arena' ? nav.arena(r.worldId, undefined, r.free) : nav.parcours(r.worldId, r.level));
  const world = worldById(r.worldId);
  const next = () => {
    if (r.free) return nav.title();
    if (r.kind === 'parcours' && r.level + 1 < world.levels) return nav.parcours(r.worldId, r.level + 1);
    if (r.kind === 'parcours') return nav.arena(r.worldId);
    return nav.map();
  };
  row.addControl(button(t('result.retry'), retry, { w: 160 }));
  row.addControl(button(t('result.map'), () => (r.free ? nav.title() : nav.map()), { w: 160 }));
  if (r.win) row.addControl(button(t('result.next'), next, { w: 180, primary: true }));
  st.addControl(row);
  return done(scene);
}

// ---------------------------------------------------------------- Leaderboard
export function leaderboardScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/medina-rooftops.webp', 0.6);
  backButton(ui, () => nav.title());
  const title = text(t('board.title'), 42, GOLD, FONT);
  place(title, 0, 24, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(title);
  const box = panel(760, 560); place(box, 0, 40); ui.addControl(box);
  const st = new StackPanel(); st.paddingTopInPixels = 16; box.addControl(st);
  const list = repo.leaderboard().slice(0, 10);
  list.forEach((p, i) => {
    const row = new Grid(); row.widthInPixels = 700; row.heightInPixels = 48;
    [0.1, 0.12, 0.38, 0.2, 0.2].forEach((c) => row.addColumnDefinition(c));
    const cell = (v: string, c: number, color = '#fff') => { const tb = new TextBlock(undefined, v); tb.color = color; tb.fontSize = 22; row.addControl(tb, 0, c); };
    cell(`${i + 1}`, 0, i < 3 ? GOLD : '#ccc');
    const img = new Image(undefined, `assets/portraits/${heroById(p.heroId).id}.png`); img.stretch = Image.STRETCH_UNIFORM; img.heightInPixels = 44;
    row.addControl(img, 0, 1);
    cell(p.nickname + (p.id === repo.profile().id ? '  ◀' : ''), 2);
    cell(`★ ${p.totalStars}`, 3, GOLD);
    cell(`⚔ ${p.arenaWins}`, 4);
    st.addControl(row);
  });
  if (list.some((p) => p.simulated)) {
    const note = text(t('board.demo'), 18, '#ffffffaa');
    place(note, 0, -16, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
    ui.addControl(note);
  }
  return done(scene);
}

// ---------------------------------------------------------------- Parents (gated)
export function parentsScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/riad-arena.webp', 0.7);
  backButton(ui, () => nav.title());
  // Grown-up gate: two-digit multiplication (Apple/Google kids-category practice).
  const a = 13 + Math.floor(Math.random() * 7);
  const b = 6 + Math.floor(Math.random() * 4);
  const gate = panel(560, 360); ui.addControl(gate);
  const gs = new StackPanel(); gs.spacing = 14; gs.paddingTopInPixels = 24; gate.addControl(gs);
  gs.addControl(text(t('parents.gate'), 24, '#fff'));
  gs.addControl(text(`${a} × ${b} = ?`, 44, GOLD, FONT));
  const choices = shuffle([a * b, a * b + b, a * b - a, a * b + 10]);
  const row = new StackPanel(); row.isVertical = false; row.spacing = 12; row.heightInPixels = 80;
  const msg = text('', 20, '#ffb3b3');
  for (const c of choices) row.addControl(button(String(c), () => (c === a * b ? openSettings() : (msg.text = t('parents.wrong'))), { w: 110 }));
  gs.addControl(row); gs.addControl(msg);

  function openSettings() {
    gate.isVisible = false;
    const box = panel(820, 600); place(box, 0, 30); ui.addControl(box);
    const st = new StackPanel(); st.spacing = 10; st.paddingTopInPixels = 18; box.addControl(st);
    st.addControl(text(t('parents.title'), 36, GOLD, FONT));
    st.addControl(text(`${t('parents.today')} : ${repo.playedTodayMin()} ${t('common.min')}`, 20, '#fff'));
    const s = repo.settings();
    const option = <T,>(label: string, values: { v: T; l: string }[], get: () => T, set: (v: T) => void) => {
      const r = new StackPanel(); r.isVertical = false; r.heightInPixels = 58; r.spacing = 8;
      const lt = text(label, 20, '#ddd'); lt.resizeToFit = false; lt.widthInPixels = 220; lt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      r.addControl(lt);
      const btns = values.map((o) => {
        const bb = button(o.l, () => { set(o.v); paint(); }, { w: Math.max(100, o.l.length * 11 + 30), h: 46, size: 18 });
        r.addControl(bb); return { bb, v: o.v };
      });
      const paint = () => btns.forEach(({ bb, v }) => { const on = v === get(); bb.background = on ? '#ffcf6b' : 'rgba(20,13,38,0.72)'; bb.color = on ? '#140d26' : GOLD; });
      paint(); st.addControl(r);
    };
    option(t('parents.time'), [15, 30, 60, 0].map((v) => ({ v, l: v ? `${v} ${t('common.min')}` : t('parents.unlimited') })), () => s.dailyLimitMin, (v) => repo.updateSettings({ dailyLimitMin: v }));
    option(t('parents.mode'), [{ v: 'easy' as const, l: t('parents.easy') }, { v: 'expert' as const, l: t('parents.expert') }], () => s.mode, (v) => repo.updateSettings({ mode: v }));
    option(t('parents.sound'), [{ v: true, l: t('parents.on') }, { v: false, l: t('parents.off') }], () => s.sound, (v) => repo.updateSettings({ sound: v }));
    option(t('parents.lang'), [{ v: 'fr' as const, l: 'Français' }, { v: 'en' as const, l: 'English' }], () => s.lang, (v) => { repo.updateSettings({ lang: v }); nav.parents(); });
    const onl = text(`${t('parents.online')} : ${t('parents.onlineOff')}`, 20, '#bbb'); st.addControl(onl);
    const r2 = new StackPanel(); r2.isVertical = false; r2.spacing = 16; r2.heightInPixels = 70; r2.paddingTopInPixels = 8;
    r2.addControl(button(t('parents.demo'), () => { repo.loadDemo(); nav.title(); }, { w: 330, h: 52, size: 20 }));
    r2.addControl(button(t('parents.reset'), () => { repo.reset(); nav.title(); }, { w: 300, h: 52, size: 20 }));
    st.addControl(r2);
  }
  return done(scene);
}

// ---------------------------------------------------------------- Daily limit reached
export function limitScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/medina-rooftops.webp', 0.5);
  const box = panel(620, 300); ui.addControl(box);
  const st = new StackPanel(); st.spacing = 18; st.paddingTopInPixels = 30; box.addControl(st);
  st.addControl(text(t('limit.title'), 40, GOLD, FONT));
  const body = new TextBlock(undefined, t('limit.body')); body.color = '#fff'; body.fontSize = 24; body.textWrapping = true; body.heightInPixels = 80; body.widthInPixels = 540;
  st.addControl(body);
  st.addControl(button('🔒 ' + t('title.parents'), () => nav.parents(), { w: 280, h: 54, size: 20 }));
  return done(scene);
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
