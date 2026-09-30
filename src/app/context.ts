// Shared helpers for the game's views: the app context, derived data, and HTML utilities.

import { simulateCare, streakInfo, type CareResult, type StreakInfo } from '../game/care';
import { daysBetween, todayISO } from '../game/dates';
import { computeSeason, followUpDue, lastActionDate, threadEvents, threadStatus, type SeasonSummary } from '../game/engine';
import { KEY_DATE_LABELS } from '../game/rules';
import type { Category, Contact, GameState, KeyDates, OutreachEvent, Season, Thread, ThreadStatus } from '../game/types';

export interface QuickLogOptions {
  mode?: 'new' | 'update';
  threadId?: string;
}

export interface AppContext {
  state: GameState;
  /** Save a new state and re-render. `before` lets the app announce XP gained and level-ups. */
  commit(next: GameState, before?: GameState): void;
  navigate(route: string): void;
  openQuickLog(options?: QuickLogOptions): void;
  toast(message: string, tone?: 'info' | 'xp' | 'error'): void;
}

export function currentSeason(state: GameState): Season | null {
  return state.seasons.find((s) => s.id === state.currentSeasonId) ?? null;
}

let memo: { state: GameState; summary: SeasonSummary } | null = null;
export function seasonSummary(state: GameState): SeasonSummary | null {
  if (!state.currentSeasonId) return null;
  if (memo?.state !== state) memo = { state, summary: computeSeason(state, state.currentSeasonId) };
  return memo.summary;
}

let careMemo: { state: GameState; today: string; value: { care: CareResult; streak: StreakInfo } } | null = null;
/** Ping's meters and the outreach streak as of today. */
export function careNow(state: GameState, today = todayISO()): { care: CareResult; streak: StreakInfo } | null {
  if (!state.currentSeasonId) return null;
  if (careMemo?.state !== state || careMemo.today !== today) {
    careMemo = {
      state, today,
      value: { care: simulateCare(state, state.currentSeasonId, today), streak: streakInfo(state, state.currentSeasonId, today) },
    };
  }
  return careMemo.value;
}

export interface ThreadView {
  thread: Thread;
  contact: Contact;
  events: OutreachEvent[];
  status: ThreadStatus;
  lastDate: string | null;
  due: boolean;
  referrer?: Contact;
}

export function threadViews(state: GameState, today = todayISO()): ThreadView[] {
  const contacts = new Map(state.contacts.map((c) => [c.id, c]));
  return state.threads
    .filter((t) => t.seasonId === state.currentSeasonId && contacts.has(t.contactId))
    .map((thread) => {
      const contact = contacts.get(thread.contactId)!;
      const events = threadEvents(state, thread.id);
      return {
        thread, contact, events,
        status: threadStatus(events),
        lastDate: lastActionDate(events),
        due: followUpDue(events, today, state.settings.followUpMinDays),
        referrer: contact.referredBy ? contacts.get(contact.referredBy) : undefined,
      };
    });
}

export interface UpcomingDate {
  key: keyof KeyDates;
  label: string;
  date: string;
  days: number;
}

export function upcomingDates(season: Season, today = todayISO()): UpcomingDate[] {
  return (Object.entries(season.keyDates) as [keyof KeyDates, string][])
    .map(([key, date]) => ({ key, label: KEY_DATE_LABELS[key], date, days: daysBetween(today, date) }))
    .filter((d) => d.days >= 0)
    .sort((a, b) => a.days - b.days);
}

export function relativeDay(date: string | null, today = todayISO()): string {
  if (!date) return 'not contacted yet';
  const d = daysBetween(date, today);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

// ─── HTML helpers ──────────────────────────────────────────────────────────

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function categoryChip(category: Category): string {
  const labels: Record<Category, string> = { academia: 'Academia', industry: 'Industry', organizations: 'Organizations', government: 'Government' };
  return `<span class="chip chip-${category}">${labels[category]}</span>`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
