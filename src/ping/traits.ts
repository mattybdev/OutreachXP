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
}

const pick = <T,>(rand: () => number, items: readonly T[]): T => items[Math.floor(rand() * items.length)];

export function deriveTraits(seed: number): Traits {
  const rand = mulberry32(seed);
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
  };
}
