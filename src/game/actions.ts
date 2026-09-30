// State changes. Each action returns a new state and never mutates its input.

import { LATEST_STYLE } from '../ping/traits';
import { isValidISODate } from './dates';
import { allowedActions, orgKey, threadEvents, threadStatus } from './engine';
import { IMPLIED_STAGES, LIMITS } from './rules';
import {
  CATEGORIES,
  STAGES,
  type Category,
  type Contact,
  type EventType,
  type GameState,
  type KeyDates,
  type OutreachEvent,
  type Season,
  type Stage,
  type Thread,
} from './types';

export class ActionError extends Error {
  constructor(message: string, readonly threadId?: string) {
    super(message);
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Seasons ───────────────────────────────────────────────────────────────

export interface SeasonInput {
  name: string;
  pingName: string;
  keyDates: KeyDates;
}

function cleanSeasonInput(input: SeasonInput): SeasonInput {
  const name = input.name.trim();
  if (!name) throw new ActionError('Give the season a name.');
  const keyDates: KeyDates = {};
  for (const [k, v] of Object.entries(input.keyDates)) {
    if (!v) continue;
    if (!isValidISODate(v)) throw new ActionError('One of the dates is not valid.');
    keyDates[k as keyof KeyDates] = v;
  }
  return { name, pingName: input.pingName.trim() || 'Ping', keyDates };
}

export function createSeason(state: GameState, input: SeasonInput, now = new Date(), seed = Math.floor(Math.random() * 1e6)): GameState {
  const clean = cleanSeasonInput(input);
  const season: Season = { id: newId(), ...clean, pingSeed: seed, pingStyle: LATEST_STYLE, createdAt: now.toISOString() };
  return { ...state, seasons: [...state.seasons, season], currentSeasonId: season.id };
}

/**
 * Start the next season: the current season is archived (its Ping retires to the Hall of Pings)
 * and a new one begins with a fresh mystery egg. Contacts carry over; threads and XP don't.
 */
export function startNewSeason(state: GameState, input: SeasonInput, now = new Date(), seed = Math.floor(Math.random() * 1e6)): GameState {
  const archived = state.seasons.map((s) => (s.id === state.currentSeasonId && !s.archivedAt ? { ...s, archivedAt: now.toISOString() } : s));
  return createSeason({ ...state, seasons: archived }, input, now, seed);
}

export function updateSeason(state: GameState, seasonId: string, input: SeasonInput): GameState {
  const clean = cleanSeasonInput(input);
  return { ...state, seasons: state.seasons.map((s) => (s.id === seasonId ? { ...s, ...clean } : s)) };
}

// ─── Logging outreach ──────────────────────────────────────────────────────

export interface NewOutreachInput {
  name: string;
  org: string;
  email?: string;
  category: Category;
  personalized: boolean;
  date: string;
  note?: string;
}

function requireSeason(state: GameState): string {
  if (!state.currentSeasonId) throw new ActionError('Set up a season first.');
  return state.currentSeasonId;
}

function checkDate(date: string, today: string): void {
  if (!isValidISODate(date)) throw new ActionError('Pick a valid date.');
  if (date > today) throw new ActionError('That date is in the future.');
}

function sameContact(c: Contact, name: string, org: string): boolean {
  return c.name.trim().toLowerCase() === name.trim().toLowerCase() && orgKey(c.org) === orgKey(org);
}

function makeEvent(seasonId: string, threadId: string, type: EventType, date: string, batchId: string, now: Date, extra: Partial<OutreachEvent> = {}): OutreachEvent {
  return { id: newId(), seasonId, threadId, type, date, loggedAt: now.toISOString(), batchId, ...extra };
}

/** Log an initial email to a new (or existing, not-yet-contacted) contact. */
export function logNewOutreach(state: GameState, input: NewOutreachInput, now = new Date(), today = input.date): { state: GameState; threadId: string } {
  const seasonId = requireSeason(state);
  const name = input.name.trim();
  const org = input.org.trim();
  if (!name) throw new ActionError('Add the contact’s name.');
  if (!CATEGORIES.includes(input.category)) throw new ActionError('Pick a category.');
  checkDate(input.date, today);

  let contact = state.contacts.find((c) => sameContact(c, name, org));
  const contacts = [...state.contacts];
  if (!contact) {
    contact = { id: newId(), name, org, category: input.category, createdAt: now.toISOString(), ...(input.email?.trim() ? { email: input.email.trim() } : {}) };
    contacts.push(contact);
  }

  const threads = [...state.threads];
  let thread = threads.find((t) => t.seasonId === seasonId && t.contactId === contact!.id);
  if (thread && threadStatus(threadEvents(state, thread.id)) !== 'queued') {
    throw new ActionError(`${contact.name} is already in this season’s pipeline. Log an update instead.`, thread.id);
  }
  if (!thread) {
    thread = { id: newId(), seasonId, contactId: contact.id, createdAt: now.toISOString() };
    threads.push(thread);
  }
  const batchId = newId();
  const event = makeEvent(seasonId, thread.id, 'sent', input.date, batchId, now, {
    personalized: input.personalized,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  });
  return { state: { ...state, contacts, threads, events: [...state.events, event] }, threadId: thread.id };
}

export interface UpdateInput {
  date: string;
  note?: string;
  /** People CC'd (cc). */
  count?: number;
  /** Whether a queued contact's first email was personalized (sent). */
  personalized?: boolean;
  /** The new contact (referred). */
  referral?: { name: string; org: string; category: Category; email?: string };
}

/** Log progress on an existing thread. Logging a later stage also logs the stages it implies. */
export function logUpdate(state: GameState, threadId: string, type: EventType, input: UpdateInput, now = new Date(), today = input.date): GameState {
  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread) throw new ActionError('That contact could not be found.');
  checkDate(input.date, today);
  const events = threadEvents(state, threadId);
  const status = threadStatus(events);
  if (!allowedActions(status).includes(type)) throw new ActionError('That step isn’t available for this contact right now.');
  const firstDate = events[0]?.date;
  if (firstDate && input.date < firstDate) throw new ActionError('That date is before this contact’s first email.');

  const batchId = newId();
  const extra: Partial<OutreachEvent> = input.note?.trim() ? { note: input.note.trim() } : {};
  const added: OutreachEvent[] = [];
  let contacts = state.contacts;
  let threads = state.threads;

  if ((STAGES as readonly string[]).includes(type) && type !== 'sent') {
    const logged = new Set(events.map((e) => e.type));
    const upTo = IMPLIED_STAGES.indexOf(type as Stage);
    for (const stage of IMPLIED_STAGES.slice(0, upTo + 1)) {
      if (!logged.has(stage)) added.push(makeEvent(thread.seasonId, threadId, stage, input.date, batchId, now, stage === type ? extra : {}));
    }
  } else if (type === 'cc') {
    const count = Math.round(input.count ?? 0);
    if (count < 1 || count > 50) throw new ActionError('Enter how many people were CC’d.');
    added.push(makeEvent(thread.seasonId, threadId, 'cc', input.date, batchId, now, { ...extra, count }));
  } else if (type === 'referred') {
    const r = input.referral;
    if (!r?.name.trim()) throw new ActionError('Add the name of the person you were introduced to.');
    if (!CATEGORIES.includes(r.category)) throw new ActionError('Pick a category for the new contact.');
    const referrer = state.contacts.find((c) => c.id === thread.contactId)!;
    if (state.contacts.some((c) => sameContact(c, r.name, r.org))) throw new ActionError(`${r.name.trim()} is already a contact.`);
    const contact: Contact = {
      id: newId(), name: r.name.trim(), org: r.org.trim(), category: r.category, createdAt: now.toISOString(), referredBy: referrer.id,
      ...(r.email?.trim() ? { email: r.email.trim() } : {}),
    };
    const queued: Thread = { id: newId(), seasonId: thread.seasonId, contactId: contact.id, createdAt: now.toISOString() };
    contacts = [...contacts, contact];
    threads = [...threads, queued];
    added.push(makeEvent(thread.seasonId, threadId, 'referred', input.date, batchId, now, { ...extra, referredContactId: contact.id }));
  } else {
    added.push(makeEvent(thread.seasonId, threadId, type, input.date, batchId, now, {
      ...extra, ...(type === 'sent' ? { personalized: !!input.personalized } : {}),
    }));
  }
  return { ...state, contacts, threads, events: [...state.events, ...added] };
}

// ─── Undo ──────────────────────────────────────────────────────────────────

/** Why a batch can't be undone, or null if it can. Only a thread's latest batch, within 24 hours. */
export function undoBlocker(state: GameState, batchId: string, now = new Date()): string | null {
  const batch = state.events.filter((e) => e.batchId === batchId);
  if (!batch.length) return 'Already undone.';
  const loggedAt = Math.min(...batch.map((e) => Date.parse(e.loggedAt)));
  if (now.getTime() - loggedAt > LIMITS.undoHours * 3_600_000) return 'Undo is only available for 24 hours.';
  const threadId = batch[0].threadId;
  // The most recently logged event on the thread (ties go to the one logged later).
  const latest = state.events.filter((e) => e.threadId === threadId).reduce((a, b) => (b.loggedAt >= a.loggedAt ? b : a));
  if (latest.batchId !== batchId) return 'Undo the newer updates for this contact first.';
  for (const e of batch) {
    if (e.type !== 'referred' || !e.referredContactId) continue;
    const refThread = state.threads.find((t) => t.contactId === e.referredContactId);
    if (refThread && state.events.some((x) => x.threadId === refThread.id)) return 'The referred contact has already been emailed.';
  }
  return null;
}

export function undoBatch(state: GameState, batchId: string, now = new Date()): GameState {
  const blocker = undoBlocker(state, batchId, now);
  if (blocker) throw new ActionError(blocker);
  const batch = state.events.filter((e) => e.batchId === batchId);
  let contacts = state.contacts;
  let threads = state.threads;
  const events = state.events.filter((e) => e.batchId !== batchId);

  for (const e of batch) {
    if (e.type === 'referred' && e.referredContactId) {
      contacts = contacts.filter((c) => c.id !== e.referredContactId);
      threads = threads.filter((t) => t.contactId !== e.referredContactId);
    }
    if (e.type === 'sent') {
      // A referred contact goes back to "To contact"; anyone else leaves the pipeline.
      const thread = threads.find((t) => t.id === e.threadId)!;
      const contact = contacts.find((c) => c.id === thread.contactId)!;
      if (!contact.referredBy) {
        threads = threads.filter((t) => t.id !== thread.id);
        if (!threads.some((t) => t.contactId === contact.id)) contacts = contacts.filter((c) => c.id !== contact.id);
      }
    }
  }
  return { ...state, contacts, threads, events };
}
