// OutreachXP game shell: loads and saves state, routes between views, and animates Ping.

import { streakInfo, streakMultiplier } from '../game/care';
import { todayISO } from '../game/dates';
import { computeSeason } from '../game/engine';
import { lifeStageForLevel, titleForLevel } from '../game/rules';
import { loadState, requestPersistence, saveState } from '../game/storage';
import type { GameState } from '../game/types';
import { drawFrame, GROUND, PING_CANVAS, PIXEL_DENSITY, renderPing, type PingFrame } from '../ping/render';
import { roomColors } from '../theme';
import { careNow, currentSeason, esc, seasonSummary, type AppContext, type QuickLogOptions } from './context';
import { openQuickLog } from './quicklog';
import { drawReactions, isActive, pingOffset, reactionFor, type Reaction } from './reactions';
import { bindData, renderData } from './views/data';
import { bindHome, currentGenome, renderHome } from './views/home';
import { bindPipeline, renderPipeline } from './views/pipeline';
import { bindQuests, renderQuests } from './views/quests';
import { bindSeason, renderSeason } from './views/season';
import { achievements, renderTrophies } from './views/trophies';
import { PERFECT_DAY_XP } from '../game/quests';

type Route = 'home' | 'pipeline' | 'quests' | 'trophies' | 'season' | 'data';
const ROUTES: Route[] = ['home', 'pipeline', 'quests', 'trophies', 'season', 'data'];

const view = document.getElementById('view')!;
const dialog = document.getElementById('quicklog') as HTMLDialogElement;
const toastEl = document.getElementById('toast')!;

let state: GameState;
let saving = Promise.resolve();

const ctx: AppContext = {
  get state() {
    return state;
  },
  commit(next, before) {
    state = next;
    saving = saving.then(() => saveState(next)).catch((err) => ctx.toast((err as Error).message, 'error'));
    if (before) announce(before, next);
    render();
  },
  navigate(route) {
    if (location.hash !== `#${route}`) location.hash = route;
    else render();
  },
  openQuickLog(options?: QuickLogOptions) {
    if (!currentSeason(state)) return ctx.navigate('season');
    openQuickLog(dialog, () => ctx, options);
  },
  toast,
};

/** Tell the player what they earned, and celebrate hatching and level-ups. */
function announce(before: GameState, after: GameState): void {
  const id = after.currentSeasonId;
  if (!id) return;
  const a = computeSeason(before, id), b = computeSeason(after, id);
  const gained = b.totalXp - a.totalXp;
  const name = currentSeason(after)?.pingName ?? 'Ping';
  const added = b.entries.filter((e) => !a.byEventId.has(e.event.id));
  const labels = new Set(added.flatMap((e) => e.parts.map((p) => p.label)));
  const now = performance.now();

  const kind = reactionFor(added.map((e) => e.event.type));
  if (kind) reactions.push({ kind, start: now });
  const leveled = b.level.level > a.level.level;
  if (leveled || labels.has('Welcome back') || (!a.hasOutreach && b.hasOutreach)) reactions.push({ kind: 'burst', start: now });

  const today = todayISO();
  const streakBefore = streakInfo(before, id, today).current, streakAfter = streakInfo(after, id, today).current;
  if (!a.hasOutreach && b.hasOutreach) {
    toast(`+${gained} XP · The egg hatched! Say hello to ${name}.`, 'xp');
  } else if (labels.has('Welcome back')) {
    toast(`+${gained} XP · ${name} woke up! Welcome back.`, 'xp');
  } else if (streakAfter > streakBefore && streakAfter % 7 === 0) {
    toast(`+${gained} XP · ${streakAfter}-day streak! XP bonus is now +${Math.round((streakMultiplier(streakAfter) - 1) * 100)}%.`, 'xp');
  } else if (leveled) {
    const grew = lifeStageForLevel(b.level.level) !== lifeStageForLevel(a.level.level);
    toast(`+${gained} XP · Level ${b.level.level}: ${titleForLevel(b.level.level)}!${grew ? ` ${name} grew up!` : ''}`, 'xp');
  } else if (gained > 0) {
    toast(`+${gained} XP`, 'xp');
  } else {
    toast('Logged.');
  }

  // Follow-up toasts for quests, Perfect Days and new trophies.
  const wasDone = new Set(a.quests.filter((q) => q.completed).map((q) => q.id));
  const newlyDone = b.quests.filter((q) => q.completed && !wasDone.has(q.id));
  if (newlyDone.length) {
    queueToast(`Quest complete: ${newlyDone.map((q) => `${q.title} (+${q.reward} XP)`).join(', ')}`, 'xp');
  }
  if (b.perfectDays.size > a.perfectDays.size) {
    queueToast(`⭐ Perfect Day! +${PERFECT_DAY_XP} XP, and Momentum boosts tomorrow’s results.`, 'xp');
    reactions.push({ kind: 'burst', start: now + 400 });
  }
  const had = new Set(achievements(before).filter((x) => x.unlockedOn).map((x) => x.id));
  for (const t of achievements(after).filter((x) => x.unlockedOn && !had.has(x.id))) queueToast(`${t.icon} Trophy unlocked: ${t.title}`, 'xp');
}

// Toasts show one at a time; extra ones wait their turn.
const toastQueue: { message: string; tone: 'info' | 'xp' | 'error' }[] = [];
let toastTimer = 0;
function toast(message: string, tone: 'info' | 'xp' | 'error' = 'info'): void {
  showToast(message, tone);
}
function queueToast(message: string, tone: 'info' | 'xp' | 'error' = 'info'): void {
  toastQueue.push({ message, tone });
}
function showToast(message: string, tone: 'info' | 'xp' | 'error'): void {
  toastEl.textContent = message;
  toastEl.className = `toast show toast-${tone}`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    const next = toastQueue.shift();
    if (next) showToast(next.message, next.tone);
    else toastEl.className = 'toast';
  }, tone === 'error' ? 6000 : 2800);
}

function currentRoute(): Route {
  const hash = location.hash.replace('#', '') as Route;
  if (!currentSeason(state)) return hash === 'data' ? 'data' : 'season';
  return ROUTES.includes(hash) ? hash : 'home';
}

function render(): void {
  checkIn();
  const route = currentRoute();
  const season = currentSeason(state);
  const summary = seasonSummary(state);
  document.getElementById('season-label')!.textContent = season?.name ?? '';
  const streak = careNow(state)?.streak.current ?? 0;
  document.getElementById('level-chip')!.innerHTML = summary
    ? `${streak ? `<b class="chip-streak" title="Outreach streak">🔥 ${streak}</b>` : ''}<span>LV ${summary.level.level}</span> ${esc(titleForLevel(summary.level.level))}`
    : '';
  document.querySelectorAll<HTMLAnchorElement>('[data-tab]').forEach((a) => {
    a.toggleAttribute('aria-current', a.dataset.tab === route);
    a.classList.toggle('disabled', !season && a.dataset.tab !== 'season' && a.dataset.tab !== 'data');
  });

  const root = document.createElement('div');
  switch (route) {
    case 'home':
      root.innerHTML = renderHome(ctx);
      bindHome(root, ctx);
      break;
    case 'pipeline':
      root.innerHTML = renderPipeline(ctx);
      bindPipeline(root, ctx, render);
      break;
    case 'quests':
      root.innerHTML = renderQuests(ctx);
      bindQuests(root, ctx);
      break;
    case 'trophies':
      root.innerHTML = renderTrophies(ctx);
      break;
    case 'season':
      root.innerHTML = renderSeason(ctx);
      bindSeason(root, ctx);
      break;
    case 'data':
      root.innerHTML = renderData(ctx);
      bindData(root, ctx);
      break;
  }
  view.replaceChildren(root);
}

// ─── Ping animation on the home screen ─────────────────────────────────────

let lastKey = '';
let lastFrame: PingFrame | null = null;
let reactions: Reaction[] = [];
const start = performance.now();

function paintRoom(c: CanvasRenderingContext2D, scale: number): void {
  const size = PING_CANVAS * scale;
  c.fillStyle = roomColors.wall;
  c.fillRect(0, 0, size, size);
  c.fillStyle = roomColors.wallDot;
  const step = 6 * PIXEL_DENSITY;
  for (let y = 2 * PIXEL_DENSITY, row = 0; y < GROUND; y += step, row++) {
    for (let x = row % 2 ? step / 2 : 1; x < PING_CANVAS; x += step) c.fillRect(x * scale, y * scale, scale, scale);
  }
  c.fillStyle = roomColors.floor;
  c.fillRect(0, GROUND * scale, size, (PING_CANVAS - GROUND) * scale);
  c.fillStyle = roomColors.floorLine;
  c.fillRect(0, GROUND * scale, size, PIXEL_DENSITY * scale);
}

function animate(now: number): void {
  reactions = reactions.filter((r) => isActive(r, now));
  const canvas = document.getElementById('ping-canvas') as HTMLCanvasElement | null;
  const base = canvas ? currentGenome(ctx) : null;
  if (canvas && base) {
    const time = (now - start) / 1000;
    const reacting = reactions.length > 0 && base.lifeStage !== 'egg';
    const genome = reacting ? { ...base, mood: 'happy' as const } : base;
    const key = JSON.stringify([genome, Math.floor(time * 10)]);
    // While a reaction plays, repaint every frame; otherwise only when the 10 fps frame changes.
    if (reacting || key !== lastKey || canvas.dataset.painted !== key) {
      if (key !== lastKey || !lastFrame) lastFrame = renderPing(genome, { time });
      lastKey = key;
      const c = canvas.getContext('2d')!;
      const scale = canvas.width / PING_CANVAS;
      const { dx, dy } = pingOffset(reactions, now);
      paintRoom(c, scale);
      drawFrame(c, lastFrame, scale, dx * scale, dy * scale);
      drawReactions(c, reactions, now, scale);
      canvas.dataset.painted = reacting ? '' : key;
    }
  }
  requestAnimationFrame(animate);
}

/** Checking in once a day restores Ping's energy (GDD §4.5). */
function checkIn(): void {
  const today = todayISO();
  if (!state.currentSeasonId || state.checkins.includes(today)) return;
  state = { ...state, checkins: [...state.checkins, today].slice(-400) };
  saving = saving.then(() => saveState(state)).catch(() => undefined);
}

// ─── Boot ──────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  state = await loadState();
  requestPersistence();
  window.addEventListener('hashchange', () => {
    render();
    view.focus({ preventScroll: true });
  });
  // Refresh "today" views (and check in) when the tab comes back, e.g. after midnight.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || dialog.open) return;
    render();
  });
  render();
  requestAnimationFrame(animate);
}

boot();
