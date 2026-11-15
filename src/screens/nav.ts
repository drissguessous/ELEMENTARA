import type { Game } from '../core/game';

/** How an arena fight was started (decides opponent, rewards and where "back" goes). */
export interface ArenaOptions {
  /** story = guardian arena of a realm, tournament = Guardians' Tournament, free = free fight */
  mode: 'story' | 'tournament' | 'free';
  worldId?: string;
  me?: string;
  foe?: string;
}

/** Navigation between screens (filled in main.ts; avoids circular imports). */
export interface Nav {
  game: Game;
  title(): void;
  heroSelect(): void;
  map(): void;
  parcours(worldId: string, level: number): void;
  arena(opts: ArenaOptions): void;
  combat(): void;
  tournament(): void;
  fighterSelect(step: 'me' | 'foe', mode: 'tournament' | 'free'): void;
  result(r: ResultInfo): void;
  leaderboard(): void;
  parents(): void;
  limit(): void;
}

export interface ResultInfo {
  kind: 'parcours' | 'arena';
  win: boolean;
  worldId: string;
  level: number;
  stars?: number;
  collected?: number;
  total?: number;
  timeMs: number;
  arena?: ArenaOptions;
  /** Fighter unlocked by this tournament win. */
  unlocked?: string;
}

export const nav = {} as Nav;
