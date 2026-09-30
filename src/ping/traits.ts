// Small per-Ping differences derived only from the hatch seed (GDD §4.1 "Uniqueness").
// Traits never depend on stats, so a Ping keeps its personality as it grows.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type EarStyle = 'round' | 'pointy' | 'floppy' | 'tuft';
export type EyeStyle = 'round' | 'tall' | 'wide';
export type Quirk = 'sway' | 'earTwitch' | 'hop' | 'calm';

export interface Traits {
  earStyle: EarStyle;
  earSize: number;
  eyeStyle: EyeStyle;
  eyeSpacing: number;
  squish: number;
  freckles: { side: -1 | 1; dx: number; dy: number }[];
  bobSpeed: number;
  bobPhase: number;
  blinkEvery: number;
  quirk: Quirk;
  foldSeed: number;
  // Style 2+ variety (style 1 Pings keep the classic look).
  coat: Coat;
  shape: BodyShape;
  marking: Marking;
  cheek: string;
  /** Pupil colors: [upper, lower]. */
  eyes: [string, string];
}

/** A body color: a 5-step ramp, dark → light, like the classic charcoal body. */
export interface Coat {
  id: string;
  name: string;
  ramp: [string, string, string, string, string];
}

export interface BodyShape {
  id: string;
  name: string;
  power: number;
  width: number;
  top: number;
  bottom: number;
  /** Width of the top half relative to the bottom (pear and egg shapes). */
  topWidth: number;
}

export type Marking = 'none' | 'belly' | 'spots' | 'mask' | 'crown';

/** The latest look style; new seasons hatch with it. */
export const LATEST_STYLE = 2;

/**
 * Brand-friendly coats: all dark enough that white eyes, the orange heart and cheeks, and
 * colored clothing stay readable. Weights make charcoal the most common and ember rare.
 */
export const COATS: (Coat & { weight: number })[] = [
  { id: 'charcoal', name: 'Charcoal', weight: 34, ramp: ['#141414', '#232323', '#2D2C31', '#3A393E', '#6E6C73'] },
  { id: 'midnight', name: 'Midnight', weight: 14, ramp: ['#0E1424', '#1C2740', '#26324F', '#34426A', '#5E6E96'] },
  { id: 'cocoa', name: 'Cocoa', weight: 14, ramp: ['#1E140F', '#35251C', '#433024', '#553E2F', '#86664F'] },
  { id: 'plum', name: 'Plum', weight: 12, ramp: ['#1A1020', '#2E1C38', '#3A2546', '#4A3159', '#7A5C8C'] },
  { id: 'forest', name: 'Forest', weight: 12, ramp: ['#0F1A15', '#1D3028', '#253C32', '#31503F', '#5C8069'] },
  { id: 'slate', name: 'Slate', weight: 10, ramp: ['#1B1F26', '#303743', '#3A4250', '#4A5463', '#7A8596'] },
  { id: 'ember', name: 'Ember', weight: 4, ramp: ['#1F0B08', '#3A1812', '#4A2018', '#5E2B20', '#95503A'] },
];

export const SHAPES: BodyShape[] = [
  { id: 'round', name: 'Round', power: 2.3, width: 1, top: 1, bottom: 1, topWidth: 1 },
  { id: 'pear', name: 'Pear', power: 2.2, width: 1.02, top: 0.94, bottom: 1.1, topWidth: 0.86 },
  { id: 'bean', name: 'Bean', power: 2.1, width: 0.9, top: 1.1, bottom: 1.04, topWidth: 1 },
  { id: 'squat', name: 'Squat', power: 2.6, width: 1.1, top: 0.92, bottom: 0.92, topWidth: 1 },
  { id: 'egg', name: 'Egg', power: 2.0, width: 0.98, top: 1.08, bottom: 1, topWidth: 0.84 },
  { id: 'boxy', name: 'Boxy', power: 3.0, width: 0.98, top: 0.96, bottom: 0.96, topWidth: 1 },
];

const MARKINGS: [Marking, number][] = [['none', 35], ['belly', 25], ['spots', 15], ['mask', 12], ['crown', 13]];
const CHEEKS: [string, number][] = [['#FF5B23', 60], ['#E0708A', 20], ['#FFB38A', 20]];
const EYES: [[string, string], number][] = [[['#000000', '#232323'], 70], [['#101B3D', '#23336A'], 15], [['#2A170D', '#4A2C1A'], 15]];

function weighted<T>(rand: () => number, items: [T, number][]): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r < 0) return item;
  }
  return items[items.length - 1][0];
}

const pick = <T,>(rand: () => number, items: readonly T[]): T => items[Math.floor(rand() * items.length)];

export function deriveTraits(seed: number, style = LATEST_STYLE): Traits {
  const rand = mulberry32(seed);
  // New traits use their own random stream so the original traits never change.
  const extra = mulberry32((seed ^ 0x5bd1e995) >>> 0);
  const classic = style < 2;
  const freckleCount = Math.floor(rand() * 4);
  return {
    earStyle: pick(rand, ['round', 'pointy', 'floppy', 'tuft'] as const),
    earSize: 0.8 + rand() * 0.45,
    eyeStyle: pick(rand, ['round', 'tall', 'wide'] as const),
    eyeSpacing: 0.9 + rand() * 0.22,
    squish: 0.94 + rand() * 0.14,
    freckles: Array.from({ length: freckleCount }, () => ({
      side: rand() < 0.5 ? -1 : 1,
      dx: Math.floor(rand() * 3) - 1,
      dy: Math.floor(rand() * 2),
    })),
    bobSpeed: 0.8 + rand() * 0.4,
    bobPhase: rand() * Math.PI * 2,
    blinkEvery: 2.6 + rand() * 2.6,
    quirk: pick(rand, ['sway', 'earTwitch', 'hop', 'calm'] as const),
    foldSeed: Math.floor(rand() * 1e9),
    coat: classic ? COATS[0] : weighted(extra, COATS.map((c) => [c, c.weight] as [Coat, number])),
    shape: classic ? SHAPES[0] : SHAPES[Math.floor(extra() * SHAPES.length)],
    marking: classic ? 'none' : weighted(extra, MARKINGS),
    cheek: classic ? CHEEKS[0][0] : weighted(extra, CHEEKS),
    eyes: classic ? EYES[0][0] : weighted(extra, EYES),
  };
}
