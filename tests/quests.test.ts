import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach, logUpdate } from '../src/game/actions';
import { computeAchievements } from '../src/game/achievements';
import { computeSeason } from '../src/game/engine';
import { PERFECT_DAY_XP, weekStartOf } from '../src/game/quests';
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

/** A day that satisfies every daily quest that can be drawn when no follow-ups are due. */
function perfectDay(state: GameState, date: string) {
  let s = state;
  const threads: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = send(s, date);
    s = r.state;
    threads.push(r.threadId);
  }
  s = logUpdate(s, threads[0], 'replied', { date }, at(date), date);
  return { state: s, threads };
}

describe('daily quests', () => {
  it('picks 3 stable quests per day, varying by season seed', () => {
    const s1 = season(1);
    const a = computeSeason(s1, s1.currentSeasonId!, MON).quests.filter((q) => q.period === 'daily');
    const b = computeSeason(s1, s1.currentSeasonId!, MON).quests.filter((q) => q.period === 'daily');
    expect(a).toHaveLength(3);
    expect(a.map((q) => q.templateId)).toEqual(b.map((q) => q.templateId));
    const seeds = new Set([1, 2, 3, 4, 5, 6].map((seed) => {
      const s = season(seed);
      return computeSeason(s, s.currentSeasonId!, MON).quests.filter((q) => q.period === 'daily').map((q) => q.templateId).join();
    }));
    expect(seeds.size).toBeGreaterThan(1);
  });

  it('never offers follow-up quests when nothing is due', () => {
    const s = season();
    const ids = computeSeason(s, s.currentSeasonId!, MON).quests.map((q) => q.templateId);
    expect(ids).not.toContain('tend-the-garden');
    expect(ids).not.toContain('dont-leave-hanging');
  });

  it('awards quest XP and a Perfect Day, then Momentum on the next day’s results', () => {
    const { state, threads } = perfectDay(season(), MON);
    const id = state.currentSeasonId!;
    const monday = computeSeason(state, id, MON);
    expect(monday.perfectDays.has(MON)).toBe(true);
    const dailyXp = monday.quests.filter((q) => q.period === 'daily' && q.completed).reduce((sum, q) => sum + q.reward, 0);
    expect(monday.questXp).toBeGreaterThanOrEqual(dailyXp + PERFECT_DAY_XP);
    expect(monday.totalXp).toBe(monday.eventXp + monday.questXp);

    const next = logUpdate(state, threads[1], 'replied', { date: TUE }, at(TUE), TUE);
    const reply = computeSeason(next, id, TUE).entries.at(-1)!;
    expect(reply.parts.map((p) => p.label)).toContain('Momentum +10%');
    expect(reply.xp).toBe(40 + 4);
  });
});

describe('weekly quests', () => {
  it('starts weeks on Monday and offers 3 quests', () => {
    expect(weekStartOf('2026-10-11')).toBe(MON); // Sunday
    expect(weekStartOf(MON)).toBe(MON);
    const s = season();
    expect(computeSeason(s, s.currentSeasonId!, MON).quests.filter((q) => q.period === 'weekly')).toHaveLength(3);
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
    expect(byId.get('pen-pal')!.unlockedOn).toBeNull();
    expect(byId.get('pen-pal')!.progress).toEqual({ value: 1, goal: 10 });
  });

  it('unlocks Four Corners when all categories are emailed in one day', () => {
    let s = season();
    for (const c of ['academia', 'industry', 'organizations', 'government'] as Category[]) s = send(s, MON, c).state;
    expect(computeAchievements(s).find((a) => a.id === 'four-corners')!.unlockedOn).toBe(MON);
  });
});
