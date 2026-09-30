import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach, rerollPingLook, upgradePingStyle } from '../src/game/actions';
import { emptyState } from '../src/game/types';
import { COATS, deriveTraits, LATEST_STYLE, SHAPES } from '../src/ping/traits';

describe('Ping look variety', () => {
  it('keeps the classic look for style 1', () => {
    const t = deriveTraits(42, 1);
    expect([t.coat.id, t.shape.id, t.marking, t.cheek]).toEqual(['charcoal', 'round', 'none', '#FF5B23']);
  });

  it('never changes the original traits when new ones are added', () => {
    for (const seed of [1, 7, 99, 12345]) {
      const { coat, shape, marking, cheek, eyes, ...classic } = deriveTraits(seed, 1);
      const { coat: c2, shape: s2, marking: m2, cheek: k2, eyes: e2, ...latest } = deriveTraits(seed, LATEST_STYLE);
      expect(latest).toEqual(classic);
    }
  });

  it('spreads seeds across coats and shapes, with charcoal most common', () => {
    const counts = new Map<string, number>();
    const shapes = new Set<string>();
    for (let seed = 0; seed < 2000; seed++) {
      const t = deriveTraits(seed);
      counts.set(t.coat.id, (counts.get(t.coat.id) ?? 0) + 1);
      shapes.add(t.shape.id);
    }
    expect(counts.size).toBe(COATS.length);
    expect(shapes.size).toBe(SHAPES.length);
    const most = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    expect(most).toBe('charcoal');
  });
});

describe('season look actions', () => {
  const at = new Date('2026-10-05T12:00:00');
  it('new seasons hatch with the latest style; rerolls stop after the first outreach', () => {
    let s = createSeason(emptyState(), { name: 'S', pingName: 'P', keyDates: {} }, at, 5);
    const id = s.currentSeasonId!;
    expect(s.seasons[0].pingStyle).toBe(LATEST_STYLE);
    s = rerollPingLook(s, id, 77);
    expect(s.seasons[0].pingSeed).toBe(77);
    s = logNewOutreach(s, { name: 'A', org: '', category: 'academia', personalized: false, date: '2026-10-05' }, at, '2026-10-05').state;
    expect(() => rerollPingLook(s, id, 88)).toThrow(/locked|set once/);
  });

  it('upgrades a classic Ping without changing its seed', () => {
    let s = createSeason(emptyState(), { name: 'S', pingName: 'P', keyDates: {} }, at, 5);
    s = { ...s, seasons: s.seasons.map((x) => ({ ...x, pingStyle: 1 })) };
    const up = upgradePingStyle(s, s.currentSeasonId!);
    expect(up.seasons[0]).toMatchObject({ pingStyle: LATEST_STYLE, pingSeed: 5 });
  });
});
