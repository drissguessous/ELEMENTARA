export type ElementId = 'fire' | 'water' | 'wind' | 'earth' | 'light';

export interface HeroStats {
  /** Horizontal run speed (m/s). */
  speed: number;
  /** Jump impulse (m/s). */
  jump: number;
  /** Melee damage per hit (arena). */
  power: number;
  /** Damage taken factor (1 = normal, 0.8 = takes 20% less). */
  guard: number;
}

/** Arena special move. */
export type SpecialKind =
  | 'bolt'    // straight projectile
  | 'triple'  // three-way spread
  | 'arc'     // lobbed bomb that bursts on landing
  | 'wave'    // ground wave (jump over it)
  | 'dash'    // dashing strike
  | 'nova'    // short-range burst around the fighter
  | 'homing'; // slow projectile that follows the target

export type FighterKind = 'apprentice' | 'hero' | 'master' | 'guardian';

export interface HeroDef {
  id: string;
  element: ElementId;
  name: string;
  kind: FighterKind;
  /** Difficulty rank 1 (easiest) … 20 (final boss), used by the tournament and the AI. */
  tier: number;
  color: number;
  accent: number;
  stats: HeroStats;
  /** Parcours ability (the 5 playable heroes of the adventure). */
  ability: 'dash' | 'slide' | 'doubleJump' | 'shield' | 'lightLeap';
  special: SpecialKind;
  /** Arena special projectile tint. */
  projectile: number;
  /** Body size relative to a 1.80 m teenager (guardians are bigger). */
  scale: number;
  /** 2D artwork (untouched original, background removed). Null = not produced yet. */
  art: string | null;
  /** Final rigged 3D model, once produced and validated (docs/ASSET_PIPELINE.md). Null = stand-in rig. */
  model: string | null;
  /** i18n keys */
  roleKey: string;
  abilityKey: string;
}

const ABILITY_BY_ELEMENT: Record<ElementId, HeroDef['ability']> = {
  fire: 'dash', water: 'slide', wind: 'doubleJump', earth: 'shield', light: 'lightLeap',
};

type Base = Pick<HeroDef, 'id' | 'element' | 'name' | 'kind' | 'tier' | 'color' | 'accent' | 'stats' | 'special' | 'projectile'> & Partial<HeroDef>;
const def = (b: Base): HeroDef => ({
  ability: ABILITY_BY_ELEMENT[b.element],
  scale: 1,
  art: null,
  model: null,
  roleKey: `fighter.${b.id}.role`,
  abilityKey: `special.${b.special}`,
  ...b,
});

/** The five guardians of the adventure — always playable. Artwork: art/original/heroes-*.png */
export const HEROES: HeroDef[] = [
  def({ id: 'fire', element: 'fire', name: 'Ignis', kind: 'hero', tier: 10, color: 0xff5a1f, accent: 0xffc23d,
    stats: { speed: 7.2, jump: 13, power: 10, guard: 1 }, special: 'dash', projectile: 0xff7a2a,
    art: 'assets/heroes/fire.png', roleKey: 'hero.fire.role', abilityKey: 'hero.fire.ability' }),
  def({ id: 'water', element: 'water', name: 'Marina', kind: 'hero', tier: 7, color: 0x2f8cff, accent: 0x9fe8ff,
    stats: { speed: 7.4, jump: 12.6, power: 8, guard: 1 }, special: 'wave', projectile: 0x58c8ff,
    art: 'assets/heroes/water.png', roleKey: 'hero.water.role', abilityKey: 'hero.water.ability' }),
  def({ id: 'wind', element: 'wind', name: 'Zephyr', kind: 'hero', tier: 6, color: 0x5ed6a8, accent: 0xe4fff4,
    stats: { speed: 7.0, jump: 12.4, power: 7, guard: 1.05 }, special: 'triple', projectile: 0xbaf7e0,
    art: 'assets/heroes/wind.png', roleKey: 'hero.wind.role', abilityKey: 'hero.wind.ability' }),
  def({ id: 'earth', element: 'earth', name: 'Tarek', kind: 'hero', tier: 8, color: 0x9b7a3c, accent: 0x7ed957,
    stats: { speed: 6.3, jump: 12, power: 12, guard: 0.8 }, special: 'nova', projectile: 0xc9a46a,
    art: 'assets/heroes/earth.png', roleKey: 'hero.earth.role', abilityKey: 'hero.earth.ability' }),
  def({ id: 'light', element: 'light', name: 'Nour', kind: 'hero', tier: 9, color: 0xffd76a, accent: 0xffffff,
    stats: { speed: 6.9, jump: 12.6, power: 9, guard: 0.95 }, special: 'homing', projectile: 0xfff2b0,
    art: 'assets/heroes/light.png', roleKey: 'hero.light.role', abilityKey: 'hero.light.ability' }),
];

/**
 * Fifteen opponents of the Guardians' Tournament, from apprentices to elemental guardians.
 * Their look is defined by the prompts in docs/ROSTER.md; until their artwork and 3D models
 * are produced and validated they fight with the stand-in rig in their own colours.
 */
export const ADVERSARIES: HeroDef[] = [
  // Apprentices (tiers 1-5)
  def({ id: 'sami', element: 'wind', name: 'Sami', kind: 'apprentice', tier: 1, color: 0x8fd3c0, accent: 0xf1fff9,
    stats: { speed: 6.4, jump: 12, power: 6, guard: 1.1 }, special: 'bolt', projectile: 0xc8fff0, scale: 0.94 }),
  def({ id: 'lila', element: 'water', name: 'Lila', kind: 'apprentice', tier: 2, color: 0x4fb3e8, accent: 0xd8f6ff,
    stats: { speed: 6.6, jump: 12, power: 6, guard: 1.1 }, special: 'bolt', projectile: 0x7fd8ff, scale: 0.93 }),
  def({ id: 'brahim', element: 'earth', name: 'Brahim', kind: 'apprentice', tier: 3, color: 0xa88a5a, accent: 0xd9c49a,
    stats: { speed: 6.0, jump: 11.6, power: 8, guard: 1 }, special: 'arc', projectile: 0xd2b07a, scale: 0.97 }),
  def({ id: 'yara', element: 'fire', name: 'Yara', kind: 'apprentice', tier: 4, color: 0xe8704a, accent: 0xffd2a0,
    stats: { speed: 6.8, jump: 12.2, power: 7, guard: 1.05 }, special: 'bolt', projectile: 0xff9a5a, scale: 0.94 }),
  def({ id: 'idris', element: 'light', name: 'Idris', kind: 'apprentice', tier: 5, color: 0xe8d28a, accent: 0xfffbe6,
    stats: { speed: 6.6, jump: 12.2, power: 7, guard: 1 }, special: 'triple', projectile: 0xfff0b8, scale: 0.96 }),
  // Masters (tiers 11-15)
  def({ id: 'haddou', element: 'earth', name: 'Haddou', kind: 'master', tier: 11, color: 0x7a5a2e, accent: 0xb8d86a,
    stats: { speed: 6.2, jump: 11.8, power: 13, guard: 0.75 }, special: 'wave', projectile: 0xb08a4a, scale: 1.06 }),
  def({ id: 'ouarda', element: 'water', name: 'Ouarda', kind: 'master', tier: 12, color: 0x1f6fc0, accent: 0x8ff0ff,
    stats: { speed: 7.2, jump: 12.8, power: 10, guard: 0.9 }, special: 'homing', projectile: 0x4ad0ff, scale: 1.02 }),
  def({ id: 'azzedine', element: 'fire', name: 'Azzedine', kind: 'master', tier: 13, color: 0xc8361a, accent: 0xffb347,
    stats: { speed: 7.4, jump: 12.8, power: 12, guard: 0.9 }, special: 'dash', projectile: 0xff6a20, scale: 1.05 }),
  def({ id: 'tilelli', element: 'wind', name: 'Tilelli', kind: 'master', tier: 14, color: 0x3fbf8f, accent: 0xeafff6,
    stats: { speed: 7.8, jump: 13.4, power: 10, guard: 0.9 }, special: 'triple', projectile: 0xaaf5dc, scale: 1.02 }),
  def({ id: 'amine', element: 'light', name: 'Amine', kind: 'master', tier: 15, color: 0xf0c040, accent: 0xffffff,
    stats: { speed: 7.2, jump: 13, power: 12, guard: 0.85 }, special: 'nova', projectile: 0xfff0a0, scale: 1.04 }),
  // Elemental guardians (tiers 16-20)
  def({ id: 'magmor', element: 'fire', name: 'Magmor', kind: 'guardian', tier: 16, color: 0x8a2a10, accent: 0xff8a20,
    stats: { speed: 6.0, jump: 11.5, power: 15, guard: 0.7 }, special: 'arc', projectile: 0xff5a10, scale: 1.3 }),
  def({ id: 'marea', element: 'water', name: 'Maréa', kind: 'guardian', tier: 17, color: 0x135a8a, accent: 0x6ff6ff,
    stats: { speed: 7.6, jump: 13, power: 13, guard: 0.8 }, special: 'wave', projectile: 0x3ae0ff, scale: 1.15 }),
  def({ id: 'sahrok', element: 'earth', name: 'Sahrok', kind: 'guardian', tier: 18, color: 0x8a6a3a, accent: 0xe8c070,
    stats: { speed: 5.8, jump: 11.2, power: 17, guard: 0.6 }, special: 'nova', projectile: 0xd8a860, scale: 1.4 }),
  def({ id: 'aquilon', element: 'wind', name: 'Aquilon', kind: 'guardian', tier: 19, color: 0x2a9a7a, accent: 0xd8fff0,
    stats: { speed: 8.2, jump: 14, power: 13, guard: 0.8 }, special: 'homing', projectile: 0x9affe0, scale: 1.2 }),
  def({ id: 'elementar', element: 'light', name: 'Elementar', kind: 'guardian', tier: 20, color: 0xd8b04a, accent: 0xffffff,
    stats: { speed: 7.6, jump: 13.6, power: 14, guard: 0.6 }, special: 'nova', projectile: 0xffffff, scale: 1.5 }),
];

/** All 20 fighters, easiest first. */
export const FIGHTERS: HeroDef[] = [...HEROES, ...ADVERSARIES].sort((a, b) => a.tier - b.tier);

export const heroById = (id: string): HeroDef => FIGHTERS.find((h) => h.id === id) ?? HEROES[0];
export const isHero = (id: string) => HEROES.some((h) => h.id === id);

/** Glyph shown on fighter cards until the fighter has its artwork. */
export const ELEMENT_GLYPH: Record<ElementId, string> = { fire: '🔥', water: '💧', wind: '🌀', earth: '⛰', light: '✦' };

export interface AiProfile {
  /** Seconds between decisions. */
  think: number;
  /** Chance to attack when in range. */
  aggression: number;
  /** Chance to raise the guard when threatened. */
  block: number;
  /** Chance to continue a combo. */
  combo: number;
  /** Chance to use the special when it makes sense. */
  special: number;
  hp: number;
  damage: number;
  speed: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * AI strength from the fighter's tier (1-20). "easy" (parents' Simplified mode) plays as if 4 tiers lower.
 */
export function aiFor(tier: number, easy: boolean): AiProfile {
  const t = Math.max(0, Math.min(1, (tier - (easy ? 4 : 0) - 1) / 19));
  return {
    think: lerp(0.5, 0.08, t),
    aggression: lerp(0.3, 0.95, t),
    block: lerp(0, 0.7, t),
    combo: lerp(0.15, 0.95, t),
    special: lerp(0.08, 0.5, t),
    hp: lerp(0.75, 1.7, t),
    damage: lerp(0.7, 1.35, t),
    speed: lerp(0.85, 1.12, t),
  };
}
