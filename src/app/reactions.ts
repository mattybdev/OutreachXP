// Reaction animations on the Ping canvas (GDD §4.6): a paper airplane for sends, a falling
// envelope for replies, a happy dance for commitments, confetti for conversions, and a
// sparkle burst for hatching, level-ups and waking from hibernation.

import type { EventType } from '../game/types';
import { mulberry32 } from '../ping/traits';
import { GROUND, PING_CANVAS, PIXEL_DENSITY } from '../ping/render';
import { ramps, statAccent } from '../theme';

export type ReactionKind = 'plane' | 'envelope' | 'dance' | 'confetti' | 'burst';

export interface Reaction {
  kind: ReactionKind;
  start: number; // performance.now() ms
}

const DURATION: Record<ReactionKind, number> = { plane: 1.6, envelope: 2.2, dance: 2.4, confetti: 3.2, burst: 1.6 };

/** The biggest reaction a batch of logged events deserves. */
export function reactionFor(types: EventType[]): ReactionKind | null {
  if (types.includes('converted')) return 'confetti';
  if (types.includes('committed')) return 'dance';
  if (types.some((t) => ['replied', 'engaged', 'cc', 'referred', 'closed'].includes(t))) return 'envelope';
  if (types.includes('sent') || types.includes('followup')) return 'plane';
  return null;
}

export function isActive(r: Reaction, now: number): boolean {
  return (now - r.start) / 1000 < DURATION[r.kind];
}

const D = PIXEL_DENSITY;
const CX = PING_CANVAS / 2;
const PING_Y = GROUND - 26 * D;

/** How far to move Ping this frame (logical pixels). */
export function pingOffset(reactions: Reaction[], now: number): { dx: number; dy: number } {
  let dx = 0, dy = 0;
  for (const r of reactions) {
    const t = (now - r.start) / 1000;
    if (!isActive(r, now)) continue;
    if (r.kind === 'dance' || r.kind === 'confetti') {
      dx += Math.round(Math.sin(t * 10) * 3 * D);
      dy -= Math.round(Math.abs(Math.sin(t * 10)) * 4 * D);
    } else if (r.kind === 'burst' || (r.kind === 'plane' && t < 0.4) || (r.kind === 'envelope' && t > 0.7 && t < 1.2)) {
      dy -= Math.round(Math.abs(Math.sin(t * 8)) * 3 * D);
    }
  }
  return { dx, dy };
}

// ─── Sprites ───────────────────────────────────────────────────────────────

const PALETTE: Record<string, string> = {
  '0': '#000000',
  '1': '#FFFFFF',
  '2': ramps.neutral[5],
  '3': ramps.orange[2],
  '4': ramps.orange[3],
  '5': ramps.neutral[2],
};

const PLANE = [
  '000.......',
  '01100.....',
  '0111100...',
  '011111100.',
  '0111111110',
  '022222200.',
  '0222200...',
  '02200.....',
  '000.......',
];

const ENVELOPE = [
  '0000000000000',
  '0211111111120',
  '0121111111210',
  '0112111112110',
  '0111211121110',
  '0111123211110',
  '0111113111110',
  '0111111111110',
  '0000000000000',
];

const HEART = ['.33.33.', '3444333', '3433333', '.33333.', '..333..', '...3...'];
const NOTE = ['..555', '..5.5', '..5..', '..5..', '555..', '555..'];

function sprite(c: CanvasRenderingContext2D, rows: string[], x: number, y: number, scale: number, alpha = 1): void {
  c.globalAlpha = alpha;
  const x0 = Math.round(x), y0 = Math.round(y);
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const color = PALETTE[ch];
    if (!color) return;
    c.fillStyle = color;
    c.fillRect((x0 + dx) * scale, (y0 + dy) * scale, scale, scale);
  }));
  c.globalAlpha = 1;
}

function px(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, scale: number): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x) * scale, Math.round(y) * scale, size * scale, size * scale);
}

/** Draw every active reaction over the Ping frame. */
export function drawReactions(c: CanvasRenderingContext2D, reactions: Reaction[], now: number, scale: number): void {
  for (const r of reactions) {
    if (!isActive(r, now)) continue;
    const t = (now - r.start) / 1000;
    switch (r.kind) {
      case 'plane': {
        // Thrown from Ping's hand, arcing up and away to the right.
        const p = Math.min(1, t / 1.4);
        const path = (q: number) => ({ x: CX + 10 * D + q * 48, y: PING_Y - 4 * D - q * 64 - Math.sin(q * Math.PI) * 10 });
        for (let k = 2; k <= 12; k += 2) {
          const q = Math.max(0, p - k * 0.02);
          const dot = path(q);
          px(c, dot.x, dot.y + 4, 1, ramps.neutral[5], scale);
        }
        const { x, y } = path(p);
        sprite(c, PLANE, x, y, scale, p > 0.85 ? (1 - p) / 0.15 : 1);
        break;
      }
      case 'envelope': {
        // Falls into Ping's arms, then little hearts float up.
        const fall = Math.min(1, t / 0.8);
        if (t < 1.1) sprite(c, ENVELOPE, CX - 6, -12 + fall * (PING_Y - 30 * D + 12), scale, t > 0.9 ? (1.1 - t) / 0.2 : 1);
        if (t > 0.8) {
          for (let k = 0; k < 3; k++) {
            const h = Math.max(0, t - 0.8 - k * 0.2);
            if (h <= 0) continue;
            sprite(c, HEART, CX - 20 * D + k * 17 * D + Math.sin(h * 6 + k) * 2 * D, PING_Y - 20 * D - h * 30 * D, scale, Math.max(0, 1 - h / 1.2));
          }
        }
        break;
      }
      case 'dance': {
        for (let k = 0; k < 3; k++) {
          const h = (t * 0.8 + k * 0.33) % 1;
          const side = k % 2 ? 1 : -1;
          sprite(c, NOTE, CX + side * (26 + k * 4) * D + Math.sin(h * 8) * 2 * D, PING_Y - 10 * D - h * 30 * D, scale, 1 - h);
        }
        break;
      }
      case 'confetti': {
        const rand = mulberry32(Math.floor(r.start));
        const colors = [ramps.orange[2], ramps.orange[3], ramps.orange[4], statAccent.intellect, statAccent.craft, statAccent.heart, statAccent.authority, '#FFFFFF'];
        for (let k = 0; k < 70; k++) {
          const x0 = rand() * PING_CANVAS, delay = rand() * 0.8, speed = 25 + rand() * 30, sway = rand() * 6;
          const color = colors[Math.floor(rand() * colors.length)];
          const h = t - delay;
          if (h < 0) continue;
          const y = -4 + h * speed * D * 0.7;
          if (y > GROUND) continue;
          px(c, x0 + Math.sin(h * 5 + k) * sway, y, D, color, scale);
        }
        break;
      }
      case 'burst': {
        if (t < 0.25) {
          c.fillStyle = `rgba(255, 91, 35, ${0.35 * (1 - t / 0.25)})`;
          c.fillRect(0, 0, PING_CANVAS * scale, PING_CANVAS * scale);
        }
        const radius = 18 * D + t * 40 * D;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2 + t;
          const x = CX + Math.cos(a) * radius, y = PING_Y + Math.sin(a) * radius * 0.8;
          const color = k % 2 ? ramps.orange[3] : '#FFFFFF';
          px(c, x, y, D, color, scale);
          px(c, x - D, y, 1, ramps.orange[2], scale);
          px(c, x + D, y, 1, ramps.orange[2], scale);
        }
        break;
      }
    }
  }
}
