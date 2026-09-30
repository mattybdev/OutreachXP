// Ping Lab: a tuning page for the procedural Ping generator (GDD §9.4).

import { roomColors, statAccent } from '../theme';
import {
  FORM_NAMES,
  LIFE_STAGES,
  MOODS,
  rawTier,
  resolveForm,
  STAGE_TIER_CAP,
  STATS,
  TIER_THRESHOLDS,
  visibleTier,
  type Form,
  type LifeStage,
  type Mood,
  type PingGenome,
  type Stats,
} from '../ping/genome';
import { drawFrame, GROUND, PING_CANVAS, PIXEL_DENSITY, renderPing, type PingFrame } from '../ping/render';

const STAT_LABELS: Record<keyof Stats, string> = {
  intellect: 'Intellect',
  craft: 'Craft',
  heart: 'Heart',
  authority: 'Authority',
};
const STAT_CATEGORY: Record<keyof Stats, string> = {
  intellect: 'Academia',
  craft: 'Industry',
  heart: 'Organizations',
  authority: 'Government',
};
const MAX_POINTS = 600;
const STAGE_SCALE = 3;
const STORAGE_KEY = 'outreachxp.pinglab.v1';

interface LabState {
  genome: PingGenome;
  formOverride: Form | 'auto';
  animate: boolean;
  morph: boolean;
  dither: boolean;
  room: boolean;
  varietyMode: 'seeds' | 'random';
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const state: LabState = loadState() ?? {
  genome: { seed: randomSeed(), lifeStage: 'kid', mood: 'happy', stats: { intellect: 70, craft: 40, heart: 30, authority: 20 } },
  formOverride: 'auto',
  animate: true,
  morph: true,
  dither: false,
  room: true,
  varietyMode: 'seeds',
};

/** Stats currently drawn; they ease toward state.genome.stats when morphing. */
const shown: Stats = { ...state.genome.stats };
let varietySeeds: { seed: number; stats: Stats }[] = [];

// ─── Controls ──────────────────────────────────────────────────────────────

const statInputs = {} as Record<keyof Stats, { range: HTMLInputElement; num: HTMLInputElement; tier: HTMLElement }>;

function buildStatControls(): void {
  const host = $('stat-controls');
  for (const stat of STATS) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <label for="range-${stat}"><i class="swatch" style="background:${statAccent[stat]}"></i>${STAT_LABELS[stat]}</label>
      <input id="range-${stat}" type="range" min="0" max="${MAX_POINTS}" step="1" />
      <input type="number" min="0" max="${MAX_POINTS}" step="1" aria-label="${STAT_LABELS[stat]} points" />
      <div class="tier"></div>`;
    host.append(row);
    const range = row.querySelector<HTMLInputElement>('input[type=range]')!;
    const num = row.querySelector<HTMLInputElement>('input[type=number]')!;
    const tier = row.querySelector<HTMLElement>('.tier')!;
    statInputs[stat] = { range, num, tier };
    const set = (value: number) => {
      state.genome.stats[stat] = clamp(Math.round(value || 0), 0, MAX_POINTS);
      if (!state.morph) shown[stat] = state.genome.stats[stat];
      syncControls();
    };
    range.addEventListener('input', () => set(range.valueAsNumber));
    num.addEventListener('change', () => set(num.valueAsNumber));
  }
}

function buildSegmented<T extends string>(hostId: string, options: readonly T[], onPick: (v: T) => void): void {
  const host = $(hostId);
  host.innerHTML = '';
  for (const option of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.value = option;
    b.textContent = option;
    b.addEventListener('click', () => {
      onPick(option);
      syncControls();
    });
    host.append(b);
  }
}

function syncSegmented(hostId: string, value: string): void {
  $(hostId).querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === value)));
}

const PRESETS: { name: string; genome: Partial<PingGenome> & { stats: Stats } }[] = [
  { name: 'Fresh hatch', genome: { lifeStage: 'egg', stats: { intellect: 0, craft: 0, heart: 0, authority: 0 } } },
  { name: 'Week 1', genome: { lifeStage: 'baby', stats: { intellect: 12, craft: 8, heart: 5, authority: 3 } } },
  { name: 'Academia lead', genome: { lifeStage: 'teen', stats: { intellect: 260, craft: 60, heart: 50, authority: 30 } } },
  { name: 'Industry lead', genome: { lifeStage: 'adult', stats: { intellect: 60, craft: 320, heart: 70, authority: 40 } } },
  { name: 'Community lead', genome: { lifeStage: 'adult', stats: { intellect: 70, craft: 40, heart: 300, authority: 60 } } },
  { name: 'Government lead', genome: { lifeStage: 'adult', stats: { intellect: 50, craft: 60, heart: 40, authority: 320 } } },
  { name: 'Balanced', genome: { lifeStage: 'adult', stats: { intellect: 160, craft: 150, heart: 140, authority: 150 } } },
  { name: 'Legend', genome: { lifeStage: 'legend', stats: { intellect: 560, craft: 520, heart: 540, authority: 500 } } },
];

function buildPresets(): void {
  const host = $('presets');
  for (const preset of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secondary';
    b.textContent = preset.name;
    b.addEventListener('click', () => {
      Object.assign(state.genome, { ...preset.genome, stats: { ...preset.genome.stats } });
      state.formOverride = 'auto';
      if (!state.morph) Object.assign(shown, state.genome.stats);
      syncControls();
    });
    host.append(b);
  }
  const random = document.createElement('button');
  random.type = 'button';
  random.className = 'btn btn-primary';
  random.textContent = 'Random';
  random.addEventListener('click', () => {
    state.genome.stats = randomStats();
    state.genome.lifeStage = LIFE_STAGES[1 + Math.floor(Math.random() * (LIFE_STAGES.length - 1))];
    state.genome.mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    state.genome.seed = randomSeed();
    if (!state.morph) Object.assign(shown, state.genome.stats);
    syncControls();
  });
  host.append(random);
}

function buildControls(): void {
  buildStatControls();
  buildSegmented('stage-controls', LIFE_STAGES, (v: LifeStage) => (state.genome.lifeStage = v));
  buildSegmented('mood-controls', MOODS, (v: Mood) => (state.genome.mood = v));
  buildSegmented('variety-mode', ['seeds', 'random'] as const, (v) => {
    state.varietyMode = v;
    rerollVariety();
  });
  $('variety-mode').querySelectorAll('button').forEach((b) => {
    b.textContent = b.dataset.value === 'seeds' ? 'Same stats, new seeds' : 'Random stats';
  });

  const formSelect = $<HTMLSelectElement>('form-select');
  formSelect.innerHTML = `<option value="auto">Auto (from stats)</option>` +
    (Object.keys(FORM_NAMES) as Form[]).map((f) => `<option value="${f}">${FORM_NAMES[f]}</option>`).join('');
  formSelect.addEventListener('change', () => {
    state.formOverride = formSelect.value as Form | 'auto';
    syncControls();
  });

  const seedInput = $<HTMLInputElement>('seed-input');
  seedInput.addEventListener('change', () => {
    state.genome.seed = Math.max(0, Math.floor(seedInput.valueAsNumber || 0));
    syncControls();
  });
  $('new-seed').addEventListener('click', () => {
    state.genome.seed = randomSeed();
    syncControls();
  });

  const toggles: [string, keyof LabState][] = [
    ['opt-animate', 'animate'],
    ['opt-morph', 'morph'],
    ['opt-dither', 'dither'],
    ['opt-room', 'room'],
  ];
  for (const [id, key] of toggles) {
    const box = $<HTMLInputElement>(id);
    box.checked = state[key] as boolean;
    box.addEventListener('change', () => {
      (state as unknown as Record<string, boolean>)[key] = box.checked;
      if (key === 'morph' && !box.checked) Object.assign(shown, state.genome.stats);
      syncControls();
    });
  }

  buildPresets();
  $('reroll').addEventListener('click', rerollVariety);
  $('export-png').addEventListener('click', exportPng);
  $('export-sheet').addEventListener('click', exportSheet);
  $('copy-genome').addEventListener('click', copyGenome);
}

function syncControls(): void {
  const { genome } = state;
  for (const stat of STATS) {
    const { range, num, tier } = statInputs[stat];
    range.value = String(genome.stats[stat]);
    num.value = String(genome.stats[stat]);
    const raw = rawTier(genome.stats[stat]);
    const vis = visibleTier(genome.stats[stat], genome.lifeStage);
    const next = TIER_THRESHOLDS[raw + 1];
    tier.textContent = `${STAT_CATEGORY[stat]} · Tier ${raw}${vis < raw ? ` (shows ${vis} at this stage)` : ''}` +
      (next !== undefined ? ` · ${next - genome.stats[stat]} pts to Tier ${raw + 1}` : ' · max tier');
  }
  syncSegmented('stage-controls', genome.lifeStage);
  syncSegmented('mood-controls', genome.mood);
  syncSegmented('variety-mode', state.varietyMode);
  $<HTMLSelectElement>('form-select').value = state.formOverride;
  $<HTMLInputElement>('seed-input').value = String(genome.seed);

  const form = currentForm(genome.stats);
  $('form-name').textContent = FORM_NAMES[form];
  const autoNote = state.formOverride === 'auto' ? (form === 'none' ? 'Forms unlock at Teen' : 'Form from stat balance') : 'Form overridden';
  $('form-meta').textContent = `${capitalize(genome.lifeStage)} · ${capitalize(genome.mood)} · ${autoNote} · Tier cap ${STAGE_TIER_CAP[genome.lifeStage]}`;
  renderTierBars();
  saveState();
  if (state.varietyMode === 'seeds') renderVariety();
}

function renderTierBars(): void {
  const total = STATS.reduce((sum, s) => sum + state.genome.stats[s], 0) || 1;
  $('tier-bars').innerHTML = STATS.map((stat) => {
    const pts = state.genome.stats[stat];
    const pct = Math.min(100, (pts / TIER_THRESHOLDS[5]) * 100);
    return `<div class="tier-bar" title="${STAT_LABELS[stat]}: ${pts} pts, ${Math.round((pts / total) * 100)}% of total">
      <span>${STAT_LABELS[stat]}</span>
      <div class="track"><div class="fill" style="width:${pct}%;background:${statAccent[stat]}"></div><div class="ticks">${'<i></i>'.repeat(5)}</div></div>
      <span>${Math.round((pts / total) * 100)}%</span>
    </div>`;
  }).join('');
}

function currentForm(stats: Stats): Form {
  return state.formOverride === 'auto' ? resolveForm(stats, state.genome.lifeStage) : state.formOverride;
}

// ─── Rendering ─────────────────────────────────────────────────────────────

const stage = $<HTMLCanvasElement>('stage');
const ctx = stage.getContext('2d')!;
let lastTime = performance.now();
const startTime = lastTime;
let frozenTime = 0;
let lastKey = '';
let lastFrame: PingFrame | null = null;

function tick(now: number): void {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (state.morph) {
    for (const stat of STATS) {
      const target = state.genome.stats[stat];
      const diff = target - shown[stat];
      shown[stat] = Math.abs(diff) < 0.5 ? target : shown[stat] + diff * Math.min(1, dt * 4);
    }
  }
  const time = state.animate ? (now - startTime) / 1000 : frozenTime;
  if (state.animate) frozenTime = time;
  const genome: PingGenome = { ...state.genome, stats: { ...shown }, form: currentForm(state.genome.stats) };
  // Animation runs at 10 fps, so only regenerate when something visible changed.
  const key = JSON.stringify([genome, Math.floor(time * 10), state.dither, state.room]);
  if (key !== lastKey) {
    lastKey = key;
    lastFrame = renderPing(genome, { time, dither: state.dither });
  }
  const frame = lastFrame!;
  paintRoom(ctx, STAGE_SCALE, state.room);
  drawFrame(ctx, frame, STAGE_SCALE);
  requestAnimationFrame(tick);
}

function paintRoom(c: CanvasRenderingContext2D, scale: number, room: boolean): void {
  const size = PING_CANVAS * scale;
  c.clearRect(0, 0, size, size);
  if (!room) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, size, size);
    return;
  }
  c.fillStyle = roomColors.wall;
  c.fillRect(0, 0, size, size);
  const step = 6 * PIXEL_DENSITY;
  c.fillStyle = roomColors.wallDot;
  for (let y = 2 * PIXEL_DENSITY, row = 0; y < GROUND; y += step, row++) {
    for (let x = row % 2 ? step / 2 : 1; x < PING_CANVAS; x += step) c.fillRect(x * scale, y * scale, scale, scale);
  }
  c.fillStyle = roomColors.floor;
  c.fillRect(0, GROUND * scale, size, (PING_CANVAS - GROUND) * scale);
  c.fillStyle = roomColors.floorLine;
  c.fillRect(0, GROUND * scale, size, PIXEL_DENSITY * scale);
}

// ─── Variety grid ──────────────────────────────────────────────────────────

function rerollVariety(): void {
  varietySeeds = Array.from({ length: 12 }, () => ({ seed: randomSeed(), stats: randomStats() }));
  renderVariety();
}

function renderVariety(): void {
  const grid = $('variety-grid');
  grid.innerHTML = '';
  for (const item of varietySeeds) {
    const stats = state.varietyMode === 'seeds' ? state.genome.stats : item.stats;
    const genome: PingGenome = { seed: item.seed, lifeStage: state.genome.lifeStage, mood: state.genome.mood, stats: { ...stats } };
    const lifeStage = genome.lifeStage;
    const button = document.createElement('button');
    button.type = 'button';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = PING_CANVAS;
    const c = canvas.getContext('2d')!;
    paintRoom(c, 1, state.room);
    drawFrame(c, renderPing(genome, { dither: state.dither }), 1);
    const label = document.createElement('span');
    label.textContent = `${FORM_NAMES[resolveForm(stats, lifeStage)]} · #${item.seed}`;
    button.append(canvas, label);
    button.setAttribute('aria-label', `Load ${label.textContent}`);
    button.addEventListener('click', () => {
      state.genome.seed = item.seed;
      state.genome.stats = { ...stats };
      state.formOverride = 'auto';
      if (!state.morph) Object.assign(shown, stats);
      syncControls();
    });
    grid.append(button);
  }
}

// ─── Export ────────────────────────────────────────────────────────────────

function currentGenome(): PingGenome {
  return { ...state.genome, stats: { ...state.genome.stats }, form: currentForm(state.genome.stats) };
}

function exportPng(): void {
  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PING_CANVAS * scale;
  const c = canvas.getContext('2d')!;
  if (state.room) paintRoom(c, scale, true);
  drawFrame(c, renderPing(currentGenome(), { time: frozenTime, dither: state.dither }), scale);
  download(canvas, `ping-${state.genome.seed}.png`);
}

function exportSheet(): void {
  const scale = 2, frames = 20;
  const canvas = document.createElement('canvas');
  canvas.width = PING_CANVAS * scale * frames;
  canvas.height = PING_CANVAS * scale;
  const c = canvas.getContext('2d')!;
  for (let i = 0; i < frames; i++) {
    drawFrame(c, renderPing(currentGenome(), { time: i / 10, dither: state.dither }), scale, i * PING_CANVAS * scale, 0);
  }
  download(canvas, `ping-${state.genome.seed}-sheet.png`);
  toast(`Sprite sheet: ${frames} frames at 10 fps, ${PING_CANVAS * scale}px each.`);
}

async function copyGenome(): Promise<void> {
  const json = JSON.stringify(currentGenome(), null, 2);
  try {
    await navigator.clipboard.writeText(json);
    toast('Genome copied to clipboard.');
  } catch {
    toast(json);
  }
}

function download(canvas: HTMLCanvasElement, name: string): void {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
}

let toastTimer = 0;
function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.textContent = ''), 4000);
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function randomSeed(): number {
  return Math.floor(Math.random() * 1e6);
}

function randomStats(): Stats {
  const stats = {} as Stats;
  for (const stat of STATS) stats[stat] = Math.round(Math.random() ** 1.6 * 520);
  return stats;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the lab works without it.
  }
}

function loadState(): LabState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LabState;
    return parsed?.genome?.stats && STATS.every((s) => typeof parsed.genome.stats[s] === 'number') ? parsed : null;
  } catch {
    return null;
  }
}

buildControls();
rerollVariety();
syncControls();
requestAnimationFrame(tick);
