// Dev helper: renders a PNG contact sheet of generated Pips (run: npm run sheet).
import { writeFileSync } from 'node:fs';
import { renderPip } from '../src/pip/render';
import type { PipGenome, LifeStage, Mood } from '../src/pip/genome';
import { test } from 'vitest';
import { encodeSheet } from './png';

test('contact sheet', () => {
  const out = process.env.SHEET_OUT ?? 'pip-sheet.png';
  const scale = 2;
  const rows: { label: string; g: PipGenome }[][] = [];
  const base = { intellect: 0, craft: 0, heart: 0, authority: 0 };
  const stages: LifeStage[] = ['egg', 'baby', 'kid', 'teen', 'adult', 'legend'];
  rows.push(stages.map((st) => ({ label: st, g: { seed: 7, lifeStage: st, mood: 'neutral', stats: { intellect: 120, craft: 90, heart: 70, authority: 60 } } })));
  const heavy = (k: keyof typeof base, v: number) => ({ ...base, intellect: 40, craft: 40, heart: 40, authority: 40, [k]: v });
  rows.push((['intellect', 'craft', 'heart', 'authority'] as const).flatMap((k) => [
    { label: k + ' T3', g: { seed: 3, lifeStage: 'adult' as LifeStage, mood: 'neutral' as Mood, stats: heavy(k, 150) } },
  ]).concat([
    { label: 'max', g: { seed: 3, lifeStage: 'legend', mood: 'happy', stats: { intellect: 600, craft: 600, heart: 600, authority: 600 } } },
    { label: 'zero', g: { seed: 3, lifeStage: 'adult', mood: 'neutral', stats: base } },
  ]));
  rows.push((['intellect', 'craft', 'heart', 'authority'] as const).map((k) => (
    { label: k + ' T5', g: { seed: 11, lifeStage: 'adult' as LifeStage, mood: 'happy' as Mood, stats: heavy(k, 520) } }
  )).concat([
    { label: 'hybrid', g: { seed: 11, lifeStage: 'adult', mood: 'neutral', stats: { intellect: 300, craft: 0, heart: 0, authority: 280 } } },
    { label: 'sad', g: { seed: 11, lifeStage: 'kid', mood: 'sad', stats: heavy('heart', 80) } },
  ]));
  rows.push([1, 2, 4, 5, 6, 8].map((seed, i) => ({ label: 'seed', g: { seed, lifeStage: 'teen', mood: (['happy', 'neutral', 'sad', 'sleepy'] as Mood[])[i % 4], stats: { intellect: 90, craft: 70, heart: 50, authority: 90 } } })));

  const t = Number(process.env.SHEET_TIME ?? 0);
  writeFileSync(out, encodeSheet(rows.map((row) => row.map(({ g }) => renderPip(g, { time: t }))), scale));

});
