// Achievements (GDD §7): permanent badges across all seasons, replayed from the event log.
// Each records the date it was unlocked; locked ones show progress where it makes sense.

import { streakOn } from './care';
import { computeSeason, sortEvents } from './engine';
import { CATEGORIES, type Category, type EventType, type GameState, type OutreachEvent } from './types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: 'Milestones' | 'Habits' | 'Categories';
  unlockedOn: string | null;
  progress?: { value: number; goal: number };
}

interface Ctx {
  events: (OutreachEvent & { category: Category })[];
  state: GameState;
}

type Def = Omit<Achievement, 'unlockedOn' | 'progress'> & { check: (c: Ctx) => { on: string | null; value?: number; goal?: number } };

function nth(events: { date: string }[], n: number): { on: string | null; value: number; goal: number } {
  return { on: events.length >= n ? events[n - 1].date : null, value: Math.min(events.length, n), goal: n };
}
const ofType = (c: Ctx, type: EventType) => c.events.filter((e) => e.type === type);

const CATEGORY_BADGES: Record<Category, [string, string]> = {
  academia: ['Office Hours', '🎓'],
  industry: ['Mixer Regular', '🛠️'],
  organizations: ['Community Builder', '🤝'],
  government: ['Public Servant', '🏛️'],
};

const DEFS: Def[] = [
  { id: 'hatchling', title: 'Hatchling', description: 'Log your first outreach and hatch your Ping', icon: '🥚', group: 'Milestones', check: (c) => nth(c.events, 1) },
  { id: 'pen-pal', title: 'Pen Pal', description: 'Send 10 emails', icon: '✉️', group: 'Milestones', check: (c) => nth(ofType(c, 'sent'), 10) },
  { id: 'postmaster', title: 'Postmaster', description: 'Send 100 emails', icon: '📮', group: 'Milestones', check: (c) => nth(ofType(c, 'sent'), 100) },
  { id: 'first-contact', title: 'First Contact', description: 'Get your first reply', icon: '💬', group: 'Milestones', check: (c) => nth(ofType(c, 'replied'), 1) },
  { id: 'the-conversation', title: 'The Conversation', description: 'Get 25 replies', icon: '🗨️', group: 'Milestones', check: (c) => nth(ofType(c, 'replied'), 25) },
  { id: 'believer', title: 'Believer', description: 'Get your first commitment', icon: '🤞', group: 'Milestones', check: (c) => nth(ofType(c, 'committed'), 1) },
  { id: 'showrunner', title: 'Showrunner', description: 'Get 10 commitments', icon: '🎬', group: 'Milestones', check: (c) => nth(ofType(c, 'committed'), 10) },
  { id: 'signed-sealed', title: 'Signed, Sealed, Delivered', description: 'Get your first conversion', icon: '🏅', group: 'Milestones', check: (c) => nth(ofType(c, 'converted'), 1) },
  { id: 'hall-of-fame', title: 'Hall of Fame', description: 'Get 25 conversions', icon: '🏆', group: 'Milestones', check: (c) => nth(ofType(c, 'converted'), 25) },

  { id: 'persistence', title: 'Persistence Pays', description: 'Get a reply after your 2nd follow-up', icon: '🔁', group: 'Habits', check: (c) => {
    const followups = new Map<string, number>();
    for (const e of c.events) {
      if (e.type === 'followup') followups.set(e.threadId, (followups.get(e.threadId) ?? 0) + 1);
      if (e.type === 'replied' && (followups.get(e.threadId) ?? 0) >= 2) return { on: e.date };
    }
    return { on: null };
  } },
  { id: 'the-ripple', title: 'The Ripple', description: 'One contact CCs or forwards you to 5+ people', icon: '🌊', group: 'Habits', check: (c) => {
    const cc = new Map<string, number>();
    let best = 0;
    for (const e of c.events) {
      if (e.type !== 'cc') continue;
      const total = (cc.get(e.threadId) ?? 0) + (e.count ?? 1);
      cc.set(e.threadId, total);
      best = Math.max(best, total);
      if (total >= 5) return { on: e.date };
    }
    return { on: null, value: best, goal: 5 };
  } },
  { id: 'chain-reaction', title: 'Chain Reaction', description: 'Get a referral from someone who was referred to you', icon: '⛓️', group: 'Habits', check: (c) => {
    const contacts = new Map(c.state.contacts.map((x) => [x.id, x]));
    const threads = new Map(c.state.threads.map((t) => [t.id, t]));
    const hit = c.events.find((e) => e.type === 'referred' && contacts.get(threads.get(e.threadId)?.contactId ?? '')?.referredBy);
    return { on: hit?.date ?? null };
  } },
  { id: 'four-corners', title: 'Four Corners', description: 'Email all 4 categories in a single day', icon: '🧭', group: 'Habits', check: (c) => {
    const byDay = new Map<string, Set<Category>>();
    for (const e of c.events) {
      if (e.type !== 'sent') continue;
      const set = byDay.get(e.date) ?? new Set();
      set.add(e.category);
      byDay.set(e.date, set);
      if (set.size === 4) return { on: e.date };
    }
    return { on: null };
  } },
  { id: 'streak-week', title: 'On a Roll', description: 'Reach a 5-day outreach streak', icon: '🔥', group: 'Habits', check: (c) => streakReached(c, 5) },
  { id: 'streak-month', title: 'Unstoppable', description: 'Reach a 20-day outreach streak', icon: '☄️', group: 'Habits', check: (c) => streakReached(c, 20) },
  { id: 'perfect-day', title: 'Perfect Day', description: 'Complete all 3 daily quests in one day', icon: '⭐', group: 'Habits', check: (c) => {
    const days = c.state.seasons.flatMap((s) => [...computeSeason(c.state, s.id).perfectDays]).sort();
    return { on: days[0] ?? null };
  } },
  { id: 'well-rounded', title: 'Well-Rounded', description: 'Reach Tier 2 in all four stats in one season', icon: '🌈', group: 'Habits', check: (c) => {
    let best: string | null = null;
    for (const s of c.state.seasons) {
      const totals = { intellect: 0, craft: 0, heart: 0, authority: 0 };
      for (const entry of computeSeason(c.state, s.id).entries) {
        totals[entry.stat] += entry.statPoints;
        if (Object.values(totals).every((v) => v >= 60)) {
          if (!best || entry.event.date < best) best = entry.event.date;
          break;
        }
      }
    }
    return { on: best };
  } },
  { id: 'comeback-kid', title: 'Comeback Kid', description: 'Wake your Ping from hibernation', icon: '🌅', group: 'Habits', check: (c) => {
    const dates = c.state.seasons.flatMap((s) => computeSeason(c.state, s.id).entries.filter((e) => e.parts.some((p) => p.label === 'Welcome back')).map((e) => e.event.date)).sort();
    return { on: dates[0] ?? null };
  } },

  ...CATEGORIES.map((cat): Def => ({
    id: `category-${cat}`, title: CATEGORY_BADGES[cat][0], icon: CATEGORY_BADGES[cat][1], group: 'Categories',
    description: `Email 10 people in ${cat === 'organizations' ? 'Organizations' : cat[0].toUpperCase() + cat.slice(1)}`,
    check: (c) => nth(c.events.filter((e) => e.type === 'sent' && e.category === cat), 10),
  })),
];

function streakReached(c: Ctx, length: number): { on: string | null; value: number; goal: number } {
  let best = 0;
  for (const season of c.state.seasons) {
    const dates = [...new Set(c.events.filter((e) => e.seasonId === season.id).map((e) => e.date))].sort();
    const activity = new Set(dates);
    const memo = new Map<string, number>();
    for (const d of dates) {
      const s = streakOn(d, activity, c.state.settings, dates[0], memo);
      best = Math.max(best, s);
      if (s >= length) return { on: d, value: length, goal: length };
    }
  }
  return { on: null, value: best, goal: length };
}

export function computeAchievements(state: GameState): Achievement[] {
  const contacts = new Map(state.contacts.map((c) => [c.id, c]));
  const threads = new Map(state.threads.map((t) => [t.id, t]));
  const events = sortEvents(state.events).flatMap((e) => {
    const contact = contacts.get(threads.get(e.threadId)?.contactId ?? '');
    return contact ? [{ ...e, category: contact.category }] : [];
  });
  const ctx: Ctx = { events, state };
  return DEFS.map(({ check, ...def }) => {
    const r = check(ctx);
    return {
      ...def,
      unlockedOn: r.on,
      ...(r.on === null && r.goal ? { progress: { value: r.value ?? 0, goal: r.goal } } : {}),
    };
  });
}
