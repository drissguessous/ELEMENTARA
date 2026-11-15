import '@fontsource/cinzel/700.css';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Game } from './core/game';
import { repo } from './data/repository';
import { heroById } from './config/heroes';
import { nav, type ArenaOptions } from './screens/nav';
import { combatScreen, fighterSelectScreen, tournamentScreen } from './screens/combat';
import { arenaScreen } from './screens/arena';
import { parcoursScreen } from './screens/parcours';
import { previewScreen } from './screens/preview';
import {
  heroSelectScreen, leaderboardScreen, limitScreen, mapScreen, parentsScreen, resultScreen, titleScreen,
} from './screens/menus';

async function nativeSetup() {
  if (!Capacitor.isNativePlatform()) return;
  try { await StatusBar.hide(); } catch { /* ignore */ }
  try { await ScreenOrientation.lock({ orientation: 'landscape' }); } catch { /* ignore */ }
}

async function boot() {
  void nativeSetup();
  const host = document.getElementById('game')!;
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  host.appendChild(canvas);

  try { await document.fonts.load('700 40px "Cinzel"'); } catch { /* fallback serif */ }

  const game = new Game(canvas);
  const guard = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => (repo.limitReached() ? nav.limit() : fn(...a));

  Object.assign(nav, {
    game,
    title: () => game.go(titleScreen),
    heroSelect: () => game.go(heroSelectScreen),
    map: () => game.go(mapScreen),
    parcours: guard((w: string, l: number) => game.go((g) => parcoursScreen(g, w, l))),
    arena: guard((o: ArenaOptions) => game.go((g) => arenaScreen(g, o))),
    combat: () => game.go(combatScreen),
    tournament: () => game.go(tournamentScreen),
    fighterSelect: (step: 'me' | 'foe', mode: 'tournament' | 'free') => game.go((g) => fighterSelectScreen(g, step, mode)),
    result: (r) => game.go((g) => resultScreen(g, r)),
    leaderboard: () => game.go(leaderboardScreen),
    parents: () => game.go(parentsScreen),
    limit: () => game.go(limitScreen),
  } satisfies typeof nav);

  // Deep links for demos / QA: ?screen=parcours&world=volcano&level=0 | ?screen=arena&me=fire&opponent=magmor | ?screen=tournament&demo=1
  const q = new URLSearchParams(location.search);
  if (q.get('demo') === '1') repo.loadDemo();
  if (q.get('hero')) repo.setHero(q.get('hero')!);
  // QA: preview a candidate 3D model before validation, e.g. ?hero=fire&model=models/preview/fire.glb
  if (q.get('model')) heroById(repo.profile().heroId).model = q.get('model');
  const screen = q.get('screen');
  const world = q.get('world') ?? 'volcano';
  if (screen === 'parcours') nav.parcours(world, Number(q.get('level') ?? 0));
  else if (screen === 'arena') nav.arena({ mode: 'free', worldId: q.get('world') ?? undefined, me: q.get('me') ?? undefined, foe: q.get('opponent') ?? undefined });
  else if (screen === 'select') nav.heroSelect();
  else if (screen === 'combat') nav.combat();
  else if (screen === 'tournament') nav.tournament();
  else if (screen === 'fighters') nav.fighterSelect('me', 'free');
  else if (screen === 'map') nav.map();
  else if (screen === 'board') nav.leaderboard();
  else if (screen === 'parents') nav.parents();
  else if (screen === 'preview') void game.go(previewScreen);
  else nav.title();
  (window as unknown as { __elementara: unknown }).__elementara = { game, nav, repo };
}

void boot();
