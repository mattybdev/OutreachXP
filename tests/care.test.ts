import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach } from '../src/game/actions';
import { addDays, isActiveDay, moodFor, simulateCare, streakInfo, streakMultiplier } from '../src/game/care';
import { computeSeason } from '../src/game/engine';
import { emptyState, type GameState } from '../src/game/types';

// 2026-10-05 is a Monday.
const MON = '2026-10-05';
const at = (date: string) => new Date(`${date}T12:00:00`);

function seasonOn(date: string): GameState {
  return createSeason(emptyState(), { name: 'S', pingName: 'P', keyDates: {} }, at(date), 1);
}

let n = 0;
function sendOn(state: GameState, date: string): GameState {
  return logNewOutreach(state, { name: `C${n++}`, org: '', category: 'industry', personalized: false, date }, at(date), date).state;
}

describe('calendar', () => {
  it('treats weekends and holidays as days off by default', () => {
    const s = emptyState();
    expect(isActiveDay(MON, s.settings)).toBe(true);
    expect(isActiveDay('2026-10-10', s.settings)).toBe(false); // Saturday
    expect(isActiveDay(MON, { ...s.settings, holidays: [MON] })).toBe(false);
  });
});

describe('streaks', () => {
  it('skips weekends without breaking the streak', () => {
    let s = seasonOn(MON);
    for (const d of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12']) s = sendOn(s, d);
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-12').current).toBe(6);
    // Saturday: nothing needed, streak still stands.
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-10')).toMatchObject({ current: 5, atRisk: false });
  });

  it('is at risk on an active day with no outreach yet, and broken after a missed active day', () => {
    let s = seasonOn(MON);
    s = sendOn(s, MON);
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-06')).toMatchObject({ current: 1, atRisk: true });
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-07').current).toBe(0);
  });

  it('adds 5% XP per 7-day block, up to 25%', () => {
    expect([0, 6, 7, 14, 35, 70].map(streakMultiplier)).toEqual([1, 1, 1.05, 1.1, 1.25, 1.25]);
    let s = seasonOn(MON);
    let d = MON;
    for (let i = 0; i < 7; i++) {
      s = sendOn(s, d);
      d = addDays(d, 1);
      while (!isActiveDay(d, s.settings)) d = addDays(d, 1);
    }
    const last = computeSeason(s, s.currentSeasonId!).entries.at(-1)!;
    expect(last.parts.map((p) => p.label)).toContain('Streak ×1.05');
  });
});

describe('care meters', () => {
  it('drain on active days and refill from outreach and check-ins', () => {
    let s = seasonOn(MON);
    const id = s.currentSeasonId!;
    expect(simulateCare(s, id, MON).meters).toEqual({ fullness: 70, joy: 70, energy: 70 });
    expect(simulateCare(s, id, '2026-10-06').meters).toEqual({ fullness: 40, joy: 55, energy: 50 });
    // Weekends pause the drain.
    expect(simulateCare(s, id, '2026-10-11').meters).toEqual(simulateCare(s, id, '2026-10-09').meters);
    s = sendOn(s, '2026-10-06');
    s = { ...s, checkins: ['2026-10-06'] };
    expect(simulateCare(s, id, '2026-10-06').meters).toEqual({ fullness: 52, joy: 55, energy: 80 });
  });

  it('hibernates after 7 active days at zero and pays a welcome-back bonus on the next send', () => {
    const s = seasonOn(MON);
    const id = s.currentSeasonId!;
    const late = '2026-11-02'; // four weeks of silence
    expect(simulateCare(s, id, late).hibernating).toBe(true);
    // Checking in restores energy but doesn't wake Ping; only outreach does.
    expect(simulateCare({ ...s, checkins: [late] }, id, late).hibernating).toBe(true);
    const woken = sendOn(s, late);
    const summary = computeSeason(woken, id);
    expect(summary.entries[0].parts.map((p) => p.label)).toContain('Welcome back');
    expect(simulateCare(woken, id, late).hibernating).toBe(false);
  });

  it('maps meters to a mood', () => {
    const care = (fullness: number, joy: number, energy: number, hibernating = false) => ({ meters: { fullness, joy, energy }, hibernating, wakeEventIds: new Set<string>() });
    expect(moodFor(care(0, 0, 0, true), false)).toBe('sleepy');
    expect(moodFor(care(10, 80, 80), false)).toBe('sad');
    expect(moodFor(care(80, 80, 10), false)).toBe('sleepy');
    expect(moodFor(care(40, 40, 40), true)).toBe('happy');
    expect(moodFor(care(40, 40, 40), false)).toBe('neutral');
  });
});
