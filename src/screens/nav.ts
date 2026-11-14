import type { Game } from '../core/game';

/** Navigation between screens (filled in main.ts; avoids circular imports). */
export interface Nav {
  game: Game;
  title(): void;
  heroSelect(next: 'map' | 'arena'): void;
  map(): void;
  parcours(worldId: string, level: number): void;
  arena(worldId: string, opponent?: string, free?: boolean): void;
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
  free?: boolean;
}

export const nav = {} as Nav;
