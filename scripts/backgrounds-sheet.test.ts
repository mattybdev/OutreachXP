// Dev helper: renders every background with a Ping on top (run: PING_SHEET=1 PING_SHEET_FILE=scripts/backgrounds-sheet.test.ts npx vitest run).
import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { BACKGROUNDS, renderBackground } from '../src/ping/backgrounds';
import { renderPing, type PingFrame } from '../src/ping/render';
import { encodeSheet } from './png';

test('backgrounds sheet', () => {
  const ping = renderPing({ seed: 7, lifeStage: 'adult', mood: 'happy', stats: { intellect: 150, craft: 90, heart: 90, authority: 60 } }, { time: 0.4 });
  const frames: PingFrame[] = BACKGROUNDS.map((b) => {
    const bg = renderBackground(b.id, 1.3);
    return { ...bg, pixels: bg.pixels.map((p, i) => ping.pixels[i] ?? p) };
  });
  const rows: PingFrame[][] = [];
  for (let i = 0; i < frames.length; i += 6) rows.push(frames.slice(i, i + 6));
  writeFileSync(process.env.SHEET_OUT ?? 'backgrounds-sheet.png', encodeSheet(rows, 2));
});
