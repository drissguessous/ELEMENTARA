import type { ElementId, HeroDef } from './heroes';

export type HazardKind = 'lava' | 'water' | 'wind' | 'quicksand' | 'void';

export interface WorldDef {
  id: string;
  element: ElementId | 'all';
  nameKey: string;
  /** Background used in parcours levels. */
  parcoursBg: string;
  /** Background used in the arena. */
  arenaBg: string;
  /** Pit / hazard style for this world. */
  hazard: HazardKind;
  /** Platform palette: top, body. */
  ground: [number, number];
  /** Number of parcours levels before the arena boss. */
  levels: number;
  /** Arena boss hero (opponent). */
  boss: string;
  /** World map node position (design resolution 1280x720). */
  map: { x: number; y: number };
}

export const WORLDS: WorldDef[] = [
  { id: 'volcano', element: 'fire', nameKey: 'world.volcano', parcoursBg: 'volcano-arena', arenaBg: 'volcano-arena',
    hazard: 'lava', ground: [0x4a3a38, 0x2a1f1e], levels: 3, boss: 'fire', map: { x: 230, y: 470 } },
  { id: 'essaouira', element: 'water', nameKey: 'world.essaouira', parcoursBg: 'essaouira-arena', arenaBg: 'essaouira-arena',
    hazard: 'water', ground: [0xb68b55, 0x6e5233], levels: 3, boss: 'water', map: { x: 430, y: 300 } },
  { id: 'atlas', element: 'wind', nameKey: 'world.atlas', parcoursBg: 'atlas-cliffs', arenaBg: 'atlas-cliffs',
    hazard: 'wind', ground: [0x8d8f88, 0x55574f], levels: 3, boss: 'wind', map: { x: 640, y: 200 } },
  { id: 'merzouga', element: 'earth', nameKey: 'world.merzouga', parcoursBg: 'kasbah-arena', arenaBg: 'kasbah-arena',
    hazard: 'quicksand', ground: [0xd9a55c, 0x9a6b35], levels: 3, boss: 'earth', map: { x: 850, y: 300 } },
  { id: 'medina', element: 'light', nameKey: 'world.medina', parcoursBg: 'medina-rooftops', arenaBg: 'riad-arena',
    hazard: 'void', ground: [0xc77d4a, 0x7c4a2b], levels: 3, boss: 'light', map: { x: 1050, y: 470 } },
  { id: 'temple', element: 'all', nameKey: 'world.temple', parcoursBg: 'temple-arena', arenaBg: 'temple-arena',
    hazard: 'void', ground: [0x8a8070, 0x4d463c], levels: 0, boss: 'elementar', map: { x: 640, y: 560 } },
];

export const BACKGROUNDS = [
  'temple-arena', 'medina-rooftops', 'riad-arena', 'atlas-cliffs',
  'kasbah-arena', 'atlas-summit-arena', 'essaouira-arena', 'volcano-arena',
];

export const worldById = (id: string): WorldDef => WORLDS.find((w) => w.id === id) ?? WORLDS[0];

/** Stable key for a level, e.g. "volcano-2". Level 0..n-1 are parcours; "volcano-arena" is the boss. */
export const levelKey = (worldId: string, index: number | 'arena') => `${worldId}-${index}`;

/** Arena chosen for a fight against this fighter (Temple for the final guardian). */
export const worldForElement = (f: HeroDef): string =>
  f.id === 'elementar' ? 'temple' : (WORLDS.find((w) => w.element === f.element)?.id ?? 'temple');
