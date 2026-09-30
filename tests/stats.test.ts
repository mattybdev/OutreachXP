import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach, logUpdate } from '../src/game/actions';
import { categoryBreakdown, funnel, journal, personalBests, weeklyActivity } from '../src/game/stats';
import { emptyState, type Category, type GameState } from '../src/game/types';

const MON = '2026-10-05';
const at = (date: string) => new Date(`${date}T12:00:00`);

let n = 0;
function send(state: GameState, date: string, category: Category) {
  return logNewOutreach(state, { name: `C${n}`, org: `Org ${n++}`, category, personalized: false, date }, at(date), date);
}

function sample() {
  let s = createSeason(emptyState(), { name: 'S27', pingName: 'Pingo', keyDates: {} }, at(MON), 1);
  const a = send(s, MON, 'academia'); s = a.state;
  const b = send(s, MON, 'academia'); s = b.state;
  const c = send(s, '2026-10-13', 'industry'); s = c.state;
  s = logUpdate(s, a.threadId, 'committed', { date: '2026-10-14' }, at('2026-10-14'), '2026-10-14');
  s = logUpdate(s, c.threadId, 'replied', { date: '2026-10-14' }, at('2026-10-14'), '2026-10-14');
  return s;
}

describe('stats', () => {
  it('counts contacts at each funnel stage, overall and per category', () => {
    const s = sample();
    const id = s.currentSeasonId!;
    expect(funnel(s, id)).toEqual({ sent: 3, replied: 2, committed: 1, converted: 0 });
    expect(funnel(s, id, 'academia')).toEqual({ sent: 2, replied: 1, committed: 1, converted: 0 });
    const rows = categoryBreakdown(s, id);
    expect(rows.find((r) => r.category === 'academia')!.replyRate).toBe(0.5);
    expect(rows.find((r) => r.category === 'government')!.replyRate).toBeNull();
  });

  it('builds one activity row per week, including empty weeks', () => {
    const s = sample();
    const weeks = weeklyActivity(s, s.currentSeasonId!, '2026-10-28');
    expect(weeks.map((w) => w.week)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    expect(weeks[0]).toMatchObject({ sent: 2, total: 2 });
    // committed implies replied + engaged, so 3 result events plus 1 reply
    expect(weeks[1]).toMatchObject({ sent: 1, results: 4, total: 5 });
    expect(weeks[2].total).toBe(0);
  });

  it('finds personal bests', () => {
    const s = sample();
    const bests = personalBests(s, s.currentSeasonId!, '2026-10-28');
    expect(bests.bestWeek?.week).toBe('2026-10-12');
    expect(bests.longestStreak).toBe(2);
    expect(bests.activeWeeks).toBe(2);
  });

  it('keeps a newest-first journal of milestones', () => {
    const s = sample();
    const items = journal(s, s.currentSeasonId!, '2026-10-28');
    expect(items.at(-1)!.title).toBe('S27 began');
    expect(items.some((i) => i.title === 'Pingo hatched' && i.date === MON)).toBe(true);
    expect(items.some((i) => i.kind === 'level')).toBe(true);
    expect(items.some((i) => i.title === 'Achievement: Believer')).toBe(true);
    const dates = items.map((i) => i.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
