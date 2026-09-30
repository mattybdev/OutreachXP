// Dev helper: writes a demo backup with ~8 weeks of outreach for trying the Stats screen.
// Run: PING_SHEET=1 PING_SHEET_FILE=scripts/demo-backup.test.ts SHEET_OUT=demo.json npx vitest run
import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { createSeason, logNewOutreach, logUpdate } from '../src/game/actions';
import { addDays } from '../src/game/care';
import { CATEGORIES, emptyState } from '../src/game/types';
import { mulberry32 } from '../src/ping/traits';

test('demo backup', () => {
  const rand = mulberry32(2027);
  const start = '2026-08-03';
  let s = createSeason(emptyState(), { name: 'SGS&C 2027', pingName: 'Pingo', keyDates: { submissionDeadline: '2026-12-15', eventStart: '2027-02-10' } }, new Date(`${start}T12:00:00`), 4242);
  const open: string[] = [];
  let n = 0;
  for (let week = 0; week < 9; week++) {
    if (week === 5) continue; // a quiet week
    for (const dayOffset of [1, 3]) {
      const date = addDays(start, week * 7 + dayOffset);
      const at = new Date(`${date}T12:00:00`);
      for (let i = 0; i < 2 + Math.floor(rand() * 4); i++) {
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
  writeFileSync(process.env.SHEET_OUT ?? 'demo-backup.json', JSON.stringify(s));
});
