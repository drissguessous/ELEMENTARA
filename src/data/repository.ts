import seed from './simulation/seed.json';

/**
 * Local persistence layer. Everything is stored on the device (localStorage):
 * no account, no server, no personal data leaves the phone.
 * The same interface can later be backed by a remote API without touching scenes.
 */

export interface LevelResult { stars: number; timeMs: number; won?: boolean }

export interface Profile {
  id: string;
  nickname: string;
  age?: number;
  heroId: string;
  mode: 'easy' | 'expert';
  levels: Record<string, LevelResult>;
  arenaWins: number;
  arenaLosses: number;
  totalStars: number;
  playMinutes: number;
  createdAt: string;
  simulated?: boolean;
}

export interface MatchRecord {
  id: string; profileId: string; heroId: string; opponent: string; arena: string;
  result: 'win' | 'lose'; durationMs: number; date: string;
}

export interface Settings {
  lang: 'fr' | 'en';
  /** 0 = unlimited */
  dailyLimitMin: number;
  mode: 'easy' | 'expert';
  sound: boolean;
  onlineEnabled: boolean;
}

interface SaveData {
  version: number;
  activeProfileId: string;
  profiles: Profile[];
  matches: MatchRecord[];
  settings: Settings;
  playtime: { date: string; seconds: number };
}

const KEY = 'elementara.save.v1';
const today = () => new Date().toISOString().slice(0, 10);

function freshProfile(): Profile {
  return {
    id: 'local-1', nickname: 'Gardien', heroId: 'fire', mode: 'easy', levels: {},
    arenaWins: 0, arenaLosses: 0, totalStars: 0, playMinutes: 0, createdAt: new Date().toISOString(),
  };
}

function freshSave(): SaveData {
  return {
    version: 1,
    activeProfileId: 'local-1',
    profiles: [freshProfile()],
    matches: [],
    settings: { ...(seed.settings as Settings) },
    playtime: { date: today(), seconds: 0 },
  };
}

class Repository {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveData;
        if (parsed.version === 1 && parsed.profiles?.length) return parsed;
      }
    } catch { /* storage unavailable or corrupted: start fresh */ }
    return freshSave();
  }

  private save() {
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  settings(): Settings { return this.data.settings; }
  updateSettings(patch: Partial<Settings>) { Object.assign(this.data.settings, patch); this.save(); }

  profiles(): Profile[] { return this.data.profiles; }
  profile(): Profile {
    return this.data.profiles.find((p) => p.id === this.data.activeProfileId) ?? this.data.profiles[0];
  }
  setActiveProfile(id: string) { this.data.activeProfileId = id; this.save(); }
  cycleProfile() {
    const list = this.data.profiles;
    const i = list.findIndex((p) => p.id === this.data.activeProfileId);
    this.setActiveProfile(list[(i + 1) % list.length].id);
  }
  setHero(heroId: string) { this.profile().heroId = heroId; this.save(); }

  isDone(levelKey: string) { return !!this.profile().levels[levelKey]; }

  recordLevel(levelKey: string, result: LevelResult) {
    const p = this.profile();
    const prev = p.levels[levelKey];
    if (!prev || result.stars > prev.stars || (result.stars === prev.stars && result.timeMs < prev.timeMs)) {
      p.levels[levelKey] = result;
    }
    p.totalStars = Object.values(p.levels).reduce((s, l) => s + l.stars, 0);
    this.save();
  }

  recordMatch(m: Omit<MatchRecord, 'id' | 'profileId' | 'date'>) {
    const p = this.profile();
    if (m.result === 'win') p.arenaWins++; else p.arenaLosses++;
    this.data.matches.push({ ...m, id: `m-${Date.now()}`, profileId: p.id, date: today() });
    if (this.data.matches.length > 500) this.data.matches.shift();
    this.save();
  }

  matches(): MatchRecord[] { return this.data.matches; }

  /** Play-time tracking for parental limit. Call once per second while in gameplay. */
  tickPlaytime(seconds = 1) {
    const d = today();
    if (this.data.playtime.date !== d) this.data.playtime = { date: d, seconds: 0 };
    this.data.playtime.seconds += seconds;
    if (this.data.playtime.seconds % 60 === 0) this.profile().playMinutes++;
    if (this.data.playtime.seconds % 10 === 0) this.save();
  }
  playedTodayMin(): number {
    return this.data.playtime.date === today() ? Math.floor(this.data.playtime.seconds / 60) : 0;
  }
  limitReached(): boolean {
    const lim = this.data.settings.dailyLimitMin;
    return lim > 0 && this.playedTodayMin() >= lim;
  }

  /** Replace profiles and matches with the simulated dataset (demos, R&D, front-end testing). */
  loadDemo() {
    const local = this.data.profiles.filter((p) => !p.simulated);
    this.data.profiles = [...local, ...(seed.profiles as Profile[])];
    this.data.matches = [...(seed.matches as MatchRecord[])];
    this.data.activeProfileId = seed.profiles[0].id;
    this.save();
  }

  reset() { this.data = freshSave(); this.save(); }

  leaderboard(): Profile[] {
    return [...this.data.profiles].sort((a, b) => b.totalStars - a.totalStars || b.arenaWins - a.arenaWins);
  }
}

export const repo = new Repository();
