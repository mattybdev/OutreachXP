// Ping's genome: everything needed to redraw a Ping exactly (GDD §9.4).

export const STATS = ['intellect', 'craft', 'heart', 'authority'] as const;
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;

export const LIFE_STAGES = ['egg', 'baby', 'kid', 'teen', 'adult', 'legend'] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export const MOODS = ['happy', 'neutral', 'sad', 'sleepy'] as const;
export type Mood = (typeof MOODS)[number];

export const PURE_FORMS = { intellect: 'scholar', craft: 'forge', heart: 'kindred', authority: 'envoy' } as const;
export type PureForm = (typeof PURE_FORMS)[Stat];
export type HybridForm = 'inventor' | 'mentor' | 'strategist' | 'maker' | 'architect' | 'diplomat';
export type Form = 'none' | PureForm | HybridForm | 'polymath';

export const FORM_NAMES: Record<Form, string> = {
  none: 'Ping',
  scholar: 'Scholar Ping',
  forge: 'Forge Ping',
  kindred: 'Kindred Ping',
  envoy: 'Envoy Ping',
  inventor: 'Inventor Ping',
  mentor: 'Mentor Ping',
  strategist: 'Strategist Ping',
  maker: 'Maker Ping',
  architect: 'Architect Ping',
  diplomat: 'Diplomat Ping',
  polymath: 'Polymath Ping',
};

const HYBRIDS: Record<string, HybridForm> = {
  'intellect+craft': 'inventor',
  'intellect+heart': 'mentor',
  'intellect+authority': 'strategist',
  'craft+heart': 'maker',
  'craft+authority': 'architect',
  'heart+authority': 'diplomat',
};

export interface PingGenome {
  seed: number;
  lifeStage: LifeStage;
  stats: Stats;
  mood: Mood;
  /** Omit to derive the form from stats (the normal case). */
  form?: Form;
}

/** Stat points needed for tiers 0–5 (GDD §4.2). */
export const TIER_THRESHOLDS = [0, 20, 60, 140, 280, 500] as const;

/** Highest body-part tier each life stage may show (GDD §4.3). */
export const STAGE_TIER_CAP: Record<LifeStage, number> = {
  egg: 0,
  baby: 1,
  kid: 3,
  teen: 4,
  adult: 5,
  legend: 5,
};

export function rawTier(points: number): number {
  let tier = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) if (points >= TIER_THRESHOLDS[i]) tier = i;
  return tier;
}

export function visibleTier(points: number, stage: LifeStage): number {
  return Math.min(rawTier(points), STAGE_TIER_CAP[stage]);
}

/**
 * Points that count toward continuous growth. Growth stored beyond the stage
 * cap is held back until Ping grows into the next stage (GDD §4.3).
 */
export function effectivePoints(points: number, stage: LifeStage): number {
  const cap = STAGE_TIER_CAP[stage];
  const limit = cap >= 5 ? Infinity : TIER_THRESHOLDS[cap + 1] - 1;
  return Math.max(0, Math.min(points, limit));
}

/** Saturating 0..1 growth curve: early points show quickly, growth never runs away. */
export function growth(points: number): number {
  return 1 - Math.exp(-Math.max(0, points) / 160);
}

/** Form rules from GDD §4.4, evaluated in order. Only Teen and older have a form. */
export function resolveForm(stats: Stats, stage: LifeStage): Form {
  if (stage === 'egg' || stage === 'baby' || stage === 'kid') return 'none';
  const total = STATS.reduce((sum, s) => sum + Math.max(0, stats[s]), 0);
  if (total <= 0) return 'none';
  const share = (s: Stat) => Math.max(0, stats[s]) / total;
  const ranked = [...STATS].sort((a, b) => share(b) - share(a));

  if (STATS.every((s) => share(s) >= 0.15 && share(s) <= 0.35)) return 'polymath';
  if (share(ranked[0]) >= 0.4) return PURE_FORMS[ranked[0]];
  if (share(ranked[0]) >= 0.3 && share(ranked[1]) >= 0.3) return hybridOf(ranked[0], ranked[1]);
  return PURE_FORMS[ranked[0]];
}

export function hybridOf(a: Stat, b: Stat): HybridForm {
  const [x, y] = STATS.indexOf(a) < STATS.indexOf(b) ? [a, b] : [b, a];
  return HYBRIDS[`${x}+${y}`];
}

/** The two stats a form draws its look from (primary first). */
export function formStats(form: Form): Stat[] {
  switch (form) {
    case 'scholar': return ['intellect'];
    case 'forge': return ['craft'];
    case 'kindred': return ['heart'];
    case 'envoy': return ['authority'];
    case 'none':
    case 'polymath': return [];
  }
  const key = Object.keys(HYBRIDS).find((k) => HYBRIDS[k] === form)!;
  return key.split('+') as Stat[];
}
