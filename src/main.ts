import '@fontsource/cinzel/700.css';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Game } from './core/game';
import { repo } from './data/repository';
import { nav } from './screens/nav';
import { arenaScreen } from './screens/arena';
import { parcoursScreen } from './screens/parcours';
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
    heroSelect: (next: 'map' | 'arena') => game.go((g) => heroSelectScreen(g, next)),
    map: () => game.go(mapScreen),
    parcours: guard((w: string, l: number) => game.go((g) => parcoursScreen(g, w, l))),
    arena: guard((w: string, o?: string, free?: boolean) => game.go((g) => arenaScreen(g, w, o, free))),
    result: (r) => game.go((g) => resultScreen(g, r)),
    leaderboard: () => game.go(leaderboardScreen),
    parents: () => game.go(parentsScreen),
    limit: () => game.go(limitScreen),
  } satisfies typeof nav);

  // Deep links for demos / QA: ?screen=parcours&world=volcano&level=0 | ?screen=arena&world=atlas | ?demo=1
  const q = new URLSearchParams(location.search);
  if (q.get('demo') === '1') repo.loadDemo();
  if (q.get('hero')) repo.setHero(q.get('hero')!);
  const screen = q.get('screen');
  const world = q.get('world') ?? 'volcano';
  if (screen === 'parcours') nav.parcours(world, Number(q.get('level') ?? 0));
  else if (screen === 'arena') nav.arena(world, q.get('opponent') ?? undefined, true);
  else if (screen === 'select') nav.heroSelect('map');
  else if (screen === 'map') nav.map();
  else if (screen === 'board') nav.leaderboard();
  else if (screen === 'parents') nav.parents();
  else nav.title();
  (window as unknown as { __elementara: unknown }).__elementara = { game, nav, repo };
}

void boot();
