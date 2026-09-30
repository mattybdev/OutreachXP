// Dev helper: writes a demo backup for trying the Stats screen and season comparison.
// Run: PING_SHEET=1 PING_SHEET_FILE=scripts/demo-backup.test.ts SHEET_OUT=demo.json npx vitest run
// Set DEMO_SEASONS=2 for last year's season (archived) plus this year's.
import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { createSeason, logNewOutreach, logUpdate, startNewSeason } from '../src/game/actions';
import { addDays } from '../src/game/care';
import { CATEGORIES, emptyState, type GameState } from '../src/game/types';
import { mulberry32 } from '../src/ping/traits';

let n = 0;

/** About `weeks` weeks of outreach, twice a week, with a quiet week in the middle. */
function outreach(state: GameState, start: string, weeks: number, seed: number, intensity: number): GameState {
  const rand = mulberry32(seed);
  let s = state;
  const open: string[] = [];
  for (let week = 0; week < weeks; week++) {
    if (week === 5) continue;
    for (const dayOffset of [1, 3]) {
      const date = addDays(start, week * 7 + dayOffset);
      const at = new Date(`${date}T12:00:00`);
      for (let i = 0; i < intensity + Math.floor(rand() * 4); i++) {
        const category = CATEGORIES[Math.floor(rand() * (rand() < 0.5 ? 2 : 4))];
        const r = logNewOutreach(s, { name: `Contact ${n}`, org: `Org ${Math.floor(n / 2)}`, category, personalized: rand() < 0.6, date }, at, date);
        n++;
        s = r.state;
        open.push(r.threadId);
      }
      for (const t of [...open]) {
        const roll = rand();
        try {
          if (roll < 0.18) s = logUpdate(s, t, 'replied', { date }, at, date);
          else if (roll < 0.26) s = logUpdate(s, t, 'committed', { date }, at, date);
          else if (roll < 0.29) s = logUpdate(s, t, 'converted', { date }, at, date);
          else if (roll < 0.36) s = logUpdate(s, t, 'followup', { date }, at, date);
          else continue;
          if (roll < 0.29) open.splice(open.indexOf(t), 1);
        } catch {
          // Not allowed for this contact right now; skip.
        }
      }
    }
  }
  return s;
}

test('demo backup', () => {
  const two = process.env.DEMO_SEASONS === '2';
  let s: GameState;
  if (two) {
    s = createSeason(emptyState(), { name: 'SGS&C 2026', pingName: 'Pipsqueak', keyDates: { submissionDeadline: '2025-12-15' } }, new Date('2025-08-04T12:00:00'), 1717);
    s = outreach(s, '2025-08-04', 16, 2026, 1);
    s = startNewSeason(s, { name: 'SGS&C 2027', pingName: 'Pingo', keyDates: { submissionDeadline: '2026-12-15', eventStart: '2027-02-10' } }, new Date('2026-08-03T12:00:00'), 4242);
    s = outreach(s, '2026-08-03', 9, 2027, 2);
  } else {
    s = createSeason(emptyState(), { name: 'SGS&C 2027', pingName: 'Pingo', keyDates: { submissionDeadline: '2026-12-15', eventStart: '2027-02-10' } }, new Date('2026-08-03T12:00:00'), 4242);
    s = outreach(s, '2026-08-03', 9, 2027, 2);
  }
  writeFileSync(process.env.SHEET_OUT ?? 'demo-backup.json', JSON.stringify(s));
});
