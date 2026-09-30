// OutreachXP game shell: loads and saves state, routes between views, and animates Ping.

import { computeSeason } from '../game/engine';
import { lifeStageForLevel, titleForLevel } from '../game/rules';
import { loadState, requestPersistence, saveState } from '../game/storage';
import type { GameState } from '../game/types';
import { drawFrame, GROUND, PING_CANVAS, PIXEL_DENSITY, renderPing, type PingFrame } from '../ping/render';
import { roomColors } from '../theme';
import { currentSeason, esc, seasonSummary, type AppContext, type QuickLogOptions } from './context';
import { openQuickLog } from './quicklog';
import { bindData, renderData } from './views/data';
import { bindHome, currentGenome, renderHome } from './views/home';
import { bindPipeline, renderPipeline } from './views/pipeline';
import { bindSeason, renderSeason } from './views/season';

type Route = 'home' | 'pipeline' | 'season' | 'data';
const ROUTES: Route[] = ['home', 'pipeline', 'season', 'data'];

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
  if (!a.hasOutreach && b.hasOutreach) {
    toast(`+${gained} XP · The egg hatched! Say hello to ${name}.`, 'xp');
  } else if (b.level.level > a.level.level) {
    const grew = lifeStageForLevel(b.level.level) !== lifeStageForLevel(a.level.level);
    toast(`+${gained} XP · Level ${b.level.level}: ${titleForLevel(b.level.level)}!${grew ? ` ${name} grew up!` : ''}`, 'xp');
  } else if (gained > 0) {
    toast(`+${gained} XP`, 'xp');
  } else {
    toast('Logged.');
  }
}

let toastTimer = 0;
function toast(message: string, tone: 'info' | 'xp' | 'error' = 'info'): void {
  toastEl.textContent = message;
  toastEl.className = `toast show toast-${tone}`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.className = 'toast'), tone === 'error' ? 6000 : 3500);
}

function currentRoute(): Route {
  const hash = location.hash.replace('#', '') as Route;
  if (!currentSeason(state)) return hash === 'data' ? 'data' : 'season';
  return ROUTES.includes(hash) ? hash : 'home';
}

function render(): void {
  const route = currentRoute();
  const season = currentSeason(state);
  const summary = seasonSummary(state);
  document.getElementById('season-label')!.textContent = season?.name ?? '';
  document.getElementById('level-chip')!.innerHTML = summary
    ? `<span>LV ${summary.level.level}</span> ${esc(titleForLevel(summary.level.level))}`
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
  const canvas = document.getElementById('ping-canvas') as HTMLCanvasElement | null;
  const genome = canvas ? currentGenome(ctx) : null;
  if (canvas && genome) {
    const time = (now - start) / 1000;
    const key = JSON.stringify([genome, Math.floor(time * 10)]);
    if (key !== lastKey || canvas.dataset.painted !== key) {
      lastKey = key;
      lastFrame = renderPing(genome, { time });
      const c = canvas.getContext('2d')!;
      const scale = canvas.width / PING_CANVAS;
      paintRoom(c, scale);
      drawFrame(c, lastFrame, scale);
      canvas.dataset.painted = key;
    }
  }
  requestAnimationFrame(animate);
}

// ─── Boot ──────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  state = await loadState();
  requestPersistence();
  window.addEventListener('hashchange', () => {
    render();
    view.focus({ preventScroll: true });
  });
  // Refresh "today" views when the tab comes back after midnight.
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && !dialog.open && render());
  render();
  requestAnimationFrame(animate);
}

boot();
