import { describe, expect, it } from 'vitest';
import { LIFE_STAGES, MOODS, type PipGenome } from '../src/pip/genome';
import { PIP_CANVAS, renderPip } from '../src/pip/render';
import { deriveTraits, mulberry32 } from '../src/pip/traits';

const genome = (over: Partial<PipGenome> = {}): PipGenome => ({
  seed: 42,
  lifeStage: 'adult',
  mood: 'neutral',
  stats: { intellect: 150, craft: 90, heart: 70, authority: 40 },
  ...over,
});
const key = (g: PipGenome, time = 0) => renderPip(g, { time }).pixels.join(',');

describe('renderPip', () => {
  it('is deterministic for the same genome and time', () => {
    expect(key(genome(), 1.23)).toBe(key(genome(), 1.23));
  });

  it('gives different seeds different looks', () => {
    const looks = new Set([1, 2, 3, 4, 5, 6].map((seed) => key(genome({ seed }))));
    expect(looks.size).toBeGreaterThan(3);
  });

  it('keeps traits stable as stats grow', () => {
    expect(deriveTraits(7)).toEqual(deriveTraits(7));
  });

  it('changes shape when stats change', () => {
    expect(key(genome())).not.toBe(key(genome({ stats: { intellect: 400, craft: 90, heart: 70, authority: 40 } })));
  });

  it('renders every stage and mood for random genomes without leaving the canvas empty', () => {
    const rand = mulberry32(1234);
    for (let i = 0; i < 150; i++) {
      const g: PipGenome = {
        seed: Math.floor(rand() * 1e6),
        lifeStage: LIFE_STAGES[i % LIFE_STAGES.length],
        mood: MOODS[i % MOODS.length],
        stats: { intellect: rand() * 600, craft: rand() * 600, heart: rand() * 600, authority: rand() * 600 },
      };
      const frame = renderPip(g, { time: rand() * 10, dither: i % 2 === 0 });
      expect(frame.pixels).toHaveLength(PIP_CANVAS * PIP_CANVAS);
      expect(frame.pixels.filter(Boolean).length).toBeGreaterThan(300);
    }
  });

  it('always shows open eyes (white pixels) when awake and not blinking', () => {
    const rand = mulberry32(99);
    for (let i = 0; i < 60; i++) {
      const g = genome({
        seed: i,
        mood: 'happy',
        lifeStage: 'legend',
        stats: { intellect: rand() * 600, craft: rand() * 600, heart: rand() * 600, authority: rand() * 600 },
      });
      const pixels = renderPip(g, { time: 0.5 }).pixels;
      const whites = pixels.filter((p) => p === '#FFFFFF').length;
      expect(whites).toBeGreaterThan(16);
    }
  });
});
