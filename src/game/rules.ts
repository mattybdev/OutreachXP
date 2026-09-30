// Tunable numbers from the GDD (§3.2, §3.3, §4.3, §5.1, §5.2) in one place.

import type { LifeStage } from '../ping/genome';
import type { EventType, KeyDates, Stage } from './types';

export const XP = {
  sent: 10,
  personalized: 5,
  followup: 10,
  replied: 40,
  engaged: 60,
  ccPerPerson: 20,
  referred: 50,
  committed: 150,
  converted: 300,
  closed: 5,
  newOrg: 25,
  speedBonus: 10,
  welcomeBack: 20,
} as const;

export const STAT_POINTS: Record<EventType, number> = {
  sent: 1,
  followup: 1,
  replied: 3,
  engaged: 4,
  cc: 1, // per person
  referred: 3,
  committed: 8,
  converted: 15,
  closed: 0,
};

export const LIMITS = {
  /** CC'd people rewarded per thread. */
  ccPerThread: 5,
  /** Follow-ups rewarded per thread. */
  followupsPerThread: 3,
  /** Referrals rewarded per thread. */
  referralsPerThread: 3,
  /** Initial sends per day at full XP, then at half XP; beyond both, 0 XP. */
  fullSendsPerDay: 10,
  halfSendsPerDay: 10,
  undoHours: 24,
} as const;

export const WARM_INTRO_MULTIPLIER = 1.25;

export const EVENT_LABEL: Record<EventType, string> = {
  sent: 'Sent',
  followup: 'Followed up',
  replied: 'Replied',
  engaged: 'Engaged',
  cc: "CC'd others",
  referred: 'Referred someone',
  committed: 'Committed',
  converted: 'Converted',
  closed: 'Thanked / closed',
};

export const EVENT_HINT: Record<EventType, string> = {
  sent: 'Sent an initial email',
  followup: 'Followed up on an unanswered email',
  replied: 'They responded',
  engaged: 'Positive reply: interested, asked questions, booked a call',
  cc: 'They CC’d or forwarded you to others',
  referred: 'They introduced you to a new contact',
  committed: 'They plan to submit, judge, attend or share',
  converted: 'They actually submitted, judged or took part',
  closed: 'Sent a thank-you, or closed a dead thread',
};

export const STATUS_LABEL: Record<string, string> = {
  queued: 'To contact',
  sent: 'Awaiting reply',
  replied: 'Replied',
  engaged: 'Engaged',
  committed: 'Committed',
  converted: 'Converted',
  closed: 'Closed',
};

/** Stages a later stage implies (a commitment implies they replied and engaged). */
export const IMPLIED_STAGES: Stage[] = ['replied', 'engaged', 'committed', 'converted'];

// ─── Levels ────────────────────────────────────────────────────────────────

export function xpToNextLevel(level: number): number {
  return Math.round(80 * level ** 1.4);
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs. */
  needed: number;
}

/** Level 0 is the Envelope Egg; the first logged outreach makes Level 1. */
export function levelFromXp(totalXp: number, hasOutreach: boolean): LevelInfo {
  if (!hasOutreach) return { level: 0, into: 0, needed: 0 };
  let level = 1;
  let rest = Math.max(0, totalXp);
  while (rest >= xpToNextLevel(level)) {
    rest -= xpToNextLevel(level);
    level++;
  }
  return { level, into: rest, needed: xpToNextLevel(level) };
}

export function lifeStageForLevel(level: number): LifeStage {
  if (level <= 0) return 'egg';
  if (level <= 4) return 'baby';
  if (level <= 9) return 'kid';
  if (level <= 14) return 'teen';
  if (level <= 24) return 'adult';
  return 'legend';
}

const TITLES: [number, string][] = [
  [25, 'Legend of Outreach'],
  [20, 'Showcase Champion'],
  [15, 'Coalition Builder'],
  [12, 'Ambassador'],
  [8, 'Networker'],
  [5, 'Connector'],
  [3, 'Outreach Rookie'],
  [1, 'Intern Liaison'],
];

export function titleForLevel(level: number): string {
  return TITLES.find(([min]) => level >= min)?.[1] ?? 'Egg Sitter';
}

// ─── Season dates ──────────────────────────────────────────────────────────

export const KEY_DATE_LABELS: Record<keyof KeyDates, string> = {
  kickoff: 'Outreach kickoff',
  submissionsOpen: 'Submissions open',
  submissionDeadline: 'Submission deadline',
  judgingStart: 'Judging starts',
  judgingEnd: 'Judging ends',
  eventStart: 'Showcase event',
  eventEnd: 'Showcase ends',
  wrapUpEnd: 'Season wrap-up',
};
