// XP engine: replays the event log to score every event (GDD §3). Pure and deterministic,
// so undo is safe and the numbers can be retuned later by replaying.

import { STATS, type Stat, type Stats } from '../ping/genome';
import { seasonStart, simulateCare, streakMultiplier, streakOn } from './care';
import { daysBetween, todayISO } from './dates';
import { evaluateQuests, momentumDates, MOMENTUM, MOMENTUM_TYPES, type QuestEvent, type QuestInstance } from './quests';
import { LIMITS, levelFromXp, STAT_POINTS, WARM_INTRO_MULTIPLIER, XP, type LevelInfo } from './rules';
import {
  CATEGORY_STAT,
  type Category,
  STAGES,
  type Contact,
  type EventType,
  type GameState,
  type OutreachEvent,
  type Thread,
  type ThreadStatus,
} from './types';

export interface XpPart {
  label: string;
  xp: number;
}

export interface LedgerEntry {
  event: OutreachEvent;
  xp: number;
  stat: Stat;
  statPoints: number;
  parts: XpPart[];
}

export interface SeasonSummary {
  entries: LedgerEntry[];
  byEventId: Map<string, LedgerEntry>;
  /** XP from logged outreach. */
  eventXp: number;
  /** XP from completed quests and Perfect Days. */
  questXp: number;
  totalXp: number;
  stats: Stats;
  level: LevelInfo;
  hasOutreach: boolean;
  quests: QuestInstance[];
  perfectDays: Set<string>;
  momentumDates: Set<string>;
}

export function orgKey(org: string): string {
  return org.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Chronological order; ties keep the order events were logged in (the sort is stable). */
export function sortEvents(events: OutreachEvent[]): OutreachEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.loggedAt.localeCompare(b.loggedAt));
}

export function indexState(state: GameState) {
  return {
    contacts: new Map(state.contacts.map((c) => [c.id, c])),
    threads: new Map(state.threads.map((t) => [t.id, t])),
  };
}

/** The first-ever initial send to each organization, across all seasons, earns the New Organization bonus. */
function newOrgEventIds(state: GameState, contacts: Map<string, Contact>, threads: Map<string, Thread>): Set<string> {
  const seen = new Set<string>();
  const firsts = new Set<string>();
  for (const e of sortEvents(state.events)) {
    if (e.type !== 'sent') continue;
    const contact = contacts.get(threads.get(e.threadId)?.contactId ?? '');
    const key = contact ? orgKey(contact.org) : '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    firsts.add(e.id);
  }
  return firsts;
}

export function computeSeason(state: GameState, seasonId: string, today = todayISO()): SeasonSummary {
  const { contacts, threads } = indexState(state);
  const newOrgs = newOrgEventIds(state, contacts, threads);
  const sendsPerDay = new Map<string, number>();
  const perThread = new Map<string, { followups: number; cc: number; referrals: number; sentDate?: string; answered: boolean }>();
  const entries: LedgerEntry[] = [];
  const stats: Stats = { intellect: 0, craft: 0, heart: 0, authority: 0 };
  let totalXp = 0;

  const seasonEvents = sortEvents(state.events.filter((e) => e.seasonId === seasonId));
  const lastDate = seasonEvents.at(-1)?.date ?? '0000-01-01';
  const care = simulateCare(state, seasonId, lastDate);
  const activity = new Set(seasonEvents.map((e) => e.date));
  const floor = seasonStart(state, seasonId);
  const streakMemo = new Map<string, number>();

  for (const event of seasonEvents) {
    const thread = threads.get(event.threadId);
    const contact = contacts.get(thread?.contactId ?? '');
    if (!thread || !contact) continue;
    const stat = CATEGORY_STAT[contact.category];
    const t = perThread.get(thread.id) ?? { followups: 0, cc: 0, referrals: 0, answered: false };
    perThread.set(thread.id, t);

    const parts: XpPart[] = [];
    let statPoints = 0;
    switch (event.type) {
      case 'sent': {
        const index = sendsPerDay.get(event.date) ?? 0;
        sendsPerDay.set(event.date, index + 1);
        const factor = index < LIMITS.fullSendsPerDay ? 1 : index < LIMITS.fullSendsPerDay + LIMITS.halfSendsPerDay ? 0.5 : 0;
        parts.push({ label: 'Sent', xp: XP.sent * factor });
        if (event.personalized) parts.push({ label: 'Personalized', xp: XP.personalized * factor });
        if (factor < 1) parts.push({ label: factor ? 'Daily send limit: half XP' : 'Daily send limit reached', xp: 0 });
        statPoints = factor > 0 ? STAT_POINTS.sent : 0;
        t.sentDate = event.date;
        break;
      }
      case 'followup': {
        t.followups++;
        if (t.followups <= LIMITS.followupsPerThread) {
          parts.push({ label: 'Follow-up', xp: XP.followup });
          statPoints = STAT_POINTS.followup;
          const age = t.sentDate ? daysBetween(t.sentDate, event.date) : -1;
          if (t.followups === 1 && !t.answered && age >= state.settings.followUpMinDays && age <= state.settings.followUpMaxDays) {
            parts.push({ label: 'On-time follow-up', xp: XP.speedBonus });
          }
        } else {
          parts.push({ label: 'Follow-up (limit reached)', xp: 0 });
        }
        break;
      }
      case 'cc': {
        const people = Math.max(0, Math.min(event.count ?? 1, LIMITS.ccPerThread - t.cc));
        t.cc += people;
        parts.push({ label: `CC'd ${people} ${people === 1 ? 'person' : 'people'}`, xp: XP.ccPerPerson * people });
        statPoints = STAT_POINTS.cc * people;
        break;
      }
      case 'referred': {
        t.referrals++;
        const rewarded = t.referrals <= LIMITS.referralsPerThread;
        parts.push({ label: rewarded ? 'Referral' : 'Referral (limit reached)', xp: rewarded ? XP.referred : 0 });
        statPoints = rewarded ? STAT_POINTS.referred : 0;
        break;
      }
      case 'closed':
        parts.push({ label: 'Closed the loop', xp: XP.closed });
        break;
      default: {
        t.answered = true;
        parts.push({ label: STAGE_PART_LABEL[event.type], xp: XP[event.type] });
        statPoints = STAT_POINTS[event.type];
      }
    }

    if (contact.referredBy) {
      const base = parts.reduce((sum, p) => sum + p.xp, 0);
      const bonus = Math.round(base * (WARM_INTRO_MULTIPLIER - 1));
      if (bonus > 0) parts.push({ label: 'Warm intro ×1.25', xp: bonus });
    }
    if (newOrgs.has(event.id)) parts.push({ label: 'New organization', xp: XP.newOrg });
    if (care.wakeEventIds.has(event.id)) parts.push({ label: 'Welcome back', xp: XP.welcomeBack });
    const multiplier = streakMultiplier(streakOn(event.date, activity, state.settings, floor, streakMemo));
    if (multiplier > 1) {
      const bonus = Math.round(parts.reduce((sum, p) => sum + p.xp, 0) * (multiplier - 1));
      if (bonus > 0) parts.push({ label: `Streak ×${multiplier.toFixed(2)}`, xp: bonus });
    }

    const xp = Math.round(parts.reduce((sum, p) => sum + p.xp, 0));
    const entry: LedgerEntry = { event, xp, stat, statPoints, parts };
    entries.push(entry);
    totalXp += xp;
    stats[stat] += statPoints;
  }

  // Quests are scored from the same events; a Perfect Day gives the next day Momentum.
  const season = state.seasons.find((s) => s.id === seasonId);
  const questEvents: QuestEvent[] = entries.map((e) => ({
    event: e.event, category: STAT_CATEGORY[e.stat], statPoints: e.statPoints, newOrg: newOrgs.has(e.event.id),
  }));
  const until = lastDate > today ? lastDate : today;
  const quests = evaluateQuests(state, questEvents, floor, until, season?.pingSeed ?? 1);
  const momentum = momentumDates(quests.perfectDays);
  for (const entry of entries) {
    if (!momentum.has(entry.event.date) || !MOMENTUM_TYPES.includes(entry.event.type)) continue;
    const bonus = Math.round(entry.xp * MOMENTUM);
    if (bonus <= 0) continue;
    entry.parts.push({ label: 'Momentum +10%', xp: bonus });
    entry.xp += bonus;
    totalXp += bonus;
  }
  for (const [stat, points] of Object.entries(quests.bonusStats)) stats[stat as Stat] += points ?? 0;

  const hasOutreach = entries.length > 0;
  const allXp = totalXp + quests.questXp;
  return {
    entries,
    byEventId: new Map(entries.map((e) => [e.event.id, e])),
    eventXp: totalXp,
    questXp: quests.questXp,
    totalXp: allXp,
    stats,
    level: levelFromXp(allXp, hasOutreach),
    hasOutreach,
    quests: quests.quests,
    perfectDays: quests.perfectDays,
    momentumDates: momentum,
  };
}

const STAT_CATEGORY: Record<Stat, Category> = { intellect: 'academia', craft: 'industry', heart: 'organizations', authority: 'government' };

const STAGE_PART_LABEL: Record<Exclude<EventType, 'sent' | 'followup' | 'cc' | 'referred' | 'closed'>, string> = {
  replied: 'Reply',
  engaged: 'Positive reply',
  committed: 'Commitment',
  converted: 'Conversion',
};

// ─── Thread status and allowed actions ─────────────────────────────────────

export function threadEvents(state: GameState, threadId: string): OutreachEvent[] {
  return sortEvents(state.events.filter((e) => e.threadId === threadId));
}

export function threadStatus(events: OutreachEvent[]): ThreadStatus {
  if (events.some((e) => e.type === 'closed')) return 'closed';
  let status: ThreadStatus = 'queued';
  for (const stage of STAGES) if (events.some((e) => e.type === stage)) status = stage;
  return status;
}

export function allowedActions(status: ThreadStatus): EventType[] {
  switch (status) {
    case 'queued': return ['sent'];
    case 'sent': return ['followup', 'replied', 'engaged', 'committed', 'converted', 'closed'];
    case 'replied': return ['engaged', 'committed', 'converted', 'cc', 'referred', 'closed'];
    case 'engaged': return ['committed', 'converted', 'cc', 'referred', 'closed'];
    case 'committed': return ['converted', 'cc', 'referred', 'closed'];
    case 'converted': return ['cc', 'referred', 'closed'];
    case 'closed': return [];
  }
}

/** Date of the last action on a thread, or null if it hasn't started. */
export function lastActionDate(events: OutreachEvent[]): string | null {
  return events.length ? events[events.length - 1].date : null;
}

/** A thread is due for a follow-up when an initial send has gone unanswered long enough. */
export function followUpDue(events: OutreachEvent[], today: string, minDays: number): boolean {
  if (threadStatus(events) !== 'sent') return false;
  const last = lastActionDate(events);
  return last !== null && daysBetween(last, today) >= minDays;
}

export function statsTotal(stats: Stats): number {
  return STATS.reduce((sum, s) => sum + stats[s], 0);
}
