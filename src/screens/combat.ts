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
import { ELEMENT_GLYPH, FIGHTERS, HEROES, heroById, type HeroDef } from '../config/heroes';
import { repo } from '../data/repository';
import { t } from '../i18n';
import { sfx } from '../systems/audio';
import { nav } from './nav';

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const heroIds = HEROES.map((h) => h.id);
const unlocked = (id: string) => repo.isUnlocked(id, heroIds);

function guiScene(game: Game): { scene: Scene; ui: AdvancedDynamicTexture } {
  const scene = new Scene(game.engine);
  scene.clearColor = new Color4(0.07, 0.05, 0.14, 1);
  new FreeCamera('c', Vector3.Zero(), scene);
  return { scene, ui: createUI(scene) };
}
const done = (scene: Scene): Screen => ({ scene, dispose: () => scene.dispose() });

function header(ui: AdvancedDynamicTexture, title: string, back: () => void) {
  const b = button('← ' + t('common.back'), back, { w: 190, h: 56, size: 22 });
  place(b, 24, 20, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(b);
  const tt = text(title, 42, GOLD, FONT);
  place(tt, 0, 24, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ui.addControl(tt);
}

/**
 * Round fighter badge: the hero's portrait when the artwork exists,
 * otherwise the element glyph on the fighter's colours (no invented look).
 */
export function fighterBadge(def: HeroDef, size: number, opts: { locked?: boolean; done?: boolean; highlight?: boolean } = {}): Ellipse {
  const e = new Ellipse(`badge-${def.id}`);
  e.widthInPixels = e.heightInPixels = size;
  e.thickness = opts.highlight ? 5 : 3;
  e.color = opts.highlight ? GOLD : opts.locked ? '#666' : hex(def.color);
  e.background = opts.locked ? 'rgba(25,22,35,0.92)' : `${hex(def.color)}55`;
  if (def.art && !opts.locked) {
    const img = new Image(undefined, `assets/portraits/${def.id}.png`);
    img.stretch = Image.STRETCH_UNIFORM; img.heightInPixels = size * 0.96; img.topInPixels = size * 0.08;
    e.addControl(img);
  } else {
    const g = new TextBlock(undefined, opts.locked ? '🔒' : ELEMENT_GLYPH[def.element]);
    g.fontSize = size * 0.36; g.topInPixels = -size * 0.08; g.color = '#fff';
    e.addControl(g);
    if (!opts.locked) {
      const n = new TextBlock(undefined, def.name); n.fontSize = Math.max(11, size * 0.16); n.color = '#fff'; n.fontWeight = '700';
      n.topInPixels = size * 0.26; e.addControl(n);
    }
  }
  if (opts.done) {
    const c = new TextBlock(undefined, '✓'); c.color = '#7dff9a'; c.fontSize = size * 0.32; c.fontWeight = '900';
    c.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; c.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    c.leftInPixels = -size * 0.06;
    e.addControl(c);
  }
  return e;
}

/** Info panel shared by the selection screens. */
function infoPanel(): { box: Rectangle; show: (d: HeroDef, locked: boolean) => void } {
  const box = panel(460, 400);
  const st = new StackPanel(); st.spacing = 8; st.paddingTopInPixels = 16; box.addControl(st);
  const name = text('', 40, GOLD, FONT);
  const rank = text('', 18, '#ffffffbb');
  const role = new TextBlock(); role.color = '#fff'; role.fontSize = 19; role.textWrapping = true; role.heightInPixels = 52; role.widthInPixels = 410;
  const spec = new TextBlock(); spec.color = '#ffe6b3'; spec.fontSize = 18; spec.textWrapping = true; spec.heightInPixels = 46; spec.widthInPixels = 410;
  st.addControl(name); st.addControl(rank); st.addControl(role); st.addControl(spec);
  const bars: Rectangle[] = [];
  for (const l of ['select.speed', 'select.jump', 'select.power', 'select.guard']) {
    const row = new Grid(); row.widthInPixels = 410; row.heightInPixels = 30;
    row.addColumnDefinition(0.32); row.addColumnDefinition(0.68);
    const lt = new TextBlock(undefined, t(l)); lt.color = '#ddd'; lt.fontSize = 17; lt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    row.addControl(lt, 0, 0);
    const track = new Rectangle(); track.heightInPixels = 12; track.cornerRadius = 6; track.thickness = 0; track.background = 'rgba(255,255,255,0.15)';
    const bar = new Rectangle(); bar.heightInPixels = 12; bar.cornerRadius = 6; bar.thickness = 0; bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    track.addControl(bar); row.addControl(track, 0, 1); bars.push(bar); st.addControl(row);
  }
  const show = (d: HeroDef, locked: boolean) => {
    name.text = locked ? '???' : d.name;
    rank.text = `${t('kind.' + d.kind)} · ${t('combat.tier')} ${d.tier}`;
    role.text = locked ? t('combat.locked') : t(d.roleKey);
    spec.text = locked ? '' : t(`special.${d.special}`);
    const s = d.stats;
    const vals = [(s.speed - 5.5) / 2.8, (s.jump - 11) / 3, s.power / 17, (1.2 - s.guard) / 0.6];
    bars.forEach((b, i) => { b.widthInPixels = locked ? 0 : Math.max(20, Math.min(1, vals[i]) * 270); b.background = hex(d.color); });
  };
  return { box, show };
}

// ---------------------------------------------------------------- Combat menu
export function combatScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/temple-arena.webp', 0.5);
  header(ui, t('combat.title'), () => nav.title());
  const beaten = repo.beaten().length;
  const card = (x: number, title: string, desc: string, extra: string, go: () => void, primary: boolean) => {
    const p = panel(470, 380); place(p, x, 40);
    const st = new StackPanel(); st.spacing = 14; st.paddingTopInPixels = 26; p.addControl(st);
    st.addControl(text(title, 34, GOLD, FONT));
    const d = new TextBlock(undefined, desc); d.color = '#fff'; d.fontSize = 20; d.textWrapping = true; d.widthInPixels = 410; d.heightInPixels = 96;
    st.addControl(d);
    st.addControl(text(extra, 22, '#ffe6b3'));
    st.addControl(button(t('combat.fight'), go, { primary, w: 300, h: 64, size: 26 }));
    ui.addControl(p);
  };
  card(-255, t('combat.tournament'), t('combat.tournamentDesc'), `🏆 ${t('combat.progress')} : ${beaten}/19`, () => nav.tournament(), true);
  const nUnlocked = FIGHTERS.filter((f) => unlocked(f.id)).length;
  card(255, t('combat.free'), t('combat.freeDesc'), `⚔ ${nUnlocked}/${FIGHTERS.length}`, () => nav.fighterSelect('me', 'free'), false);
  return done(scene);
}

// ---------------------------------------------------------------- Guardians' Tournament
export function tournamentScreen(game: Game): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/temple-arena.webp', 0.62);
  header(ui, t('combat.tournament'), () => nav.combat());
  const me = heroById(repo.fighterId());
  const ladder = FIGHTERS.filter((f) => f.id !== me.id);
  const beaten = repo.beaten();
  const next = ladder.find((f) => !beaten.includes(f.id));

  // Ladder: two rows, easiest first.
  const grid = new Grid(); grid.widthInPixels = 1180; grid.heightInPixels = 200;
  for (let c = 0; c < 10; c++) grid.addColumnDefinition(0.1);
  grid.addRowDefinition(0.5); grid.addRowDefinition(0.5);
  place(grid, 0, 92, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_TOP);
  ladder.forEach((f, i) => {
    const isDone = beaten.includes(f.id);
    const isNext = f === next;
    const seen = isDone || isNext || unlocked(f.id);
    const b = fighterBadge(f, 84, { locked: !seen, done: isDone, highlight: isNext });
    const holder = new Rectangle(); holder.thickness = 0;
    holder.addControl(b);
    const num = text(String(i + 1), 15, isNext ? GOLD : '#ffffffaa');
    num.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM; num.topInPixels = 2;
    holder.addControl(num);
    grid.addControl(holder, Math.floor(i / 10), i % 10);
  });
  ui.addControl(grid);

  // You vs next opponent.
  const vs = panel(820, 330); place(vs, 0, 150);
  ui.addControl(vs);
  const mine = fighterBadge(me, 150);
  place(mine, 60, -10, Control.HORIZONTAL_ALIGNMENT_LEFT);
  vs.addControl(mine);
  if (me.art) {
    const myName = text(me.name, 22, '#fff'); myName.resizeToFit = false; myName.widthInPixels = 150;
    place(myName, 60, 78, Control.HORIZONTAL_ALIGNMENT_LEFT); vs.addControl(myName);
  }
  const change = button(t('title.switch'), () => nav.fighterSelect('me', 'tournament'), { w: 150, h: 44, size: 18 });
  place(change, 60, -14, Control.HORIZONTAL_ALIGNMENT_LEFT, Control.VERTICAL_ALIGNMENT_BOTTOM);
  vs.addControl(change);

  if (next) {
    const vsT = text('VS', 54, GOLD, FONT); place(vsT, -150, -30); vs.addControl(vsT);
    const foeB = fighterBadge(next, 150, { highlight: true });
    place(foeB, -60, -10, Control.HORIZONTAL_ALIGNMENT_RIGHT); vs.addControl(foeB);
    const info = new StackPanel(); info.widthInPixels = 270; place(info, 50, -40);
    info.addControl(text(t('combat.next'), 18, '#ffffffaa'));
    info.addControl(text(next.name, 34, GOLD, FONT));
    info.addControl(text(`${t('kind.' + next.kind)} · ${t('combat.tier')} ${next.tier}`, 17, '#fff'));
    const role = new TextBlock(undefined, t(next.roleKey)); role.color = '#ffe6b3'; role.fontSize = 16; role.textWrapping = true; role.heightInPixels = 44; role.widthInPixels = 260;
    info.addControl(role);
    vs.addControl(info);
    const fight = button(`⚔ ${t('combat.fight')}`, () => nav.arena({ mode: 'tournament', foe: next.id }), { primary: true, w: 260, h: 62, size: 26 });
    place(fight, 0, -22, Control.HORIZONTAL_ALIGNMENT_CENTER, Control.VERTICAL_ALIGNMENT_BOTTOM);
    vs.addControl(fight);
  } else {
    const champ = text(`🏆 ${t('combat.champion')}`, 28, GOLD, FONT); place(champ, 60, -30); vs.addControl(champ);
  }
  return done(scene);
}

// ---------------------------------------------------------------- Fighter selection (20 fighters)
export function fighterSelectScreen(game: Game, step: 'me' | 'foe', mode: 'tournament' | 'free'): Screen {
  const { scene, ui } = guiScene(game);
  bgImage(ui, 'assets/bg/riad-arena.webp', 0.62);
  header(ui, step === 'me' ? t('combat.chooseYou') : t('combat.chooseFoe'), () => (mode === 'tournament' ? nav.tournament() : nav.combat()));
  const myId = repo.fighterId();
  let current = heroById(step === 'me' ? myId : (FIGHTERS.find((f) => unlocked(f.id) && f.id !== myId)?.id ?? 'water'));

  const grid = new Grid(); grid.widthInPixels = 600; grid.heightInPixels = 470;
  for (let c = 0; c < 5; c++) grid.addColumnDefinition(0.2);
  for (let r = 0; r < 4; r++) grid.addRowDefinition(0.25);
  place(grid, 40, 50, Control.HORIZONTAL_ALIGNMENT_LEFT);
  const { box, show } = infoPanel();
  place(box, -40, 20, Control.HORIZONTAL_ALIGNMENT_RIGHT);

  const confirm = button(t('select.confirm'), () => {
    if (!unlocked(current.id) || (step === 'foe' && current.id === myId)) return;
    if (step === 'me') {
      repo.setFighter(current.id);
      mode === 'free' ? nav.fighterSelect('foe', 'free') : nav.tournament();
    } else nav.arena({ mode: 'free', me: myId, foe: current.id });
  }, { primary: true, w: 300, h: 62, size: 26 });
  place(confirm, -120, -22, Control.HORIZONTAL_ALIGNMENT_RIGHT, Control.VERTICAL_ALIGNMENT_BOTTOM);

  const render = () => {
    grid.clearControls();
    FIGHTERS.forEach((f, i) => {
      const locked = !unlocked(f.id);
      const b = fighterBadge(f, 100, { locked, highlight: f.id === current.id });
      if (step === 'foe' && f.id === myId) b.alpha = 0.35;
      b.onPointerUpObservable.add(() => { sfx.click(); current = f; render(); });
      grid.addControl(b, Math.floor(i / 5), i % 5);
    });
    const ok = unlocked(current.id) && !(step === 'foe' && current.id === myId);
    show(current, !unlocked(current.id));
    confirm.alpha = ok ? 1 : 0.4;
  };
  ui.addControl(grid); ui.addControl(box); ui.addControl(confirm);
  render();
  return done(scene);
}
