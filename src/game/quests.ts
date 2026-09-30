// Weekly and monthly quests (GDD §6.2, §6.3), paced for outreach done a few times a week.
// Quests are picked with a seeded shuffle, so each week and month has a stable set, and progress
// is replayed from the event log: quests complete automatically and undo stays consistent.

import type { Stat } from '../ping/genome';
import { mulberry32 } from '../ping/traits';
import { addDays, weekStartOf } from './care';
import { daysBetween } from './dates';
import { CATEGORIES, CATEGORY_STAT, type Category, type EventType, type GameState, type OutreachEvent } from './types';

export { weekStartOf } from './care';

/** The parts of a scored event that quests look at (kept minimal to avoid an engine import cycle). */
export interface QuestEvent {
  event: OutreachEvent;
  category: Category;
  statPoints: number;
  newOrg: boolean;
}

export type QuestPeriod = 'weekly' | 'monthly';

export interface QuestInstance {
  id: string;
  period: QuestPeriod;
  /** The Monday that starts the week, or the first day of the month. */
  key: string;
  templateId: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  reward: number;
  bonusStat?: { stat: Stat; points: number };
  completed: boolean;
}

export interface QuestResult {
  quests: QuestInstance[];
  /** Weeks (by Monday) where all weekly quests were completed. */
  perfectWeeks: Set<string>;
  questXp: number;
  bonusStats: Partial<Record<Stat, number>>;
}

export const PERFECT_WEEK_XP = 50;
export const MOMENTUM = 0.1;
const WEEKLY_COUNT = 3;
const MONTHLY_COUNT = 2;
const RESULT_TYPES: EventType[] = ['replied', 'engaged', 'committed', 'converted'];

interface PeriodInfo {
  start: string;
  events: QuestEvent[];
  /** Follow-ups due when the period began. */
  due: number;
  /** Follow-ups sent to emails unanswered for at least the reminder window. */
  agedFollowups: number;
  focus: Category;
  perfectWeeks: number;
  /** Days of the period inside the season (a season can start mid-month). */
  daysAvailable: number;
}

interface Template {
  id: string;
  title: string;
  description: (goal: number, c: PeriodInfo) => string;
  goal: number;
  reward: number;
  eligible?: (c: PeriodInfo) => boolean;
  progress: (c: PeriodInfo) => number;
  bonus?: (c: PeriodInfo) => { stat: Stat; points: number };
}

const CATEGORY_NAME: Record<Category, string> = { academia: 'Academia', industry: 'Industry', organizations: 'Organizations', government: 'Government' };
const count = (events: QuestEvent[], pred: (e: QuestEvent) => boolean) => events.filter(pred).length;
const sends = (c: PeriodInfo) => c.events.filter((e) => e.event.type === 'sent');

export const WEEKLY_TEMPLATES: Template[] = [
  { id: 'outreach-burst', title: 'Outreach Burst', description: (g) => `Send ${g} outreach emails`, goal: 5, reward: 50,
    progress: (c) => sends(c).length },
  { id: 'well-rounded', title: 'Well-Rounded', description: () => 'Email people in 3 of the 4 categories', goal: 3, reward: 75,
    progress: (c) => new Set(sends(c).map((e) => e.category)).size },
  { id: 'personal-touch', title: 'Personal Touch', description: (g) => `Send ${g} personalized emails`, goal: 3, reward: 50,
    progress: (c) => count(c.events, (e) => e.event.type === 'sent' && !!e.event.personalized) },
  { id: 'new-horizons', title: 'New Horizons', description: (g) => `Contact ${g} new organizations`, goal: 2, reward: 60,
    progress: (c) => count(c.events, (e) => e.newOrg) },
  { id: 'follow-through', title: 'Follow-Through', description: (g) => `Follow up on ${g} unanswered emails`, goal: 2, reward: 50,
    eligible: (c) => c.due > 0, progress: (c) => c.agedFollowups },
  { id: 'conversation-starter', title: 'Conversation Starter', description: (g) => `Get ${g} replies`, goal: 2, reward: 60,
    progress: (c) => count(c.events, (e) => e.event.type === 'replied') },
  { id: 'door-opener', title: 'Door Opener', description: () => 'Get a referral or a CC', goal: 1, reward: 50,
    progress: (c) => count(c.events, (e) => e.event.type === 'cc' || e.event.type === 'referred') },
  { id: 'pipeline-pusher', title: 'Pipeline Pusher', description: (g) => `Move ${g} contacts forward a stage`, goal: 3, reward: 60,
    progress: (c) => new Set(c.events.filter((e) => RESULT_TYPES.includes(e.event.type)).map((e) => e.event.threadId)).size },
  { id: 'category-focus', title: 'Category Focus', description: (g, c) => `Send ${g} emails to ${CATEGORY_NAME[c.focus]}, your Ping’s lowest area`, goal: 3, reward: 75,
    progress: (c) => count(c.events, (e) => e.event.type === 'sent' && e.category === c.focus),
    bonus: (c) => ({ stat: CATEGORY_STAT[c.focus], points: 5 }) },
  { id: 'steady-hand', title: 'Steady Hand', description: (g) => `Log outreach on ${g} different days`, goal: 2, reward: 50,
    progress: (c) => new Set(c.events.map((e) => e.event.date)).size },
];

export const MONTHLY_TEMPLATES: Template[] = [
  { id: 'recruitment-drive', title: 'Recruitment Drive', description: (g) => `Get ${g} commitments`, goal: 3, reward: 250,
    progress: (c) => count(c.events, (e) => e.event.type === 'committed') },
  { id: 'big-net', title: 'Big Net', description: (g) => `Email ${g} different people`, goal: 15, reward: 200,
    progress: (c) => new Set(sends(c).map((e) => e.event.threadId)).size },
  { id: 'bridge-builder', title: 'Bridge Builder', description: (g) => `Contact ${g} new organizations`, goal: 5, reward: 200,
    progress: (c) => count(c.events, (e) => e.newOrg) },
  { id: 'closer', title: 'Closer', description: () => 'Get a conversion (a submission, judge or participant)', goal: 1, reward: 250,
    progress: (c) => count(c.events, (e) => e.event.type === 'converted') },
  { id: 'full-house', title: 'Full House', description: () => 'Get a reply from all 4 categories', goal: 4, reward: 200,
    progress: (c) => new Set(c.events.filter((e) => e.event.type === 'replied').map((e) => e.category)).size },
  { id: 'perfectionist', title: 'Perfectionist', description: () => 'Complete a Perfect Week', goal: 1, reward: 150,
    eligible: (c) => c.daysAvailable >= 7, progress: (c) => c.perfectWeeks },
];

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(pool: T[], n: number, seed: number): T[] {
  const rand = mulberry32(seed);
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
}

function monthStartOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function nextMonth(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export function evaluateQuests(state: GameState, scored: QuestEvent[], start: string, until: string, seed: number): QuestResult {
  const byThread = new Map<string, OutreachEvent[]>();
  for (const q of scored) {
    const t = byThread.get(q.event.threadId) ?? [];
    t.push(q.event);
    byThread.set(q.event.threadId, t);
  }
  const minDays = state.settings.followUpMinDays;
  const quests: QuestInstance[] = [];
  const perfectWeeks = new Set<string>();
  const bonusStats: Partial<Record<Stat, number>> = {};
  let questXp = 0;

  /** Threads awaiting a reply whose follow-up was due at the start of `date`. */
  const dueAt = (date: string) => {
    let due = 0;
    for (const events of byThread.values()) {
      const before = events.filter((e) => e.date < date);
      if (!before.some((e) => e.type === 'sent') || before.some((e) => e.type === 'closed' || RESULT_TYPES.includes(e.type))) continue;
      if (daysBetween(before[before.length - 1].date, date) >= minDays) due++;
    }
    return due;
  };
  const info = (from: string, to: string, perfect = 0): PeriodInfo => {
    const daysAvailable = daysBetween(from > start ? from : start, to) + 1;
    const events = scored.filter((q) => q.event.date >= from && q.event.date <= to);
    const totals = { academia: 0, industry: 0, organizations: 0, government: 0 };
    for (const q of scored) if (q.event.date < from) totals[q.category] += q.statPoints;
    const agedFollowups = events.filter((e) => {
      if (e.event.type !== 'followup') return false;
      const prior = (byThread.get(e.event.threadId) ?? []).filter((x) => x.date < e.event.date);
      return prior.length > 0 && daysBetween(prior[prior.length - 1].date, e.event.date) >= minDays;
    }).length;
    return { start: from, events, due: dueAt(from), agedFollowups, focus: [...CATEGORIES].sort((a, b) => totals[a] - totals[b])[0], perfectWeeks: perfect, daysAvailable };
  };
  const add = (period: QuestPeriod, key: string, tpl: Template, c: PeriodInfo): QuestInstance => {
    const progress = Math.min(tpl.goal, tpl.progress(c));
    const instance: QuestInstance = {
      id: `${period}:${key}:${tpl.id}`, period, key, templateId: tpl.id, title: tpl.title,
      description: tpl.description(tpl.goal, c), goal: tpl.goal, progress, reward: tpl.reward, completed: progress >= tpl.goal,
      ...(tpl.bonus ? { bonusStat: tpl.bonus(c) } : {}),
    };
    quests.push(instance);
    if (instance.completed) {
      questXp += instance.reward;
      if (instance.bonusStat) bonusStats[instance.bonusStat.stat] = (bonusStats[instance.bonusStat.stat] ?? 0) + instance.bonusStat.points;
    }
    return instance;
  };

  for (let w = weekStartOf(start), guard = 0; w <= until && guard < 530; w = addDays(w, 7), guard++) {
    const c = info(w, addDays(w, 6));
    const pool = WEEKLY_TEMPLATES.filter((t) => !t.eligible || t.eligible(c));
    const done = pick(pool, WEEKLY_COUNT, hashSeed(`${seed}:week:${w}`)).map((tpl) => add('weekly', w, tpl, c)).every((q) => q.completed);
    if (done) {
      perfectWeeks.add(w);
      questXp += PERFECT_WEEK_XP;
    }
  }

  for (let m = monthStartOf(start), guard = 0; m <= until && guard < 130; m = nextMonth(m), guard++) {
    const end = addDays(nextMonth(m), -1);
    const perfect = [...perfectWeeks].filter((w) => addDays(w, 6) >= m && addDays(w, 6) <= end).length;
    const c = info(m, end, perfect);
    const pool = MONTHLY_TEMPLATES.filter((t) => !t.eligible || t.eligible(c));
    for (const tpl of pick(pool, MONTHLY_COUNT, hashSeed(`${seed}:month:${m}`))) add('monthly', m, tpl, c);
  }

  return { quests, perfectWeeks, questXp, bonusStats };
}

/** Momentum: the week after a Perfect Week, results (replies, commitments, conversions) earn +10%. */
export function momentumWeeks(perfectWeeks: Set<string>): Set<string> {
  return new Set([...perfectWeeks].map((w) => addDays(w, 7)));
}

export const MOMENTUM_TYPES = RESULT_TYPES;
export { monthStartOf };
