import { describe, expect, it } from 'vitest';
import { createSeason, logNewOutreach, logUpdate, undoBatch, undoBlocker, type NewOutreachInput } from '../src/game/actions';
import { computeSeason, followUpDue, threadEvents, threadStatus } from '../src/game/engine';
import { levelFromXp, lifeStageForLevel, titleForLevel, xpToNextLevel } from '../src/game/rules';
import { emptyState, type GameState } from '../src/game/types';

const NOW = new Date('2026-10-10T12:00:00Z');
const TODAY = '2026-10-10';

function season(): GameState {
  return createSeason(emptyState(), { name: 'SGS&C 2027', pingName: 'Pingo', keyDates: {} }, NOW, 7);
}

function send(state: GameState, over: Partial<NewOutreachInput> = {}) {
  return logNewOutreach(state, { name: 'Dr. Ada', org: 'State University', category: 'academia', personalized: false, date: TODAY, ...over }, NOW, TODAY);
}

const xpOf = (state: GameState) => computeSeason(state, state.currentSeasonId!).totalXp;

describe('XP for sends', () => {
  it('pays 10 for a send, +5 personalized, +25 for a new organization', () => {
    let s = season();
    s = send(s, { personalized: true }).state;
    expect(xpOf(s)).toBe(10 + 5 + 25);
    s = send(s, { name: 'Prof. Bo' }).state; // same org: no new-org bonus
    expect(xpOf(s)).toBe(40 + 10);
  });

  it('treats organization names case- and punctuation-insensitively', () => {
    let s = send(season(), { org: 'State University' }).state;
    s = send(s, { name: 'Other', org: 'state  university.' }).state;
    expect(xpOf(s)).toBe(35 + 10);
  });

  it('halves send XP after 10 a day and stops after 20', () => {
    let s = season();
    for (let i = 0; i < 22; i++) s = send(s, { name: `P${i}`, org: '' }).state;
    expect(xpOf(s)).toBe(10 * 10 + 10 * 5 + 0 + 0);
    const summary = computeSeason(s, s.currentSeasonId!);
    expect(summary.stats.intellect).toBe(20);
  });

  it('rejects duplicates in the same season', () => {
    const s = send(season()).state;
    expect(() => send(s)).toThrow(/already in this season/);
  });

  it('rejects future dates', () => {
    expect(() => send(season(), { date: '2026-10-11' })).toThrow(/future/);
  });
});

describe('XP for progress', () => {
  it('scores replies, engagement, commitments and conversions once each', () => {
    const r = send(season(), { org: '' });
    let s = logUpdate(r.state, r.threadId, 'replied', { date: TODAY }, NOW, TODAY);
    s = logUpdate(s, r.threadId, 'converted', { date: TODAY }, NOW, TODAY);
    expect(xpOf(s)).toBe(10 + 40 + 60 + 150 + 300);
    expect(computeSeason(s, s.currentSeasonId!).stats.intellect).toBe(1 + 3 + 4 + 8 + 15);
    expect(threadStatus(threadEvents(s, r.threadId))).toBe('converted');
  });

  it('logs implied stages when skipping ahead, and undoes them together', () => {
    const r = send(season(), { org: '' });
    const s = logUpdate(r.state, r.threadId, 'committed', { date: TODAY }, NOW, TODAY);
    const types = threadEvents(s, r.threadId).map((e) => e.type);
    expect(types).toEqual(['sent', 'replied', 'engaged', 'committed']);
    const batch = threadEvents(s, r.threadId)[3].batchId;
    const undone = undoBatch(s, batch, NOW);
    expect(threadEvents(undone, r.threadId).map((e) => e.type)).toEqual(['sent']);
  });

  it('does not allow going backwards', () => {
    const r = send(season(), { org: '' });
    const s = logUpdate(r.state, r.threadId, 'committed', { date: TODAY }, NOW, TODAY);
    expect(() => logUpdate(s, r.threadId, 'replied', { date: TODAY }, NOW, TODAY)).toThrow();
    expect(() => logUpdate(s, r.threadId, 'followup', { date: TODAY }, NOW, TODAY)).toThrow();
  });

  it('pays CC per person up to 5 per thread', () => {
    const r = send(season(), { org: '' });
    let s = logUpdate(r.state, r.threadId, 'replied', { date: TODAY }, NOW, TODAY);
    s = logUpdate(s, r.threadId, 'cc', { date: TODAY, count: 3 }, NOW, TODAY);
    s = logUpdate(s, r.threadId, 'cc', { date: TODAY, count: 4 }, NOW, TODAY);
    expect(xpOf(s)).toBe(10 + 40 + 20 * 5);
  });

  it('gives an on-time bonus for the first follow-up 3–7 days after sending', () => {
    const r = send(season(), { org: '', date: '2026-10-01' });
    let s = logUpdate(r.state, r.threadId, 'followup', { date: '2026-10-05' }, NOW, TODAY);
    expect(xpOf(s)).toBe(10 + 10 + 10);
    s = logUpdate(s, r.threadId, 'followup', { date: '2026-10-06' }, NOW, TODAY);
    expect(xpOf(s)).toBe(30 + 10);
  });

  it('flags follow-ups as due after the minimum wait', () => {
    const r = send(season(), { org: '', date: '2026-10-06' });
    const events = threadEvents(r.state, r.threadId);
    expect(followUpDue(events, '2026-10-08', 3)).toBe(false);
    expect(followUpDue(events, '2026-10-09', 3)).toBe(true);
  });
});

describe('referrals', () => {
  it('queues the new contact and applies the warm-intro multiplier to it', () => {
    const r = send(season(), { org: '' });
    let s = logUpdate(r.state, r.threadId, 'replied', { date: TODAY }, NOW, TODAY);
    s = logUpdate(s, r.threadId, 'referred', { date: TODAY, referral: { name: 'Cy', org: '', category: 'industry' } }, NOW, TODAY);
    expect(xpOf(s)).toBe(10 + 40 + 50);
    const queued = s.threads.find((t) => s.contacts.find((c) => c.id === t.contactId)?.name === 'Cy')!;
    expect(threadStatus(threadEvents(s, queued.id))).toBe('queued');
    s = logUpdate(s, queued.id, 'sent', { date: TODAY, personalized: true }, NOW, TODAY);
    expect(xpOf(s)).toBe(100 + Math.round(15 * 1.25));
    expect(computeSeason(s, s.currentSeasonId!).stats.craft).toBe(1);
  });

  it('cannot undo a referral once the new contact was emailed', () => {
    const r = send(season(), { org: '' });
    let s = logUpdate(r.state, r.threadId, 'replied', { date: TODAY }, NOW, TODAY);
    s = logUpdate(s, r.threadId, 'referred', { date: TODAY, referral: { name: 'Cy', org: '', category: 'industry' } }, NOW, TODAY);
    const referral = s.events.find((e) => e.type === 'referred')!;
    const queued = s.threads.find((t) => t.contactId === referral.referredContactId)!;
    const emailed = logUpdate(s, queued.id, 'sent', { date: TODAY }, NOW, TODAY);
    expect(undoBlocker(emailed, referral.batchId, NOW)).toMatch(/already been emailed/);
    const undone = undoBatch(s, referral.batchId, NOW);
    expect(undone.contacts.some((c) => c.name === 'Cy')).toBe(false);
  });
});

describe('undo', () => {
  it('removes a new contact entirely when its first send is undone', () => {
    const r = send(season());
    const batch = r.state.events[0].batchId;
    const s = undoBatch(r.state, batch, NOW);
    expect(s.contacts).toHaveLength(0);
    expect(s.threads).toHaveLength(0);
    expect(xpOf(s)).toBe(0);
  });

  it('only allows the latest batch, within 24 hours', () => {
    const r = send(season(), { org: '' });
    const s = logUpdate(r.state, r.threadId, 'replied', { date: TODAY }, new Date(NOW.getTime() + 1000), TODAY);
    expect(undoBlocker(s, s.events[0].batchId, NOW)).toMatch(/newer/);
    const later = new Date(NOW.getTime() + 25 * 3_600_000);
    expect(undoBlocker(s, s.events[1].batchId, later)).toMatch(/24 hours/);
  });
});

describe('levels', () => {
  it('follows 80 × level^1.4', () => {
    expect([1, 5, 10].map(xpToNextLevel)).toEqual([80, 761, 2010]);
  });

  it('starts as an egg and hatches on the first outreach', () => {
    expect(levelFromXp(0, false).level).toBe(0);
    expect(levelFromXp(0, true).level).toBe(1);
    expect(levelFromXp(80, true)).toEqual({ level: 2, into: 0, needed: xpToNextLevel(2) });
  });

  it('maps levels to life stages and titles', () => {
    expect([0, 1, 5, 10, 15, 25].map(lifeStageForLevel)).toEqual(['egg', 'baby', 'kid', 'teen', 'adult', 'legend']);
    expect(titleForLevel(5)).toBe('Connector');
    expect(titleForLevel(30)).toBe('Legend of Outreach');
  });
});
