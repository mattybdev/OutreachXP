// Persistence: the whole game state as one IndexedDB record (GDD §11.1), with a localStorage
// fallback. Imported files are validated before use.

import { isValidISODate } from './dates';
import { CATEGORIES, emptyState, type EventType, type GameState } from './types';

const DB_NAME = 'outreachxp';
const STORE = 'kv';
const KEY = 'state';
const LS_KEY = 'outreachxp.state.v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadState(): Promise<GameState> {
  try {
    const raw = await idbGet();
    if (raw) return parseState(raw);
  } catch {
    // Fall through to localStorage.
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return parseState(JSON.parse(raw));
  } catch {
    // Unreadable storage: start fresh.
  }
  return emptyState();
}

export async function saveState(state: GameState): Promise<void> {
  try {
    await idbPut(state);
    return;
  } catch {
    // Fall back below.
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    throw new Error('Could not save. Export a backup from the Data page.');
  }
}

// ─── Validation ────────────────────────────────────────────────────────────

const EVENT_TYPES: EventType[] = ['sent', 'followup', 'replied', 'engaged', 'cc', 'referred', 'committed', 'converted', 'closed'];
const str = (v: unknown): v is string => typeof v === 'string';

export class ImportError extends Error {}

/** Validate and normalize anything that claims to be a saved game (e.g. an imported file). */
export function parseState(raw: unknown): GameState {
  const fail = (what: string): never => {
    throw new ImportError(`This file doesn’t look like an OutreachXP backup (${what}).`);
  };
  if (!raw || typeof raw !== 'object') fail('not an object');
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) fail('unknown version');
  const arr = (k: string) => (Array.isArray(r[k]) ? (r[k] as Record<string, unknown>[]) : fail(`missing ${k}`));

  const seasons = arr('seasons').map((s) => {
    if (!str(s.id) || !str(s.name)) fail('bad season');
    const keyDates: Record<string, string> = {};
    for (const [k, v] of Object.entries((s.keyDates as object) ?? {})) if (isValidISODate(v)) keyDates[k] = v;
    return {
      id: s.id as string, name: s.name as string, keyDates,
      pingName: str(s.pingName) ? s.pingName : 'Ping',
      pingSeed: Number.isFinite(s.pingSeed) ? (s.pingSeed as number) : 1,
      pingStyle: Number.isInteger(s.pingStyle) && (s.pingStyle as number) >= 1 ? (s.pingStyle as number) : 1,
      createdAt: str(s.createdAt) ? s.createdAt : new Date().toISOString(),
      ...(str(s.archivedAt) ? { archivedAt: s.archivedAt } : {}),
    };
  });
  const contacts = arr('contacts').map((c) => {
    if (!str(c.id) || !str(c.name) || !CATEGORIES.includes(c.category as never)) fail('bad contact');
    return {
      id: c.id as string, name: c.name as string, org: str(c.org) ? c.org : '',
      category: c.category as GameState['contacts'][number]['category'],
      createdAt: str(c.createdAt) ? c.createdAt : new Date().toISOString(),
      ...(str(c.email) ? { email: c.email } : {}),
      ...(str(c.referredBy) ? { referredBy: c.referredBy } : {}),
    };
  });
  const threads = arr('threads').map((t) => {
    if (!str(t.id) || !str(t.seasonId) || !str(t.contactId)) fail('bad thread');
    return { id: t.id as string, seasonId: t.seasonId as string, contactId: t.contactId as string, createdAt: str(t.createdAt) ? t.createdAt : '' };
  });
  const events = arr('events').map((e) => {
    if (!str(e.id) || !str(e.threadId) || !str(e.seasonId) || !EVENT_TYPES.includes(e.type as EventType) || !isValidISODate(e.date) || !str(e.loggedAt)) fail('bad event');
    return {
      id: e.id as string, seasonId: e.seasonId as string, threadId: e.threadId as string, type: e.type as EventType,
      date: e.date as string, loggedAt: e.loggedAt as string, batchId: str(e.batchId) ? e.batchId : (e.id as string),
      ...(typeof e.personalized === 'boolean' ? { personalized: e.personalized } : {}),
      ...(Number.isFinite(e.count) ? { count: e.count as number } : {}),
      ...(str(e.referredContactId) ? { referredContactId: e.referredContactId } : {}),
      ...(str(e.note) ? { note: e.note } : {}),
    };
  });
  const settings = (r.settings ?? {}) as Record<string, unknown>;
  const min = Number(settings.followUpMinDays), max = Number(settings.followUpMaxDays);
  const current = str(r.currentSeasonId) && seasons.some((s) => s.id === r.currentSeasonId) ? r.currentSeasonId : seasons.at(-1)?.id ?? null;
  return {
    version: 1,
    currentSeasonId: current,
    seasons, contacts, threads, events,
    checkins: Array.isArray(r.checkins) ? [...new Set((r.checkins as unknown[]).filter(isValidISODate))].sort() : [],
    settings: {
      followUpMinDays: Number.isInteger(min) && min >= 1 && min <= 30 ? min : 3,
      followUpMaxDays: Number.isInteger(max) && max >= 1 && max <= 60 ? max : 7,
      activeDays: Array.isArray(settings.activeDays)
        ? [...new Set((settings.activeDays as unknown[]).filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort()
        : [1, 2, 3, 4, 5],
      holidays: Array.isArray(settings.holidays) ? [...new Set((settings.holidays as unknown[]).filter(isValidISODate))].sort() : [],
      background: str(settings.background) && /^[a-z0-9-]{1,40}$/.test(settings.background) ? settings.background : 'room',
    },
  };
}
