// Procedural Pip renderer (GDD §9.4). Same genome + same time → same pixels.

import { outlineColor, ramps } from '../theme';
import {
  effectivePoints,
  formStats,
  growth,
  resolveForm,
  STATS,
  visibleTier,
  type Form,
  type LifeStage,
  type PipGenome,
  type Stat,
} from './genome';
import { blob, capsule, ellipse, heart, PixelCanvas, rect, shield, triangle, type Shape } from './raster';
import { deriveTraits, mulberry32, type Traits } from './traits';

export const PIP_CANVAS = 64;
const GROUND = 58;
const FPS = 10;

/** Body height in pixels per life stage (legs, brain and accessories add to this). */
const BODY_HEIGHT: Record<LifeStage, number> = { egg: 0, baby: 15, kid: 20, teen: 24, adult: 27, legend: 27 };

export interface RenderOptions {
  /** Seconds; animation is quantized to 10 fps for a crisp pixel feel. */
  time?: number;
  dither?: boolean;
}

export interface PipFrame {
  width: number;
  height: number;
  pixels: (string | null)[];
  form: Form;
}

interface Tweaks {
  headBoost: number;
  armThick: number;
  bodyWide: number;
  legMul: number;
  blush: number;
}

const STAT_TWEAKS: Record<Stat, Partial<Tweaks>> = {
  intellect: { headBoost: 0.1 },
  craft: { armThick: 0.3 },
  heart: { bodyWide: 0.07, blush: 1 },
  authority: { legMul: 0.25 },
};

/** Forms add a signature look from their primary stat and body tweaks from their stats (GDD §4.4). */
function formStyle(form: Form, genome: PipGenome) {
  const tweaks: Tweaks = { headBoost: 0, armThick: 0, bodyWide: 0, legMul: 0, blush: 0 };
  const stats = formStats(form).sort((a, b) => genome.stats[b] - genome.stats[a]);
  const strength = stats.length > 1 ? 0.6 : 1;
  for (const stat of stats) {
    for (const [key, value] of Object.entries(STAT_TWEAKS[stat])) tweaks[key as keyof Tweaks] += value * strength;
  }
  return { tweaks, signature: (stats[0] ?? null) as Stat | null, polymath: form === 'polymath' };
}

export function renderPip(genome: PipGenome, opts: RenderOptions = {}): PipFrame {
  const canvas = new PixelCanvas(PIP_CANVAS, PIP_CANVAS);
  const frameIndex = Math.floor((opts.time ?? 0) * FPS);
  const t = frameIndex / FPS;
  const traits = deriveTraits(genome.seed);
  const form = genome.form ?? resolveForm(genome.stats, genome.lifeStage);

  if (genome.lifeStage === 'egg') {
    drawEgg(canvas, traits, t);
  } else {
    drawCreature(canvas, genome, form, traits, t, frameIndex, !!opts.dither);
  }
  return { width: canvas.width, height: canvas.height, pixels: canvas.color, form };
}

// ─── Egg ───────────────────────────────────────────────────────────────────

function drawEgg(c: PixelCanvas, traits: Traits, t: number): void {
  const wobble = (t + traits.bobPhase) % 3 < 0.4 ? (Math.floor(t * FPS) % 2 ? 1 : -1) : 0;
  const cx = 32 + wobble;
  const cy = GROUND - 9;
  const egg = c.newPart({ outline: true });
  c.fill(blob(cx, cy, 8.5, 11, 9, 2), ramps.paper, egg, { thresholds: [-0.25, 0.3, 0.9] });
  // Envelope flap.
  c.line(cx - 7, cy - 3, cx - 1, cy + 2, ramps.neutral[5], -1, true);
  c.line(cx + 6, cy - 3, cx, cy + 2, ramps.neutral[5], -1, true);
  const seal = c.newPart({ outline: false });
  c.fill(ellipse(cx, cy + 2.5, 2.3, 2.3), ramps.heart, seal);
  const rand = mulberry32(traits.foldSeed);
  for (let i = 0; i < 2; i++) c.paint(cx - 5 + Math.floor(rand() * 10), cy - 8 + Math.floor(rand() * 4), ramps.orange[4]);
  c.outline(outlineColor);
}

// ─── Creature ──────────────────────────────────────────────────────────────

function drawCreature(
  c: PixelCanvas,
  genome: PipGenome,
  form: Form,
  traits: Traits,
  t: number,
  frameIndex: number,
  dither: boolean,
): void {
  const stage = genome.lifeStage;
  const mood = genome.mood;
  const g = {} as Record<Stat, number>;
  const tier = {} as Record<Stat, number>;
  for (const stat of STATS) {
    g[stat] = growth(effectivePoints(genome.stats[stat], stage));
    tier[stat] = visibleTier(genome.stats[stat], stage);
  }
  const { tweaks, signature, polymath } = formStyle(form, genome);
  const H = BODY_HEIGHT[stage];
  const s = H / 27;
  const fillOpts = { dither };

  // ── Animation ──
  const speed = mood === 'sleepy' ? 0.25 : 0.5;
  const bob = mood === 'sad' ? 0 : Math.sin(t * Math.PI * 2 * speed * traits.bobSpeed + traits.bobPhase) > 0.35 ? 1 : 0;
  const hopping = (traits.quirk === 'hop' || mood === 'happy') && mood !== 'sleepy' && (t + traits.bobPhase) % 4 < 0.3;
  const lift = hopping ? 2 : 0;
  const sway = traits.quirk === 'sway' ? Math.round(Math.sin(t * 1.3 + traits.bobPhase) * 0.6) : 0;
  const breathe = 1 + 0.02 * Math.sin(t * Math.PI * 2 * 0.4);
  const blinking = (t + traits.bobPhase) % traits.blinkEvery < 0.15;
  const beat = tier.heart >= 3 ? Math.max(0, Math.sin(t * Math.PI * 2 * 1.1)) ** 8 : 0;

  // ── Layout ──
  const cx = 32 + sway;
  const rx = H * 0.56 * traits.squish * (1 + tweaks.bodyWide);
  const ryTop = H * 0.55 * (1 + tweaks.headBoost + 0.12 * g.intellect) * (mood === 'sad' ? 0.95 : 1) * breathe;
  const ryBottom = H * 0.45;
  const legLen = s * (0.5 + 5 * g.authority) * (1 + tweaks.legMul);
  const footRx = Math.max(1.4, s * (1.6 + 0.9 * g.authority));
  const footRy = Math.max(1, s * 1.1);
  const plinthH = tier.authority >= 4 ? 3 : 0;
  const footY = GROUND - plinthH - footRy - lift;
  const cy = footY - legLen - ryBottom - bob;
  const top = cy - ryTop;
  const stanceX = rx * (0.32 + 0.18 * g.authority);

  const eyeBase = Math.max(1.6, s * 2.5);
  const eyeRx = eyeBase * (traits.eyeStyle === 'wide' ? 1.2 : traits.eyeStyle === 'tall' ? 0.9 : 1);
  const eyeRy = eyeBase * (traits.eyeStyle === 'tall' ? 1.3 : 1);
  const eyeY = cy - ryTop * 0.3;
  const eyeDx = rx * 0.36 * traits.eyeSpacing;
  const mouthY = Math.round(eyeY + eyeRy + Math.max(1.5, s * 1.8));
  const heartR = s * (2.1 + 2.8 * g.heart) * (1 + 0.15 * beat);
  const heartCy = cy + ryBottom * 0.5;

  const brainRx = rx * (0.4 + 0.25 * g.intellect);
  const brainRy = brainRx * 0.7;
  const brainCy = top + brainRy * 0.5;
  const showBrain = tier.intellect >= 2;
  const headTop = showBrain ? brainCy - brainRy : top;

  // ── Heart aura (behind everything) ──
  if (tier.heart >= 5) {
    const aura = c.newPart();
    const pulse = frameIndex % 10 < 5 ? 0 : 1;
    const shape = ellipse(cx, cy, rx + 4 + pulse, (ryTop + ryBottom) / 2 + 5 + pulse);
    forEachPixel(shape, (x, y) => {
      if ((x + y) % 2 === 0) c.plot(x, y, (x + y) % 4 === 0 ? ramps.heartAccent[2] : ramps.heartAccent[3], aura);
    });
  }

  // ── Orbiting items (back half) ──
  const books = tier.intellect >= 5 ? orbit(2, t * 1.4, cx, top - 1, rx + 5, 2.5) : [];
  const tools = tier.craft >= 5 ? orbit(2, t * 1.1 + 1, cx, cy + ryBottom * 0.2, rx + 7, 2) : [];
  books.filter((o) => !o.front).forEach((o) => drawBook(c, o.x, o.y));
  tools.filter((o) => !o.front).forEach((o) => drawTool(c, o.x, o.y, o.index));

  // ── Friends (Heart T4) hop beside Pip ──
  if (tier.heart >= 4) {
    const friends = c.newPart({ outline: true });
    for (const side of [-1, 1]) {
      const fx = cx + side * (rx + 7);
      const fy = GROUND - 2.4 - (Math.sin(t * 4 + side) > 0.6 ? 1 : 0);
      c.fill(ellipse(fx, fy, 2.4, 2.1), ramps.heartAccent, friends);
      c.plot(fx - 0.5 + side * 0.5, fy - 0.5, ramps.neutral[0], friends);
    }
  }

  // ── Plinth (Authority T4) ──
  if (plinthH) {
    const plinth = c.newPart({ outline: true });
    c.fill(rect(cx - rx * 0.95, GROUND - plinthH, rx * 1.9, plinthH - 0.01), ramps.steel, plinth, { thresholds: [-0.6, 0.2, 0.55] });
  }

  // ── Legs and feet ──
  const legs = c.newPart({ outline: true, innerOutline: true });
  const legR = Math.max(1.2, s * (1.3 + 0.9 * g.authority));
  for (const side of [-1, 1]) {
    const lx = cx + side * stanceX;
    if (legLen > 1.5) c.fill(capsule(lx, cy + ryBottom * 0.6, lx, footY, legR), ramps.body, legs, fillOpts);
    c.fill(ellipse(lx + side * 0.4, footY, footRx, footRy), ramps.body, legs, fillOpts);
  }

  // ── Ears ──
  drawEars(c, traits, cx, top, rx, ryTop, s, t, fillOpts);

  // ── Body ──
  const body = c.newPart({ outline: true, innerOutline: true });
  c.fill(blob(cx, cy, rx, ryTop, ryBottom), ramps.body, body, { ...fillOpts, thresholds: [-0.1, 0.62, 0.985] });
  const onBody = (x: number, y: number) => c.partAt(x, y) === body;

  // ── Clothing and marks (clipped to the body) ──
  if (signature === 'intellect') {
    const robe = c.newPart({ outline: true });
    const robeTop = Math.round(cy + ryBottom * 0.25);
    c.fill(blob(cx, cy, rx, ryTop, ryBottom), ramps.intellect, robe, { ...fillOpts, clip: (x, y) => y >= robeTop && onBody(x, y) });
    for (let x = 0; x < c.width; x++) if (c.partAt(x, robeTop) === robe) c.paint(x, robeTop, ramps.intellect[3]);
  }
  if (signature === 'craft') {
    const apron = c.newPart({ outline: true });
    const apronTop = mouthY + 1;
    c.fill(rect(cx - rx * 0.45, apronTop, rx * 0.9, ryBottom * 2), ramps.craft, apron, { clip: onBody });
    for (const side of [-1, 1]) c.line(cx + side * rx * 0.4, apronTop, cx + side * rx * 0.72, eyeY + eyeRy, ramps.craft[1], -1, true);
  }
  if (tier.craft >= 3) {
    const belt = c.newPart({ outline: true });
    const beltY = cy + ryBottom * 0.7;
    const beltH = Math.max(2, s * 2.2);
    c.fill(rect(cx - rx, beltY, rx * 2, beltH), ramps.steel, belt, { clip: (x, y) => onBody(x, y) || c.partAt(x, y) > body });
    c.fill(rect(cx - 1.2, beltY, 2.4, beltH), ramps.orange.slice(1, 4), belt);
  }
  const hasSash = tier.authority >= 3 || signature === 'authority';
  const sashA: [number, number] = [cx - rx * 0.8, cy + ryBottom * 0.12];
  const sashB: [number, number] = [cx + rx * 0.8, cy + ryBottom * 0.98];
  if (hasSash) {
    const sash = c.newPart({ outline: true });
    c.fill(capsule(...sashA, ...sashB, Math.max(1, s * 1.2)), ramps.heart, sash, {
      clip: (x, y) => onBody(x, y) || (c.partAt(x, y) > body && c.get(x, y) !== null),
    });
  }
  if (tier.heart >= 2) {
    const heartPart = c.newPart({ outline: true, innerOutline: true });
    c.fill(heart(cx, heartCy, heartR), ramps.heart, heartPart, fillOpts);
  } else {
    // The game's own envelope-seal mark (not the showcase logo).
    const seal = c.newPart();
    c.fill(ellipse(cx, heartCy, Math.max(1.2, s * 1.4), Math.max(1.2, s * 1.4)), ramps.heart.slice(1), seal);
  }
  if (tier.authority === 2 && !hasSash) {
    const cardW = Math.max(3, Math.round(3 * s));
    const cardX = Math.round(cx - rx * 0.5 - cardW / 2);
    const cardY = Math.round(cy + ryBottom * 0.3);
    c.line(cx - rx * 0.4, mouthY + 1, cardX + 1, cardY, ramps.neutral[5], -1, true);
    c.line(cx + rx * 0.1, mouthY + 1, cardX + cardW - 1, cardY, ramps.neutral[5], -1, true);
    const card = c.newPart();
    c.fill(rect(cardX, cardY, cardW - 0.01, cardW + 0.99), ramps.paper, card);
    for (let x = cardX; x < cardX + cardW; x++) c.paint(x, cardY, ramps.orange[2]);
  }
  if (signature === 'heart') {
    const flower = c.newPart({ outline: true });
    const fx = Math.round(cx + rx * 0.62), fy = Math.round(top + 1);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) c.plot(fx + dx, fy + dy, ramps.orange[4], flower);
    c.plot(fx, fy, ramps.orange[2], flower);
  }

  // ── Brain (Intellect T2+) and cap (T4) ──
  if (showBrain) {
    const brain = c.newPart({ outline: true, innerOutline: true });
    c.fill(ellipse(cx, brainCy, brainRx, brainRy), ramps.brain, brain, { ...fillOpts, thresholds: [-0.2, 0.55, 0.95] });
    const onBrain = (x: number, y: number) => c.partAt(x, y) === brain;
    const fold = ramps.brain[0];
    for (let y = Math.floor(brainCy - brainRy + 1); y < brainCy + brainRy * 0.1; y++) if (onBrain(Math.floor(cx), y)) c.paint(cx, y, fold);
    const rand = mulberry32(traits.foldSeed);
    const folds = 2 + Math.round(4 * g.intellect);
    for (let i = 0; i < folds; i++) {
      const side = i % 2 ? 1 : -1;
      const fx = cx + side * (1.5 + rand() * brainRx * 0.55);
      const fy = brainCy - brainRy * 0.5 + rand() * brainRy * 0.9;
      const len = 2 + Math.floor(rand() * 2);
      const dir = rand() < 0.5 ? -1 : 1;
      for (let k = 0; k < len; k++) {
        const x = Math.floor(fx + k * side * 0.8), y = Math.floor(fy + (k % 2) * dir);
        if (onBrain(x, y) && onBrain(x, y - 1) && onBrain(x, y + 1)) c.paint(x, y, fold);
      }
    }
    if (tier.intellect >= 4) {
      const cap = c.newPart({ outline: true, innerOutline: true });
      const brainTop = brainCy - brainRy;
      c.fill(ellipse(cx, brainTop + 1.5, brainRx * 0.62, 2.6), ramps.body, cap, fillOpts);
      c.fill(rect(cx - brainRx * 1.05, brainTop - 1.5, brainRx * 2.1, 1.2), ramps.body, cap, { thresholds: [-0.9, 0.2, 0.95] });
    }
  }

  // ── Arms and hands (Craft) ──
  const arms = c.newPart({ outline: true, innerOutline: true });
  const gauntlet = tier.craft >= 4 ? c.newPart({ outline: true, innerOutline: true }) : -1;
  const armLen = s * (3 + 9 * g.craft);
  const armR = Math.max(1.5, s * (1.3 + 1.2 * g.craft) * (1 + tweaks.armThick));
  const armSwing = Math.round(Math.sin(t * 2 + traits.bobPhase) * 0.5);
  const hands: [number, number][] = [];
  for (const side of [-1, 1]) {
    const sx = cx + side * rx * 0.82;
    const sy = cy + ryBottom * 0.05;
    let hx = sx + side * armLen * 0.5;
    let hy = sy + armLen * 0.85 + armSwing;
    if (mood === 'happy') { hx = sx + side * armLen * 0.75; hy = sy + armLen * 0.35; }
    if (mood === 'sad') { hx = sx + side * armLen * 0.2; hy = sy + armLen; }
    hy = Math.min(hy, footY - 1);
    hands.push([hx, hy]);
    c.fill(capsule(sx, sy, hx, hy, armR), ramps.body, arms, fillOpts);
    c.fill(ellipse(hx, hy, armR * 1.3, armR * 1.3), ramps.body, arms, fillOpts);
    if (gauntlet >= 0) {
      const mx = (sx + hx) / 2, my = (sy + hy) / 2;
      c.fill(capsule(mx, my, hx, hy, armR + 0.4), ramps.steel, gauntlet, fillOpts);
      c.fill(ellipse(hx, hy, armR * 1.35, armR * 1.35), ramps.steel, gauntlet, fillOpts);
    }
  }
  if (tier.craft >= 2) {
    const stylus = c.newPart({ outline: true });
    const [hx, hy] = hands[0];
    const len = 3 + s * 2;
    c.line(hx - 1, hy - 1, hx - 1 - len * 0.6, hy - 1 - len, ramps.orange[2], stylus);
    c.plot(hx - 1 - len * 0.6, hy - 1 - len, ramps.steel[3], stylus);
  }

  // ── Shield (Authority T4) ──
  let shieldBox: { x: number; y: number; w: number; h: number } | null = null;
  if (tier.authority >= 4) {
    const part = c.newPart({ outline: true, innerOutline: true });
    const scx = cx + rx * 0.92, scy = cy + ryBottom * 0.35;
    const halfW = s * (3.4 + 1 * g.authority), halfH = halfW * 1.25;
    shieldBox = { x: scx, y: scy, w: halfW, h: halfH };
    c.fill(shield(scx, scy, halfW, halfH), tier.authority >= 5 ? ramps.authority : ramps.steel, part, fillOpts);
    forEachPixel(shield(scx, scy, halfW, halfH), (x, y) => {
      const u = Math.abs((x + 0.5 - scx) / halfW), v = (y + 0.5 - scy) / halfH;
      if (v > u * 0.7 - 0.3 && v < u * 0.7 + 0.05 && c.partAt(x, y) === part) c.paint(x, y, ramps.orange[2]);
    });
  }

  // ── Orbiting items (front half) and the idea bulb ──
  books.filter((o) => o.front).forEach((o) => drawBook(c, o.x, o.y));
  tools.filter((o) => o.front).forEach((o) => drawTool(c, o.x, o.y, o.index));
  const bulbY = headTop - (tier.intellect >= 4 ? 7 : 5) + (Math.sin(t * 2) > 0 ? 0 : 1);
  if (tier.intellect >= 5) {
    const bulb = c.newPart({ outline: true });
    c.fill(ellipse(cx, bulbY, 2.4, 2.4), [ramps.orange[3], ramps.orange[4], ramps.neutral[8]], bulb);
    c.fill(rect(cx - 1, bulbY + 2, 2, 1.2), ramps.steel, bulb);
  }

  c.outline(outlineColor);

  // ── Face (always drawn last so nothing covers the eyes) ──
  const eyesClosed = blinking || mood === 'sleepy';
  const lookY = mood === 'sad' ? 0.35 : 0.2;
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDx;
    if (eyesClosed) {
      const w = Math.max(1, Math.round(eyeRx));
      for (let k = -w; k < w; k++) c.plot(ex + k, eyeY + (k === -w || k === w - 1 ? 0 : 1), ramps.neutral[5]);
      continue;
    }
    forEachPixel(ellipse(ex, eyeY, eyeRx, eyeRy), (x, y) => {
      const lower = y + 0.5 - eyeY > eyeRy * 0.35 && x + 0.5 - ex > 0;
      c.plot(x, y, lower ? ramps.neutral[6] : ramps.neutral[8]);
    });
    const pr = mood === 'happy' ? 0.65 : 0.55;
    const px = ex + side * -0.15 * eyeRx, py = eyeY + eyeRy * lookY;
    forEachPixel(ellipse(px, py, Math.max(0.8, eyeRx * pr), Math.max(0.9, eyeRy * pr)), (x, y) => c.plot(x, y, ramps.neutral[0]));
    c.plot(px - eyeRx * pr * 0.5, py - eyeRy * pr * 0.5, ramps.neutral[8]);
    if (mood === 'sad') {
      forEachPixel(ellipse(ex, eyeY, eyeRx, eyeRy), (x, y) => {
        if (y + 0.5 < eyeY - eyeRy * 0.15) c.plot(x, y, ramps.body[1]);
      });
    }
    if (tier.intellect >= 3) {
      forEachPixel(ellipse(ex, eyeY, eyeRx + 1.15, eyeRy + 1.15), (x, y) => {
        const u = (x + 0.5 - ex) / (eyeRx + 0.3), v = (y + 0.5 - eyeY) / (eyeRy + 0.3);
        if (u * u + v * v > 1) c.plot(x, y, ramps.steel[3]);
      });
    }
  }
  if (tier.intellect >= 3 && !eyesClosed) {
    for (let x = Math.ceil(cx - eyeDx + eyeRx + 1); x < cx + eyeDx - eyeRx - 1; x++) c.plot(x, eyeY - 1, ramps.steel[3]);
  }

  drawMouth(c, cx, mouthY, s, mood);

  // Cheeks and freckles.
  const blushW = 1 + (tier.heart >= 1 ? 1 : 0) + Math.round(tweaks.blush);
  const cheekY = Math.round(eyeY + eyeRy + 0.5);
  for (const side of [-1, 1]) {
    const inner = cx + side * (eyeDx + eyeRx * 0.4);
    for (let k = 0; k < blushW; k++) {
      const x = inner + side * k;
      if (onBody(Math.floor(x), cheekY) || c.partAt(Math.floor(x), cheekY) === body) c.paint(x, cheekY, ramps.orange[2]);
    }
  }
  for (const f of traits.freckles) {
    const x = Math.floor(cx + f.side * (eyeDx + eyeRx + 1) + f.dx);
    const y = cheekY + 1 + f.dy;
    if (onBody(x, y)) c.paint(x, y, ramps.neutral[4]);
  }

  if (polymath) {
    const crest = [ramps.intellect[1], ramps.craft[1], ramps.heartAccent[1], ramps.authority[1]];
    const x0 = Math.floor(cx) - 1, y0 = Math.floor(showBrain ? brainCy + brainRy * 0.15 : eyeY - eyeRy - 3);
    crest.forEach((color, i) => c.plot(x0 + (i % 2), y0 + Math.floor(i / 2), color));
  }
  if (hasSash) {
    const sx = sashA[0] + (sashB[0] - sashA[0]) * 0.3, sy = sashA[1] + (sashB[1] - sashA[1]) * 0.3;
    drawStar(c, sx, sy, s >= 0.85 ? 2 : 1);
  }

  // ── Particles (no outline) ──
  if (showBrain && tier.intellect >= 4) {
    const tx = Math.floor(cx + brainRx * 0.95), ty = Math.floor(brainCy - brainRy - 1);
    c.line(tx, ty, tx, ty + 3, ramps.orange[2]);
    c.plot(tx, ty + 4, ramps.orange[4]);
  }
  if (tier.intellect >= 5 && frameIndex % 6 < 3) {
    for (const [dx, dy] of [[0, -4], [-4, 0], [4, 0], [-3, -3], [3, -3]]) c.plot(cx + dx, bulbY + dy, ramps.orange[3]);
  }
  if (shieldBox && tier.authority >= 5) {
    const { x: sx, y: sy, w, h } = shieldBox;
    forEachPixel(shield(sx, sy, w + 2.2, h + 2.2), (x, y) => {
      if (c.get(x, y) === null && (x + y + frameIndex) % 3 === 0) c.plot(x, y, ramps.authority[2]);
    });
    for (let k = 1; k <= 3; k++) {
      c.plot(sx - w * 0.5 - k * 0.8, sy - h - 1 + k, ramps.orange[3]);
      c.plot(sx + w * 0.5 + k * 0.8, sy - h - 1 + k, ramps.orange[3]);
    }
  }
  if (signature === 'craft') {
    const rand = mulberry32(frameIndex * 7919 + 13);
    for (const [hx, hy] of hands) {
      if (rand() < 0.6) c.plot(hx + (rand() * 6 - 3), hy - 2 - rand() * 3, rand() < 0.5 ? ramps.orange[2] : ramps.orange[4]);
    }
  }
  if (stage === 'legend' || polymath) {
    const rand = mulberry32(traits.foldSeed + 99);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const x = cx + Math.cos(a) * (rx + 9 + rand() * 4);
      const y = cy + Math.sin(a) * (ryTop + 6);
      if ((frameIndex + k * 3) % 8 < 4) drawSparkle(c, x, y);
    }
  }
  if (mood === 'sleepy') {
    const rise = frameIndex % 20;
    drawZ(c, cx + rx * 0.7 + Math.floor(rise / 6), headTop - 2 - Math.floor(rise / 3));
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function forEachPixel(shape: Shape, fn: (x: number, y: number) => void): void {
  const [x0, y0, x1, y1] = shape.bbox;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (shape.sample(x + 0.5, y + 0.5)) fn(x, y);
    }
  }
}

function orbit(count: number, angle: number, cx: number, cy: number, radiusX: number, radiusY: number) {
  return Array.from({ length: count }, (_, index) => {
    const a = angle + (index * Math.PI * 2) / count;
    return { index, x: cx + Math.cos(a) * radiusX, y: cy + Math.sin(a) * radiusY, front: Math.sin(a) > 0 };
  });
}

function drawEars(
  c: PixelCanvas, traits: Traits, cx: number, top: number, rx: number, ryTop: number, s: number, t: number,
  fillOpts: { dither: boolean },
): void {
  const ears = c.newPart({ outline: true, innerOutline: true });
  const size = traits.earSize;
  const twitch = traits.quirk === 'earTwitch' && (t + traits.bobPhase) % 3 < 0.2;
  for (const side of [-1, 1]) {
    const lift = twitch && side === 1 ? 1 : 0;
    const ex = cx + side * rx * 0.6;
    switch (traits.earStyle) {
      case 'round':
        c.fill(ellipse(ex + side * 0.5, top + ryTop * 0.15 - lift, s * 2.6 * size, s * 2.6 * size), ramps.body, ears, fillOpts);
        break;
      case 'pointy':
        c.fill(triangle(ex - s * 2.6, top + ryTop * 0.35, ex + s * 2.6, top + ryTop * 0.35, ex + side * s * 1.6, top - s * 3.6 * size - lift),
          ramps.body, ears, fillOpts);
        break;
      case 'floppy':
        c.fill(ellipse(cx + side * rx * 0.88, top + ryTop * 0.45 - lift, s * 1.8, s * 3.4 * size), ramps.body, ears, fillOpts);
        break;
      case 'tuft':
        c.fill(capsule(cx + side * 1, top + 1.5, cx + side * 2.2, top - s * 2.6 * size - lift, Math.max(1, s)), ramps.body, ears, fillOpts);
        break;
    }
  }
}

function drawMouth(c: PixelCanvas, cx: number, y: number, s: number, mood: PipGenome['mood']): void {
  const cxi = Math.floor(cx + 0.5);
  const hw = Math.max(1, Math.round(s * 1.5));
  const row = (yy: number, half: number, color: string, from = 0) => {
    for (let k = from; k < half; k++) { c.plot(cxi - 1 - k, yy, color); c.plot(cxi + k, yy, color); }
  };
  const line = ramps.neutral[5];
  switch (mood) {
    case 'happy':
      row(y, hw + 1, ramps.orange[0]);
      row(y + 1, hw, ramps.orange[0]);
      row(y + 1, 1, ramps.orange[3]);
      break;
    case 'neutral':
      row(y + 1, hw, line);
      c.plot(cxi - 1 - hw, y, line);
      c.plot(cxi + hw, y, line);
      break;
    case 'sad':
      row(y, hw, line);
      c.plot(cxi - 1 - hw, y + 1, line);
      c.plot(cxi + hw, y + 1, line);
      break;
    case 'sleepy':
      row(y, 1, ramps.neutral[4]);
      break;
  }
}

function drawBook(c: PixelCanvas, x: number, y: number): void {
  const book = c.newPart({ outline: true });
  c.fill(rect(x - 2, y - 1.5, 4, 3), ramps.intellect, book);
  for (let k = -2; k < 2; k++) c.paint(x + k, y + 1, ramps.neutral[8]);
}

function drawTool(c: PixelCanvas, x: number, y: number, index: number): void {
  const part = c.newPart({ outline: true });
  if (index === 0) {
    // Game controller.
    c.fill(rect(x - 3, y - 1.5, 6, 3.5), ramps.body, part);
    c.paint(x - 2, y, ramps.neutral[8]);
    c.paint(x + 1, y - 1, ramps.orange[2]);
    c.paint(x + 2, y, ramps.orange[3]);
  } else {
    // Wrench.
    c.fill(capsule(x - 2, y + 2, x + 1, y - 1, 0.8), ramps.steel, part);
    c.fill(ellipse(x + 1.5, y - 1.5, 1.6, 1.6), ramps.steel, part);
    c.paint(x + 2, y - 2, ramps.neutral[2]);
  }
}

function drawStar(c: PixelCanvas, x: number, y: number, r: number): void {
  for (let k = -r; k <= r; k++) {
    c.plot(x + k, y, ramps.neutral[8]);
    c.plot(x, y + k, ramps.neutral[8]);
  }
  c.plot(x, y, ramps.orange[4]);
}

function drawSparkle(c: PixelCanvas, x: number, y: number): void {
  c.plot(x, y, ramps.neutral[8]);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.plot(x + dx, y + dy, ramps.orange[3]);
}

function drawZ(c: PixelCanvas, x: number, y: number): void {
  const glyph = ['1111', '..1.', '.1..', '1111'];
  glyph.forEach((row, dy) => [...row].forEach((ch, dx) => ch === '1' && c.plot(x + dx, y + dy, ramps.neutral[4])));
}

// ─── Canvas output ─────────────────────────────────────────────────────────

/** Draw a frame onto a 2D context at an integer scale (nearest-neighbour by construction). */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: PipFrame, scale: number, ox = 0, oy = 0): void {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const color = frame.pixels[y * frame.width + x];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}
