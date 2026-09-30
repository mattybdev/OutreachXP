// Game data model (GDD §11.2). Everything is derived from the event log where practical.

import type { Stat } from '../ping/genome';

export const CATEGORIES = ['academia', 'industry', 'organizations', 'government'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Pipeline stages that advance a thread, in order. */
export const STAGES = ['sent', 'replied', 'engaged', 'committed', 'converted'] as const;
export type Stage = (typeof STAGES)[number];

/** Everything the player can log. */
export type EventType = Stage | 'followup' | 'cc' | 'referred' | 'closed';

/** Where a thread sits in the pipeline. */
export type ThreadStatus = 'queued' | Stage | 'closed';

export interface KeyDates {
  kickoff?: string;
  submissionsOpen?: string;
  submissionDeadline?: string;
  judgingStart?: string;
  judgingEnd?: string;
  eventStart?: string;
  eventEnd?: string;
  wrapUpEnd?: string;
}

export interface Season {
  id: string;
  name: string;
  keyDates: KeyDates;
  pingName: string;
  pingSeed: number;
  /** Look style version for this season's Ping (1 = classic charcoal; newer styles vary coat and shape). */
  pingStyle?: number;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  org: string;
  email?: string;
  category: Category;
  createdAt: string;
  /** Set when another contact introduced this one (warm intro). */
  referredBy?: string;
}

/** One contact's outreach within one season. */
export interface Thread {
  id: string;
  seasonId: string;
  contactId: string;
  createdAt: string;
}

export interface OutreachEvent {
  id: string;
  seasonId: string;
  threadId: string;
  type: EventType;
  /** Local calendar date the action happened (YYYY-MM-DD). */
  date: string;
  /** When it was logged (ISO timestamp); used for ordering and the 24h undo window. */
  loggedAt: string;
  /** Events logged together (e.g. a skip-ahead) share a batch and undo together. */
  batchId: string;
  personalized?: boolean;
  /** People CC'd or forwarded to (cc events). */
  count?: number;
  /** The new contact introduced (referred events). */
  referredContactId?: string;
  note?: string;
}

export interface Settings {
  /** Days after an unanswered send when a follow-up is due, and the end of the speed-bonus window. */
  followUpMinDays: number;
  followUpMaxDays: number;
  /** Weekdays that count for streaks and meter decay (0 = Sunday … 6 = Saturday). */
  activeDays: number[];
  /** Dates off (YYYY-MM-DD): they never break a streak or drain Ping's meters. */
  holidays: string[];
  /** The equipped background for Ping's room (unlocked by achievements). */
  background: string;
}

export interface GameState {
  version: 1;
  currentSeasonId: string | null;
  seasons: Season[];
  contacts: Contact[];
  threads: Thread[];
  events: OutreachEvent[];
  /** Days the player opened the game (YYYY-MM-DD); checking in restores Ping's energy. */
  checkins: string[];
  settings: Settings;
}

export const CATEGORY_STAT: Record<Category, Stat> = {
  academia: 'intellect',
  industry: 'craft',
  organizations: 'heart',
  government: 'authority',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  academia: 'Academia',
  industry: 'Industry',
  organizations: 'Organizations',
  government: 'Government',
};

export function emptyState(): GameState {
  return {
    version: 1,
    currentSeasonId: null,
    seasons: [],
    contacts: [],
    threads: [],
    events: [],
    checkins: [],
    settings: { followUpMinDays: 3, followUpMaxDays: 7, activeDays: [1, 2, 3, 4, 5], holidays: [], background: 'room' },
  };
}
