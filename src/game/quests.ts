// Daily and weekly quests (GDD §6.1, §6.2). Quests are picked with a seeded shuffle, so each
// day and week has a stable set, and progress is replayed from the event log: quests complete
// automatically and undo stays consistent.

import type { Stat } from '../ping/genome';
import { mulberry32 } from '../ping/traits';
import { addDays } from './care';
import { daysBetween } from './dates';
import { CATEGORIES, CATEGORY_STAT, type Category, type EventType, type GameState, type OutreachEvent } from './types';

/** The parts of a scored event that quests look at (kept minimal to avoid an engine import cycle). */
export interface QuestEvent {
  event: OutreachEvent;
  category: Category;
  statPoints: number;
  newOrg: boolean;
}

export type QuestPeriod = 'daily' | 'weekly';

export interface QuestInstance {
  id: string;
  period: QuestPeriod;
  /** The day (daily) or the Monday that starts the week (weekly). */
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
  perfectDays: Set<string>;
  questXp: number;
  bonusStats: Partial<Record<Stat, number>>;
}

export const PERFECT_DAY_XP = 15;
export const MOMENTUM = 0.1;
const DAILY_COUNT = 3;
const WEEKLY_COUNT = 3;
const RESULT_TYPES: EventType[] = ['replied', 'engaged', 'committed', 'converted'];

interface DayInfo {
  date: string;
  events: QuestEvent[];
  due: Set<string>;
  agedFollowups: number;
}

interface WeekInfo {
  start: string;
  events: QuestEvent[];
  focus: Category;
}

interface Template<C> {
  id: string;
  title: string;
  description: (goal: number, c: C) => string;
  goal: (c: C) => number;
  reward: number;
  eligible?: (c: C) => boolean;
  progress: (c: C) => number;
  bonus?: (c: C) => { stat: Stat; points: number };
}

const count = (events: QuestEvent[], pred: (e: QuestEvent) => boolean) => events.filter(pred).length;

export const DAILY_TEMPLATES: Template<DayInfo>[] = [
  { id: 'first-letter', title: 'First Letter', description: () => 'Send 1 outreach email', goal: () => 1, reward: 10,
    progress: (d) => count(d.events, (e) => e.event.type === 'sent') },
  { id: 'triple-threat', title: 'Triple Threat', description: () => 'Send 3 outreach emails', goal: () => 3, reward: 15,
    progress: (d) => count(d.events, (e) => e.event.type === 'sent') },
  { id: 'dont-leave-hanging', title: 'Don’t Leave Them Hanging', description: () => 'Follow up on an email with no reply for 3+ days', goal: () => 1, reward: 15,
    eligible: (d) => d.due.size > 0, progress: (d) => d.agedFollowups },
  { id: 'personal-touch', title: 'Personal Touch', description: () => 'Send 2 personalized emails', goal: () => 2, reward: 10,
    progress: (d) => count(d.events, (e) => e.event.type === 'sent' && !!e.event.personalized) },
  { id: 'log-the-win', title: 'Log the Win', description: () => 'Log a reply, commitment or conversion', goal: () => 1, reward: 10,
    progress: (d) => count(d.events, (e) => RESULT_TYPES.includes(e.event.type)) },
  { id: 'new-horizons', title: 'New Horizons', description: () => 'Contact someone from a new organization', goal: () => 1, reward: 15,
    progress: (d) => count(d.events, (e) => e.newOrg) },
  { id: 'tend-the-garden', title: 'Tend the Garden', description: (goal) => `Clear all ${goal} follow-up reminder${goal === 1 ? '' : 's'} due today`,
    goal: (d) => d.due.size, reward: 15, eligible: (d) => d.due.size > 0,
    progress: (d) => [...d.due].filter((t) => d.events.some((e) => e.event.threadId === t)).length },
];

export const WEEKLY_TEMPLATES: Template<WeekInfo>[] = [
  { id: 'well-rounded', title: 'Well-Rounded', description: () => 'Email people in 3 of the 4 categories', goal: () => 3, reward: 75,
    progress: (w) => new Set(w.events.filter((e) => e.event.type === 'sent').map((e) => e.category)).size },
  { id: 'conversation-starter', title: 'Conversation Starter', description: () => 'Get 3 replies', goal: () => 3, reward: 60,
    progress: (w) => count(w.events, (e) => e.event.type === 'replied') },
  { id: 'door-opener', title: 'Door Opener', description: () => 'Get a referral or a CC', goal: () => 1, reward: 50,
    progress: (w) => count(w.events, (e) => e.event.type === 'cc' || e.event.type === 'referred') },
  { id: 'pipeline-pusher', title: 'Pipeline Pusher', description: () => 'Move 5 contacts forward a stage', goal: () => 5, reward: 60,
    progress: (w) => new Set(w.events.filter((e) => RESULT_TYPES.includes(e.event.type)).map((e) => e.event.threadId)).size },
  { id: 'category-focus', title: 'Category Focus', description: (_g, w) => `Send 5 emails to ${CATEGORY_NAME[w.focus]}, your Ping’s lowest area`, goal: () => 5, reward: 75,
    progress: (w) => count(w.events, (e) => e.event.type === 'sent' && e.category === w.focus),
    bonus: (w) => ({ stat: CATEGORY_STAT[w.focus], points: 5 }) },
  { id: 'consistency', title: 'Consistency', description: () => 'Log outreach on 4 different days', goal: () => 4, reward: 60,
    progress: (w) => new Set(w.events.map((e) => e.event.date)).size },
];

const CATEGORY_NAME: Record<Category, string> = { academia: 'Academia', industry: 'Industry', organizations: 'Organizations', government: 'Government' };

export function weekStartOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return addDays(date, -((dow + 6) % 7));
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T extends { id: string }>(pool: T[], n: number, seed: number): T[] {
  const rand = mulberry32(seed);
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
}

/** Threads awaiting a reply whose follow-up was due at the start of `date`. */
function dueAtStart(byThread: Map<string, OutreachEvent[]>, date: string, minDays: number): Set<string> {
  const due = new Set<string>();
  for (const [threadId, events] of byThread) {
    const before = events.filter((e) => e.date < date);
    if (!before.length || !before.some((e) => e.type === 'sent')) continue;
    if (before.some((e) => e.type === 'closed' || RESULT_TYPES.includes(e.type))) continue;
    if (daysBetween(before[before.length - 1].date, date) >= minDays) due.add(threadId);
  }
  return due;
}

export function evaluateQuests(state: GameState, scored: QuestEvent[], start: string, until: string, seed: number): QuestResult {
  const byDate = new Map<string, QuestEvent[]>();
  const byThread = new Map<string, OutreachEvent[]>();
  for (const q of scored) {
    const list = byDate.get(q.event.date) ?? [];
    list.push(q);
    byDate.set(q.event.date, list);
    const t = byThread.get(q.event.threadId) ?? [];
    t.push(q.event);
    byThread.set(q.event.threadId, t);
  }
  const minDays = state.settings.followUpMinDays;
  const quests: QuestInstance[] = [];
  const perfectDays = new Set<string>();
  const bonusStats: Partial<Record<Stat, number>> = {};
  let questXp = 0;

  const add = <C>(period: QuestPeriod, key: string, tpl: Template<C>, c: C): QuestInstance => {
    const goal = Math.max(1, tpl.goal(c));
    const progress = Math.min(goal, tpl.progress(c));
    const instance: QuestInstance = {
      id: `${period}:${key}:${tpl.id}`, period, key, templateId: tpl.id, title: tpl.title,
      description: tpl.description(goal, c), goal, progress, reward: tpl.reward, completed: progress >= goal,
      ...(tpl.bonus ? { bonusStat: tpl.bonus(c) } : {}),
    };
    quests.push(instance);
    if (instance.completed) {
      questXp += instance.reward;
      if (instance.bonusStat) bonusStats[instance.bonusStat.stat] = (bonusStats[instance.bonusStat.stat] ?? 0) + instance.bonusStat.points;
    }
    return instance;
  };

  for (let d = start, guard = 0; d <= until && guard < 3660; d = addDays(d, 1), guard++) {
    const events = byDate.get(d) ?? [];
    const due = dueAtStart(byThread, d, minDays);
    const agedFollowups = events.filter((e) => {
      if (e.event.type !== 'followup') return false;
      const prior = (byThread.get(e.event.threadId) ?? []).filter((x) => x.date < d);
      return prior.length > 0 && daysBetween(prior[prior.length - 1].date, d) >= minDays;
    }).length;
    const info: DayInfo = { date: d, events, due, agedFollowups };
    const chosen = pick(DAILY_TEMPLATES.filter((t) => !t.eligible || t.eligible(info)), DAILY_COUNT, hashSeed(`${seed}:day:${d}`));
    const done = chosen.map((tpl) => add('daily', d, tpl, info)).every((q) => q.completed);
    if (done) {
      perfectDays.add(d);
      questXp += PERFECT_DAY_XP;
    }
  }

  const statsBefore = (weekStart: string): Record<Category, number> => {
    const totals = { academia: 0, industry: 0, organizations: 0, government: 0 };
    for (const q of scored) if (q.event.date < weekStart) totals[q.category] += q.statPoints;
    return totals;
  };
  for (let w = weekStartOf(start), guard = 0; w <= until && guard < 530; w = addDays(w, 7), guard++) {
    const end = addDays(w, 6);
    const totals = statsBefore(w);
    const focus = [...CATEGORIES].sort((a, b) => totals[a] - totals[b])[0];
    const info: WeekInfo = { start: w, focus, events: scored.filter((q) => q.event.date >= w && q.event.date <= end) };
    for (const tpl of pick(WEEKLY_TEMPLATES, WEEKLY_COUNT, hashSeed(`${seed}:week:${w}`))) add('weekly', w, tpl, info);
  }

  return { quests, perfectDays, questXp, bonusStats };
}

/** Momentum: the day after a Perfect Day, results (replies, commitments, conversions) earn +10%. */
export function momentumDates(perfectDays: Set<string>): Set<string> {
  return new Set([...perfectDays].map((d) => addDays(d, 1)));
}

export const MOMENTUM_TYPES = RESULT_TYPES;
