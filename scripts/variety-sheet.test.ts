// Dev helper: renders many seeds to check look variety (run: PING_SHEET=1 PING_SHEET_FILE=scripts/variety-sheet.test.ts npx vitest run).
import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { renderBackground } from '../src/ping/backgrounds';
import { renderPing, type PingFrame } from '../src/ping/render';
import { deriveTraits } from '../src/ping/traits';
import { encodeSheet } from './png';

test('variety sheet', () => {
  const bg = renderBackground('room');
  const frames: PingFrame[] = [];
  const labels: string[] = [];
  for (let seed = 101; seed < 125; seed++) {
    const stage = seed % 3 === 0 ? 'baby' : seed % 3 === 1 ? 'kid' : 'adult';
    const ping = renderPing({ seed, lifeStage: stage, mood: 'happy', stats: { intellect: 70, craft: 40, heart: 70, authority: 30 } }, { time: 0.4 });
    frames.push({ ...bg, pixels: bg.pixels.map((p, i) => ping.pixels[i] ?? p) });
    const t = deriveTraits(seed);
    labels.push(`${seed}: ${t.coat.name} ${t.shape.name} ${t.marking}`);
  }
  const rows: PingFrame[][] = [];
  for (let i = 0; i < frames.length; i += 6) rows.push(frames.slice(i, i + 6));
  writeFileSync(process.env.SHEET_OUT ?? 'variety-sheet.png', encodeSheet(rows, 2));
  console.log(labels.join('\n'));
});
