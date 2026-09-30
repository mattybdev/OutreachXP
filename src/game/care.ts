// Ping's care meters, hibernation and outreach streaks (GDD §4.5, §6.4).
// Like XP, everything is replayed from the event log, so undo and settings changes stay consistent.

import { toISODate } from './dates';
import type { EventType, GameState, OutreachEvent, Settings } from './types';

export interface Meters {
  fullness: number;
  joy: number;
  energy: number;
}

export const METER_MAX = 100;
export const START_METERS: Meters = { fullness: 70, joy: 70, energy: 70 };
/**
 * Drain at the start of each active day, paced for weekly outreach: one session a week keeps
 * Ping content, about two weeks of silence makes it sad, and roughly four weeks puts it to sleep.
 */
export const DECAY: Meters = { fullness: 6, joy: 4, energy: 5 };
export const CHECKIN_ENERGY = 30;
/** Active days with every meter at zero before Ping hibernates. */
export const HIBERNATE_AFTER_DAYS = 3;

const GAINS: Record<EventType, Partial<Meters>> = {
  sent: { fullness: 12 },
  followup: { fullness: 10, energy: 8 },
  replied: { joy: 15 },
  engaged: { joy: 15 },
  cc: { joy: 5 }, // per person, capped below
  referred: { joy: 15 },
  committed: { joy: 25 },
  converted: { joy: 35 },
  closed: { joy: 3 },
};

// ─── Calendar ──────────────────────────────────────────────────────────────

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + n));
}

export function isActiveDay(date: string, settings: Settings): boolean {
  const [y, m, d] = date.split('-').map(Number);
  return settings.activeDays.includes(new Date(y, m - 1, d).getDay()) && !settings.holidays.includes(date);
}

/** First day of a season: when it was created, or its earliest (back-dated) event. */
export function seasonStart(state: GameState, seasonId: string): string {
  const season = state.seasons.find((s) => s.id === seasonId);
  let start = season ? toISODate(new Date(season.createdAt)) : '9999-12-31';
  for (const e of state.events) if (e.seasonId === seasonId && e.date < start) start = e.date;
  return start;
}

// ─── Meters ────────────────────────────────────────────────────────────────

export interface CareResult {
  meters: Meters;
  hibernating: boolean;
  /** Sends that woke Ping from hibernation (they earn a welcome-back bonus). */
  wakeEventIds: Set<string>;
}

const clamp = (v: number) => Math.max(0, Math.min(METER_MAX, v));

export function simulateCare(state: GameState, seasonId: string, until: string): CareResult {
  const start = seasonStart(state, seasonId);
  const byDate = new Map<string, OutreachEvent[]>();
  for (const e of state.events) {
    if (e.seasonId !== seasonId) continue;
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const checkins = new Set(state.checkins);
  const meters: Meters = { ...START_METERS };
  const wakeEventIds = new Set<string>();
  let zeroDays = 0;

  for (let d = start, guard = 0; d <= until && guard < 3660; d = addDays(d, 1), guard++) {
    const active = isActiveDay(d, state.settings);
    if (d !== start && active) {
      meters.fullness = clamp(meters.fullness - DECAY.fullness);
      meters.joy = clamp(meters.joy - DECAY.joy);
      meters.energy = clamp(meters.energy - DECAY.energy);
    }
    for (const e of byDate.get(d) ?? []) {
      if ((e.type === 'sent' || e.type === 'followup') && zeroDays >= HIBERNATE_AFTER_DAYS) {
        wakeEventIds.add(e.id);
        zeroDays = 0;
      }
      const gain = GAINS[e.type];
      const times = e.type === 'cc' ? Math.min(4, e.count ?? 1) : 1;
      meters.fullness = clamp(meters.fullness + (gain.fullness ?? 0) * times);
      meters.joy = clamp(meters.joy + (gain.joy ?? 0) * times);
      meters.energy = clamp(meters.energy + (gain.energy ?? 0) * times);
    }
    if (checkins.has(d)) meters.energy = clamp(meters.energy + CHECKIN_ENERGY);
    // Once hibernating, only sending an email wakes Ping (checking in alone doesn't).
    if (active && zeroDays < HIBERNATE_AFTER_DAYS) zeroDays = meters.fullness + meters.joy + meters.energy === 0 ? zeroDays + 1 : 0;
  }
  return { meters, hibernating: zeroDays >= HIBERNATE_AFTER_DAYS, wakeEventIds };
}

export type Mood = 'happy' | 'neutral' | 'sad' | 'sleepy';

export function moodFor(care: CareResult, activeToday: boolean): Mood {
  const { fullness, joy, energy } = care.meters;
  if (care.hibernating) return 'sleepy';
  if (fullness < 20 || joy < 20) return 'sad';
  if (energy < 25) return 'sleepy';
  if (activeToday || (fullness >= 60 && joy >= 60)) return 'happy';
  return 'neutral';
}

// ─── Streaks (weekly) ──────────────────────────────────────────────────────

/** The Monday that starts the week containing `date`. */
export function weekStartOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return addDays(date, -((dow + 6) % 7));
}

/** A week with no active days (e.g. every workday marked as a holiday) never breaks a streak. */
export function isWeekOff(weekStart: string, settings: Settings): boolean {
  for (let i = 0; i < 7; i++) if (isActiveDay(addDays(weekStart, i), settings)) return false;
  return true;
}

/** Weeks (by their Monday) that have any outreach logged. */
export function activityWeeks(events: OutreachEvent[]): Set<string> {
  return new Set(events.map((e) => weekStartOf(e.date)));
}

/**
 * Consecutive weeks with outreach, ending with the week that contains `date`.
 * Weeks off are skipped: they never break a streak and don't add to it.
 */
export function streakOn(date: string, weeks: Set<string>, settings: Settings, floor: string, memo?: Map<string, number>): number {
  const week = weekStartOf(date);
  const cached = memo?.get(week);
  if (cached !== undefined) return cached;
  const floorWeek = weekStartOf(floor);
  let count = 0;
  for (let w = week, guard = 0; w >= floorWeek && guard < 530; w = addDays(w, -7), guard++) {
    if (!weeks.has(w)) {
      if (isWeekOff(w, settings)) continue;
      break;
    }
    count++;
  }
  memo?.set(week, count);
  return count;
}

export interface StreakInfo {
  /** Weeks in a row with outreach. */
  current: number;
  /** Nothing logged yet this week, and there's a streak to keep. */
  atRisk: boolean;
  multiplier: number;
}

/** +5% XP for every 4 weeks of streak, up to +25%. */
export function streakMultiplier(weeks: number): number {
  return 1 + Math.min(0.25, 0.05 * Math.floor(weeks / 4));
}

export function streakInfo(state: GameState, seasonId: string, today: string): StreakInfo {
  const weeks = activityWeeks(state.events.filter((e) => e.seasonId === seasonId));
  const floor = seasonStart(state, seasonId);
  const thisWeek = weekStartOf(today);
  const current = weeks.has(thisWeek)
    ? streakOn(thisWeek, weeks, state.settings, floor)
    : streakOn(addDays(thisWeek, -7), weeks, state.settings, floor);
  return {
    current,
    atRisk: current > 0 && !weeks.has(thisWeek) && !isWeekOff(thisWeek, state.settings),
    multiplier: streakMultiplier(current),
  };
}
