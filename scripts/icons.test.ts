// Dev helper: draws the app icons in public/icons from Ping's pixel art.
// Run: PING_SHEET=1 PING_SHEET_FILE=scripts/icons.test.ts npx vitest run
import { mkdirSync, writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { renderPing, type PingFrame } from '../src/ping/render';
import { png } from './png';

const ORANGE = [0xff, 0x5b, 0x23, 255];
const ICON_PING = renderPing({
  seed: 7, style: 1, lifeStage: 'kid', mood: 'happy',
  stats: { intellect: 40, craft: 40, heart: 40, authority: 40 },
}, { time: 0 });

/** Ping centred on an orange square, filling `fill` of the icon's width or height. */
export function icon(frame: PingFrame, size: number, fill: number): Buffer {
  let x0 = frame.width, y0 = frame.height, x1 = 0, y1 = 0;
  frame.pixels.forEach((c, i) => {
    if (!c) return;
    const x = i % frame.width, y = Math.floor(i / frame.width);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  });
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  // Whole-number scaling keeps every pixel square and crisp.
  const scale = Math.max(1, Math.floor((size * fill) / Math.max(w, h)));
  const ox = Math.floor((size - w * scale) / 2), oy = Math.floor((size - h * scale) / 2);
  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) rgba.set(ORANGE, i * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = frame.pixels[(y0 + y) * frame.width + x0 + x];
    if (!c) continue;
    const v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) rgba.set(v, ((oy + y * scale + sy) * size + ox + x * scale + sx) * 4);
  }
  return png(size, size, rgba);
}

test('app icons', () => {
  const dir = process.env.SHEET_OUT ?? 'public/icons';
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/icon-192.png`, icon(ICON_PING, 192, 0.72));
  writeFileSync(`${dir}/icon-512.png`, icon(ICON_PING, 512, 0.72));
  // Android crops "maskable" icons to a circle or squircle, so Ping sits well inside the safe zone.
  writeFileSync(`${dir}/icon-maskable-512.png`, icon(ICON_PING, 512, 0.5));
  writeFileSync(`${dir}/apple-touch-icon.png`, icon(ICON_PING, 180, 0.7));
});
