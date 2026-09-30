import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach, logUpdate, startNewSeason } from '../src/game/actions';
import { addDays } from '../src/game/care';
import { computeSeason } from '../src/game/engine';
import { compareSeasons, paceCheck } from '../src/game/stats';
import { emptyState, type GameState } from '../src/game/types';

const at = (date: string) => new Date(`${date}T12:00:00`);

function send(state: GameState, date: string, name: string, org = 'State U') {
  return logNewOutreach(state, { name, org, category: 'academia', personalized: false, date }, at(date), date);
}

/** Season 1 (deadline Dec 15, 2025) with one commitment, then season 2 (deadline Dec 15, 2026). */
function twoSeasons() {
  let s = createSeason(emptyState(), { name: '2026', pingName: 'Pip', keyDates: { submissionDeadline: '2025-12-15' } }, at('2025-09-01'), 1);
  const ada = send(s, '2025-09-01', 'Ada');
  s = logUpdate(ada.state, ada.threadId, 'committed', { date: '2025-09-10' }, at('2025-09-10'), '2025-09-10');
  s = send(s, '2025-09-15', 'Bo').state;
  s = send(s, '2025-10-06', 'Cy').state;
  const first = s.currentSeasonId!;
  s = startNewSeason(s, { name: '2027', pingName: 'Pong', keyDates: { submissionDeadline: '2026-12-15' } }, at('2026-09-01'), 2);
  return { s, first, second: s.currentSeasonId! };
}

describe('starting a new season', () => {
  it('archives the old season, starts a fresh one and keeps contacts', () => {
    const { s, first, second } = twoSeasons();
    expect(second).not.toBe(first);
    expect(s.seasons.find((x) => x.id === first)!.archivedAt).toBeDefined();
    expect(s.seasons.find((x) => x.id === second)!.archivedAt).toBeUndefined();
    expect(s.contacts).toHaveLength(3);
    expect(computeSeason(s, second).hasOutreach).toBe(false);
    expect(computeSeason(s, first).hasOutreach).toBe(true);
  });

  it('gives a Returning Friend bonus for re-emailing someone who committed last season', () => {
    const { s, second } = twoSeasons();
    const again = send(s, '2026-09-02', 'Ada').state;
    const entry = computeSeason(again, second).entries[0];
    expect(entry.parts.map((p) => p.label)).toContain('Returning friend');
    // Bo never committed: no bonus.
    const bo = send(s, '2026-09-02', 'Bo').state;
    expect(computeSeason(bo, second).entries[0].parts.map((p) => p.label)).not.toContain('Returning friend');
  });

  it('stops an archived season’s quests at the archive date', () => {
    const { s, first } = twoSeasons();
    const weeks = computeSeason(s, first, '2026-09-30').quests.filter((q) => q.period === 'weekly').map((q) => q.key);
    expect(weeks.every((w) => w <= '2026-09-01')).toBe(true);
  });
});

describe('season comparison', () => {
  it('lines seasons up by weeks before the deadline and compares totals', () => {
    let { s } = twoSeasons();
    s = send(s, '2026-09-02', 'Dee').state;
    const c = compareSeasons(s, '2026-09-08');
    expect(c.alignment).toBe('deadline');
    expect(c.seasons.map((x) => [x.name, x.emails, x.commitments, x.current])).toEqual([['2026', 3, 1, false], ['2027', 1, 0, true]]);
    // Both seasons start ~15 weeks before their deadline.
    expect(c.series[0].points[0].offset).toBe(c.series[1].points[0].offset);
  });

  it('checks pace against last season at the same point', () => {
    let { s } = twoSeasons();
    for (const [i, name] of ['Dee', 'Eve', 'Fay'].entries()) s = send(s, addDays('2026-09-01', i), name).state;
    // Last season had 2 emails by its second week (Sept 1 and Sept 15 are in weeks 0 and 2).
    const pace = paceCheck(compareSeasons(s, '2026-09-08'));
    expect(pace).toEqual({ diff: 3 - 1, previousName: '2026' });
  });
});
