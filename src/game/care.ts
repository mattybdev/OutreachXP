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
/** Drain at the start of each active day. */
export const DECAY: Meters = { fullness: 30, joy: 15, energy: 20 };
export const CHECKIN_ENERGY = 30;
/** Active days with every meter at zero before Ping hibernates. */
export const HIBERNATE_AFTER_DAYS = 7;

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

// ─── Streaks ───────────────────────────────────────────────────────────────

/**
 * Consecutive active days with outreach, ending at `date`. Days that aren't active
 * (weekends, holidays) are skipped: they never break a streak and don't add to it.
 */
export function streakOn(date: string, activity: Set<string>, settings: Settings, floor: string, memo?: Map<string, number>): number {
  const cached = memo?.get(date);
  if (cached !== undefined) return cached;
  let count = 0;
  for (let d = date, guard = 0; d >= floor && guard < 3660; d = addDays(d, -1), guard++) {
    if (!isActiveDay(d, settings)) continue;
    if (!activity.has(d)) break;
    count++;
  }
  memo?.set(date, count);
  return count;
}

export interface StreakInfo {
  current: number;
  /** Today is an active day with no outreach yet and there's a streak to keep. */
  atRisk: boolean;
  multiplier: number;
}

export function streakMultiplier(length: number): number {
  return 1 + Math.min(0.25, 0.05 * Math.floor(length / 7));
}

export function streakInfo(state: GameState, seasonId: string, today: string): StreakInfo {
  const activity = new Set(state.events.filter((e) => e.seasonId === seasonId).map((e) => e.date));
  const floor = seasonStart(state, seasonId);
  const current = activity.has(today)
    ? streakOn(today, activity, state.settings, floor)
    : streakOn(addDays(today, -1), activity, state.settings, floor);
  return {
    current,
    atRisk: current > 0 && !activity.has(today) && isActiveDay(today, state.settings),
    multiplier: streakMultiplier(current),
  };
}
