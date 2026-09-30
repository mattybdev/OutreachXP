// Stats & Journal (GDD §8.1 item 6, §13): the outreach funnel, category breakdown, weekly
// activity, personal bests and a journal of Ping's milestones. All derived from the event log.

import { FORM_NAMES, resolveForm } from '../ping/genome';
import { computeAchievements } from './achievements';
import { activityWeeks, addDays, seasonStart, streakOn, weekStartOf } from './care';
import { toISODate } from './dates';
import { computeSeason, sortEvents } from './engine';
import { lifeStageForLevel, titleForLevel } from './rules';
import { CATEGORIES, type Category, type EventType, type GameState, type OutreachEvent } from './types';

type SeasonEvent = OutreachEvent & { category: Category };

function seasonEvents(state: GameState, seasonId: string): SeasonEvent[] {
  const contacts = new Map(state.contacts.map((c) => [c.id, c]));
  const threads = new Map(state.threads.map((t) => [t.id, t]));
  return sortEvents(state.events.filter((e) => e.seasonId === seasonId)).flatMap((e) => {
    const contact = contacts.get(threads.get(e.threadId)?.contactId ?? '');
    return contact ? [{ ...e, category: contact.category }] : [];
  });
}

// ─── Funnel and categories ─────────────────────────────────────────────────

export interface Funnel {
  sent: number;
  replied: number;
  committed: number;
  converted: number;
}

/** Contacts reaching each stage (a later stage implies the earlier ones were logged). */
export function funnel(state: GameState, seasonId: string, category?: Category): Funnel {
  const events = seasonEvents(state, seasonId).filter((e) => !category || e.category === category);
  const threadsWith = (type: EventType) => new Set(events.filter((e) => e.type === type).map((e) => e.threadId)).size;
  return { sent: threadsWith('sent'), replied: threadsWith('replied'), committed: threadsWith('committed'), converted: threadsWith('converted') };
}

export interface CategoryRow extends Funnel {
  category: Category;
  replyRate: number | null;
}

export function categoryBreakdown(state: GameState, seasonId: string): CategoryRow[] {
  return CATEGORIES.map((category) => {
    const f = funnel(state, seasonId, category);
    return { category, ...f, replyRate: f.sent ? f.replied / f.sent : null };
  });
}

// ─── Weekly activity ───────────────────────────────────────────────────────

export interface WeekActivity {
  week: string;
  sent: number;
  followups: number;
  results: number;
  other: number;
  total: number;
}

const RESULTS: EventType[] = ['replied', 'engaged', 'committed', 'converted'];

/** One row per week from the season's first week to the week containing `today`. */
export function weeklyActivity(state: GameState, seasonId: string, today: string, category?: Category): WeekActivity[] {
  const events = seasonEvents(state, seasonId).filter((e) => !category || e.category === category);
  const first = weekStartOf(seasonStart(state, seasonId));
  const last = weekStartOf([today, events.at(-1)?.date ?? today].sort().at(-1)!);
  const rows = new Map<string, WeekActivity>();
  for (let w = first, guard = 0; w <= last && guard < 530; w = addDays(w, 7), guard++) {
    rows.set(w, { week: w, sent: 0, followups: 0, results: 0, other: 0, total: 0 });
  }
  for (const e of events) {
    const row = rows.get(weekStartOf(e.date));
    if (!row) continue;
    if (e.type === 'sent') row.sent++;
    else if (e.type === 'followup') row.followups++;
    else if (RESULTS.includes(e.type)) row.results++;
    else row.other++;
    row.total++;
  }
  return [...rows.values()];
}

// ─── Personal bests ────────────────────────────────────────────────────────

export interface Bests {
  bestWeek: WeekActivity | null;
  longestStreak: number;
  activeWeeks: number;
}

export function personalBests(state: GameState, seasonId: string, today: string): Bests {
  const weeks = weeklyActivity(state, seasonId, today);
  const bestWeek = weeks.reduce<WeekActivity | null>((best, w) => (w.total > (best?.total ?? 0) ? w : best), null);
  const events = seasonEvents(state, seasonId);
  const active = activityWeeks(events);
  const memo = new Map<string, number>();
  const floor = seasonStart(state, seasonId);
  const longestStreak = events.reduce((best, e) => Math.max(best, streakOn(e.date, active, state.settings, floor, memo)), 0);
  return { bestWeek, longestStreak, activeWeeks: active.size };
}

// ─── Journal ───────────────────────────────────────────────────────────────

export interface JournalEntry {
  date: string;
  icon: string;
  title: string;
  detail?: string;
  kind: 'season' | 'level' | 'growth' | 'achievement' | 'quest';
}

const STAGE_NAME: Record<string, string> = { baby: 'a Baby', kid: 'a Kid', teen: 'a Teen', adult: 'an Adult', legend: 'a Legend' };

/**
 * Milestones for this season, newest first: season start, hatching, level-ups, growing up,
 * evolving into a new form, Perfect Weeks and achievements unlocked during the season.
 */
export function journal(state: GameState, seasonId: string, today: string): JournalEntry[] {
  const season = state.seasons.find((s) => s.id === seasonId);
  if (!season) return [];
  const pingName = season.pingName;
  const entries: JournalEntry[] = [];
  const start = seasonStart(state, seasonId);
  entries.push({ date: toISODate(new Date(season.createdAt)) < start ? toISODate(new Date(season.createdAt)) : start, icon: '📅', title: `${season.name} began`, kind: 'season' });

  // Replay the season day by day (only days with outreach) to find level, stage and form changes.
  const own = state.events.filter((e) => e.seasonId === seasonId);
  const dates = [...new Set(own.map((e) => e.date))].sort();
  let prevLevel = 0;
  let prevStage = 'egg';
  let prevForm = 'none';
  for (const d of dates) {
    const snapshot: GameState = { ...state, events: state.events.filter((e) => e.seasonId !== seasonId || e.date <= d) };
    const summary = computeSeason(snapshot, seasonId, d);
    const level = summary.level.level;
    const stage = lifeStageForLevel(level);
    const form = resolveForm(summary.stats, stage);
    if (prevLevel === 0 && level > 0) entries.push({ date: d, icon: '🥚', title: `${pingName} hatched`, detail: 'The first outreach of the season', kind: 'growth' });
    for (let l = Math.max(2, prevLevel + 1); l <= level; l++) {
      entries.push({ date: d, icon: '⬆️', title: `Reached level ${l}`, detail: titleForLevel(l) !== titleForLevel(l - 1) ? `New title: ${titleForLevel(l)}` : undefined, kind: 'level' });
    }
    if (stage !== prevStage && stage !== 'egg' && prevStage !== 'egg') entries.push({ date: d, icon: '🌱', title: `${pingName} became ${STAGE_NAME[stage]}`, kind: 'growth' });
    if (form !== prevForm && form !== 'none') entries.push({ date: d, icon: '✨', title: `${pingName} evolved into ${FORM_NAMES[form].replace('Ping', pingName)}`, kind: 'growth' });
    prevLevel = level;
    prevStage = stage;
    prevForm = form;
  }

  const summary = computeSeason(state, seasonId, today);
  const achievements = computeAchievements(state);
  const firstPerfect = achievements.find((a) => a.id === 'perfect-week')?.unlockedOn;
  for (const w of summary.perfectWeeks) {
    const inWeek = own.filter((e) => e.date >= w && e.date < addDays(w, 7)).map((e) => e.date).sort();
    const date = inWeek.at(-1) ?? w;
    // The first Perfect Week is already in the journal as an achievement.
    if (date !== firstPerfect) entries.push({ date, icon: '⭐', title: 'Perfect Week', detail: 'All three weekly quests complete', kind: 'quest' });
  }
  const end = dates.at(-1) ?? today;
  for (const a of achievements) {
    if (a.unlockedOn && a.unlockedOn >= start && a.unlockedOn <= end) {
      entries.push({ date: a.unlockedOn, icon: a.icon, title: `Achievement: ${a.title}`, detail: a.description, kind: 'achievement' });
    }
  }
  // Newest first; within a day, keep the natural order reversed (season → growth → achievements).
  return entries.map((e, i) => ({ e, i })).sort((a, b) => b.e.date.localeCompare(a.e.date) || b.i - a.i).map(({ e }) => e);
}
