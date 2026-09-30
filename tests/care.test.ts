import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach } from '../src/game/actions';
import { addDays, isActiveDay, isWeekOff, moodFor, simulateCare, streakInfo, streakMultiplier, weekStartOf } from '../src/game/care';
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

  it('starts weeks on Monday', () => {
    expect(weekStartOf('2026-10-11')).toBe(MON); // Sunday
    expect(weekStartOf(MON)).toBe(MON);
  });
});

describe('weekly streaks', () => {
  it('counts consecutive weeks with any outreach', () => {
    let s = seasonOn(MON);
    for (const d of [MON, '2026-10-14', '2026-10-23']) s = sendOn(s, d); // Mon, Wed next week, Fri the week after
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-23').current).toBe(3);
  });

  it('is at risk until something is logged this week, and breaks after a missed week', () => {
    let s = seasonOn(MON);
    s = sendOn(s, MON);
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-13')).toMatchObject({ current: 1, atRisk: true });
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-20').current).toBe(0);
  });

  it('skips weeks fully marked as time off', () => {
    let s = seasonOn(MON);
    s = sendOn(s, MON);
    const offWeek = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
    s = { ...s, settings: { ...s.settings, holidays: offWeek } };
    expect(isWeekOff('2026-10-12', s.settings)).toBe(true);
    s = sendOn(s, '2026-10-19');
    expect(streakInfo(s, s.currentSeasonId!, '2026-10-19').current).toBe(2);
  });

  it('adds 5% XP per 4 weeks, up to 25%', () => {
    expect([0, 3, 4, 8, 20, 40].map(streakMultiplier)).toEqual([1, 1, 1.05, 1.1, 1.25, 1.25]);
    let s = seasonOn(MON);
    for (let w = 0; w < 4; w++) s = sendOn(s, addDays(MON, w * 7 + 2));
    const last = computeSeason(s, s.currentSeasonId!).entries.at(-1)!;
    expect(last.parts.map((p) => p.label)).toContain('Streak ×1.05');
  });
});

describe('care meters (weekly pace)', () => {
  it('drain gently on active days and refill from outreach and check-ins', () => {
    let s = seasonOn(MON);
    const id = s.currentSeasonId!;
    expect(simulateCare(s, id, MON).meters).toEqual({ fullness: 70, joy: 70, energy: 70 });
    expect(simulateCare(s, id, '2026-10-06').meters).toEqual({ fullness: 64, joy: 66, energy: 65 });
    // Weekends pause the drain.
    expect(simulateCare(s, id, '2026-10-11').meters).toEqual(simulateCare(s, id, '2026-10-09').meters);
    s = sendOn(s, '2026-10-06');
    s = { ...s, checkins: ['2026-10-06'] };
    expect(simulateCare(s, id, '2026-10-06').meters).toEqual({ fullness: 76, joy: 66, energy: 95 });
  });

  it('stays awake through two quiet weeks but hibernates after about a month', () => {
    const s = seasonOn(MON);
    const id = s.currentSeasonId!;
    expect(simulateCare(s, id, addDays(MON, 14)).hibernating).toBe(false);
    const late = addDays(MON, 42);
    expect(simulateCare(s, id, late).hibernating).toBe(true);
    // Checking in restores energy but doesn't wake Ping; only outreach does.
    expect(simulateCare({ ...s, checkins: [late] }, id, late).hibernating).toBe(true);
    const woken = sendOn(s, late);
    expect(computeSeason(woken, id).entries[0].parts.map((p) => p.label)).toContain('Welcome back');
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
