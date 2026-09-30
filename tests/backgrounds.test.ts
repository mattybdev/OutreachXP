import { describe, expect, it } from 'vitest';
import { computeAchievements } from '../src/game/achievements';
import { emptyState } from '../src/game/types';
import { BACKGROUNDS, renderBackground, unlockedBackgrounds } from '../src/ping/backgrounds';
import { PING_CANVAS } from '../src/ping/render';

describe('backgrounds', () => {
  const achievementIds = computeAchievements(emptyState()).map((a) => a.id);

  it('gives every achievement exactly one background, plus a default room', () => {
    const linked = BACKGROUNDS.filter((b) => b.achievement).map((b) => b.achievement!);
    expect([...linked].sort()).toEqual([...achievementIds].sort());
    expect(BACKGROUNDS.filter((b) => !b.achievement).map((b) => b.id)).toEqual(['room']);
    expect(new Set(BACKGROUNDS.map((b) => b.id)).size).toBe(BACKGROUNDS.length);
  });

  it('unlocks only the room until achievements are earned', () => {
    expect([...unlockedBackgrounds(new Set())]).toEqual(['room']);
    expect(unlockedBackgrounds(new Set(['hatchling'])).has('mailroom')).toBe(true);
  });

  it('renders every background to a full canvas without gaps', () => {
    const gaps = BACKGROUNDS.filter((b) => {
      const frame = renderBackground(b.id, 2.5);
      return frame.pixels.length !== PING_CANVAS * PING_CANVAS || !frame.pixels.every(Boolean);
    }).map((b) => b.id);
    expect(gaps).toEqual([]);
  });
});
