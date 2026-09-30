import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach, logUpdate } from '../src/game/actions';
import { computeAchievements } from '../src/game/achievements';
import { addDays } from '../src/game/care';
import { computeSeason } from '../src/game/engine';
import { PERFECT_WEEK_XP } from '../src/game/quests';
import { emptyState, type Category, type GameState } from '../src/game/types';

const MON = '2026-10-05';
const TUE = '2026-10-06';
const at = (date: string) => new Date(`${date}T12:00:00`);

function season(seed = 3): GameState {
  return createSeason(emptyState(), { name: 'S', pingName: 'P', keyDates: {} }, at(MON), seed);
}

let n = 0;
function send(state: GameState, date: string, category: Category = 'academia', personalized = true) {
  return logNewOutreach(state, { name: `C${n}`, org: `Org ${n++}`, category, personalized, date }, at(date), date);
}

/**
 * A week that satisfies every weekly quest that can be drawn when no follow-ups are due:
 * 5 personalized sends to new orgs across 3+ categories (incl. the lowest), on 2 days,
 * then 3 replies with a CC.
 */
function perfectWeek(state: GameState, monday: string) {
  let s = state;
  const threads: string[] = [];
  const cats: Category[] = ['academia', 'industry', 'organizations', 'government', 'academia'];
  cats.forEach((cat, i) => {
    const r = send(s, i < 3 ? monday : addDays(monday, 1), cat);
    s = r.state;
    threads.push(r.threadId);
  });
  // Category Focus may target any category, so send 3 to each.
  for (const cat of ['academia', 'industry', 'organizations', 'government'] as Category[]) {
    for (let i = 0; i < 3; i++) s = send(s, addDays(monday, 1), cat).state;
  }
  const day = addDays(monday, 1);
  for (const t of threads.slice(0, 3)) s = logUpdate(s, t, 'replied', { date: day }, at(day), day);
  s = logUpdate(s, threads[0], 'cc', { date: day, count: 2 }, at(day), day);
  return { state: s, threads };
}

describe('weekly and monthly quests', () => {
  it('offers 3 stable weekly quests and 2 monthly quests, varying by season seed', () => {
    const s1 = season(1);
    const weekly = (s: GameState) => computeSeason(s, s.currentSeasonId!, MON).quests.filter((q) => q.period === 'weekly').map((q) => q.templateId);
    expect(weekly(s1)).toHaveLength(3);
    expect(weekly(s1)).toEqual(weekly(s1));
    expect(computeSeason(s1, s1.currentSeasonId!, MON).quests.filter((q) => q.period === 'monthly')).toHaveLength(2);
    expect(new Set([1, 2, 3, 4, 5, 6].map((seed) => weekly(season(seed)).join())).size).toBeGreaterThan(1);
  });

  it('has no daily quests', () => {
    const s = season();
    expect(computeSeason(s, s.currentSeasonId!, MON).quests.every((q) => q.period !== ('daily' as string))).toBe(true);
  });

  it('never offers Follow-Through when nothing is due', () => {
    const s = season();
    expect(computeSeason(s, s.currentSeasonId!, MON).quests.map((q) => q.templateId)).not.toContain('follow-through');
  });

  it('awards a Perfect Week, then Momentum on the next week’s results', () => {
    const { state, threads } = perfectWeek(season(), MON);
    const id = state.currentSeasonId!;
    const week = computeSeason(state, id, TUE);
    expect(week.perfectWeeks.has(MON)).toBe(true);
    expect(week.totalXp).toBe(week.eventXp + week.questXp);
    const weeklyXp = week.quests.filter((q) => q.period === 'weekly' && q.completed).reduce((sum, q) => sum + q.reward, 0);
    expect(week.questXp).toBeGreaterThanOrEqual(weeklyXp + PERFECT_WEEK_XP);

    const nextWeek = addDays(MON, 8);
    const next = logUpdate(state, threads[3], 'replied', { date: nextWeek }, at(nextWeek), nextWeek);
    const reply = computeSeason(next, id, nextWeek).entries.at(-1)!;
    expect(reply.parts.map((p) => p.label)).toContain('Momentum +10%');
  });
});

describe('achievements', () => {
  it('unlocks milestones with dates and shows progress on locked ones', () => {
    let s = season();
    const r = send(s, MON);
    s = logUpdate(r.state, r.threadId, 'replied', { date: TUE }, at(TUE), TUE);
    const byId = new Map(computeAchievements(s).map((a) => [a.id, a]));
    expect(byId.get('hatchling')!.unlockedOn).toBe(MON);
    expect(byId.get('first-contact')!.unlockedOn).toBe(TUE);
    expect(byId.get('pen-pal')!.progress).toEqual({ value: 1, goal: 10 });
    expect(byId.get('streak-week')!.progress).toEqual({ value: 1, goal: 4 });
  });

  it('unlocks Four Corners when all categories are emailed in one day', () => {
    let s = season();
    for (const c of ['academia', 'industry', 'organizations', 'government'] as Category[]) s = send(s, MON, c).state;
    expect(computeAchievements(s).find((a) => a.id === 'four-corners')!.unlockedOn).toBe(MON);
  });

  it('unlocks Perfect Week', () => {
    const { state } = perfectWeek(season(), MON);
    expect(computeAchievements(state).find((a) => a.id === 'perfect-week')!.unlockedOn).toBe(TUE);
  });
});

describe('monthly quest eligibility', () => {
  it('skips Perfectionist when the season starts in the last days of a month', () => {
    const late = createSeason(emptyState(), { name: 'S', pingName: 'P', keyDates: {} }, at('2026-09-28'), 1);
    for (let seed = 1; seed <= 20; seed++) {
      const s = { ...late, seasons: late.seasons.map((x) => ({ ...x, pingSeed: seed })) };
      const ids = computeSeason(s, s.currentSeasonId!, '2026-09-30').quests.filter((q) => q.key === '2026-09-01').map((q) => q.templateId);
      expect(ids).not.toContain('perfectionist');
    }
  });
});
