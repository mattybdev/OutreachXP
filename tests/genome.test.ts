import { describe, expect, it } from 'vitest';
import { effectivePoints, hybridOf, rawTier, resolveForm, visibleTier, type Stats } from '../src/pip/genome';

const stats = (intellect: number, craft: number, heart: number, authority: number): Stats => ({ intellect, craft, heart, authority });

describe('tiers', () => {
  it('uses the GDD thresholds 0/20/60/140/280/500', () => {
    expect([0, 19, 20, 59, 60, 139, 140, 279, 280, 499, 500, 9999].map(rawTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('caps visible tiers by life stage', () => {
    expect(visibleTier(600, 'baby')).toBe(1);
    expect(visibleTier(600, 'kid')).toBe(3);
    expect(visibleTier(600, 'teen')).toBe(4);
    expect(visibleTier(600, 'adult')).toBe(5);
  });

  it('holds back continuous growth beyond the stage cap', () => {
    expect(effectivePoints(600, 'baby')).toBe(59);
    expect(effectivePoints(600, 'kid')).toBe(279);
    expect(effectivePoints(600, 'adult')).toBe(600);
    expect(effectivePoints(-5, 'adult')).toBe(0);
  });
});

describe('forms', () => {
  it('has no form before Teen', () => {
    expect(resolveForm(stats(500, 0, 0, 0), 'kid')).toBe('none');
  });

  it('picks a pure form when one stat is at least 40%', () => {
    expect(resolveForm(stats(400, 100, 100, 100), 'teen')).toBe('scholar');
    expect(resolveForm(stats(0, 0, 0, 10), 'adult')).toBe('envoy');
  });

  it('picks a hybrid when the top two are each at least 30%', () => {
    expect(resolveForm(stats(35, 5, 25, 35), 'adult')).toBe('strategist');
    expect(resolveForm(stats(5, 35, 35, 25), 'adult')).toBe('maker');
  });

  it('picks Polymath when every stat is 15–35%', () => {
    expect(resolveForm(stats(100, 100, 100, 100), 'adult')).toBe('polymath');
  });

  it('falls back to the top stat', () => {
    expect(resolveForm(stats(36, 29, 25, 10), 'adult')).toBe('scholar');
  });

  it('names hybrids independent of order', () => {
    expect(hybridOf('authority', 'heart')).toBe(hybridOf('heart', 'authority'));
  });
});
