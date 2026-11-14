export type ElementId = 'fire' | 'water' | 'wind' | 'earth' | 'light';

export interface HeroStats {
  /** Horizontal run speed (m/s). */
  speed: number;
  /** Jump impulse (m/s). */
  jump: number;
  /** Melee damage per hit (arena). */
  power: number;
  /** Damage reduction factor (1 = none, 0.8 = takes 20% less). */
  guard: number;
}

export interface HeroDef {
  id: ElementId;
  name: string;
  color: number;
  accent: number;
  stats: HeroStats;
  /** Parcours ability, triggered with the "power" button. */
  ability: 'dash' | 'slide' | 'doubleJump' | 'shield' | 'lightLeap';
  /** Arena special projectile tint. */
  projectile: number;
  /** 2D artwork (untouched original, background removed). */
  art: string;
  /** Final rigged 3D model, once produced and validated (docs/ASSET_PIPELINE.md). Null = stand-in rig. */
  model: string | null;
  /** i18n keys */
  roleKey: string;
  abilityKey: string;
}

export const HEROES: HeroDef[] = [
  {
    id: 'fire', name: 'Ignis', color: 0xff5a1f, accent: 0xffc23d,
    stats: { speed: 7.2, jump: 13, power: 10, guard: 1 },
    ability: 'dash', projectile: 0xff7a2a, art: 'assets/heroes/fire.png', model: null, roleKey: 'hero.fire.role', abilityKey: 'hero.fire.ability',
  },
  {
    id: 'water', name: 'Marina', color: 0x2f8cff, accent: 0x9fe8ff,
    stats: { speed: 7.4, jump: 12.6, power: 8, guard: 1 },
    ability: 'slide', projectile: 0x58c8ff, art: 'assets/heroes/water.png', model: null, roleKey: 'hero.water.role', abilityKey: 'hero.water.ability',
  },
  {
    id: 'wind', name: 'Zephyr', color: 0x5ed6a8, accent: 0xe4fff4,
    stats: { speed: 7.0, jump: 12.4, power: 7, guard: 1.05 },
    ability: 'doubleJump', projectile: 0xbaf7e0, art: 'assets/heroes/wind.png', model: null, roleKey: 'hero.wind.role', abilityKey: 'hero.wind.ability',
  },
  {
    id: 'earth', name: 'Tarek', color: 0x9b7a3c, accent: 0x7ed957,
    stats: { speed: 6.3, jump: 12, power: 12, guard: 0.8 },
    ability: 'shield', projectile: 0xc9a46a, art: 'assets/heroes/earth.png', model: null, roleKey: 'hero.earth.role', abilityKey: 'hero.earth.ability',
  },
  {
    id: 'light', name: 'Nour', color: 0xffd76a, accent: 0xffffff,
    stats: { speed: 6.9, jump: 12.6, power: 9, guard: 0.95 },
    ability: 'lightLeap', projectile: 0xfff2b0, art: 'assets/heroes/light.png', model: null, roleKey: 'hero.light.role', abilityKey: 'hero.light.ability',
  },
];

export const heroById = (id: string): HeroDef => HEROES.find((h) => h.id === id) ?? HEROES[0];
