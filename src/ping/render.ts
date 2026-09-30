// Procedural Ping renderer (GDD §9.4). Same genome + same time → same pixels.

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
  type PingGenome,
  type Stat,
} from './genome';
import { blob, capsule, ellipse, heart, PixelCanvas, rect, shield, triangle, type Shape } from './raster';
import { deriveTraits, mulberry32, type Traits } from './traits';

/**
 * Pixels per design unit. The layout below is written in "design units" (the original
 * 64×64 grid); multiplying by the density gives finer pixels with the same proportions,
 * while outlines and fine details stay 1px wide for a crisp, detailed look.
 */
export const PIXEL_DENSITY = 2;
const D = PIXEL_DENSITY;
export const PING_CANVAS = 64 * D;
export const GROUND = 58 * D;
const FPS = 10;

/** Body height in pixels per life stage (legs, brain and accessories add to this). */
const BODY_HEIGHT: Record<LifeStage, number> = { egg: 0, baby: 15 * D, kid: 20 * D, teen: 24 * D, adult: 27 * D, legend: 27 * D };

export interface RenderOptions {
  /** Seconds; animation is quantized to 10 fps for a crisp pixel feel. */
  time?: number;
  dither?: boolean;
}

export interface PingFrame {
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
function formStyle(form: Form, genome: PingGenome) {
  const tweaks: Tweaks = { headBoost: 0, armThick: 0, bodyWide: 0, legMul: 0, blush: 0 };
  const stats = formStats(form).sort((a, b) => genome.stats[b] - genome.stats[a]);
  const strength = stats.length > 1 ? 0.6 : 1;
  for (const stat of stats) {
    for (const [key, value] of Object.entries(STAT_TWEAKS[stat])) tweaks[key as keyof Tweaks] += value * strength;
  }
  return { tweaks, signature: (stats[0] ?? null) as Stat | null, polymath: form === 'polymath' };
}

export function renderPing(genome: PingGenome, opts: RenderOptions = {}): PingFrame {
  const canvas = new PixelCanvas(PING_CANVAS, PING_CANVAS);
  const frameIndex = Math.floor((opts.time ?? 0) * FPS);
  const t = frameIndex / FPS;
  const traits = deriveTraits(genome.seed, genome.style);
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
  const wobble = (t + traits.bobPhase) % 3 < 0.4 ? (Math.floor(t * FPS) % 2 ? D : -D) : 0;
  const cx = PING_CANVAS / 2 + wobble;
  const cy = GROUND - 9 * D;
  const egg = c.newPart({ outline: true });
  c.fill(blob(cx, cy, 8.5 * D, 11 * D, 9 * D, 2), ramps.paper, egg, { thresholds: [-0.25, 0.3, 0.9] });
  // Envelope flap.
  c.line(cx - 7 * D, cy - 3 * D, cx - 1, cy + 2 * D, ramps.neutral[5], -1, true);
  c.line(cx + 7 * D - 1, cy - 3 * D, cx, cy + 2 * D, ramps.neutral[5], -1, true);
  const seal = c.newPart({ outline: true, innerOutline: true });
  c.fill(ellipse(cx, cy + 2.5 * D, 2.3 * D, 2.3 * D), ramps.heart, seal);
  const rand = mulberry32(traits.foldSeed);
  for (let i = 0; i < 3; i++) c.paint(cx + (rand() * 10 - 5) * D, cy + (rand() * 4 - 8) * D, ramps.orange[4]);
  c.outline(outlineColor);
}

// ─── Creature ──────────────────────────────────────────────────────────────

function drawCreature(
  c: PixelCanvas,
  genome: PingGenome,
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
  const s = H / 27; // 1 design unit at adult size, times the pixel density
  const fillOpts = { dither };
  const coat = traits.coat.ramp;
  const shape = traits.shape;

  // ── Animation ──
  const speed = mood === 'sleepy' ? 0.25 : 0.5;
  const bob = mood === 'sad' ? 0 : Math.round(((Math.sin(t * Math.PI * 2 * speed * traits.bobSpeed + traits.bobPhase) + 1) / 2) * D);
  const hopping = (traits.quirk === 'hop' || mood === 'happy') && mood !== 'sleepy' && (t + traits.bobPhase) % 4 < 0.3;
  const lift = hopping ? 2 * D : 0;
  const sway = traits.quirk === 'sway' ? Math.round(Math.sin(t * 1.3 + traits.bobPhase) * 0.6 * D) : 0;
  const breathe = 1 + 0.02 * Math.sin(t * Math.PI * 2 * 0.4);
  const blinking = (t + traits.bobPhase) % traits.blinkEvery < 0.15;
  const beat = tier.heart >= 3 ? Math.max(0, Math.sin(t * Math.PI * 2 * 1.1)) ** 8 : 0;

  // ── Layout ──
  const cx = PING_CANVAS / 2 + sway;
  const rx = H * 0.56 * traits.squish * traits.shape.width * (1 + tweaks.bodyWide);
  const ryTop = H * 0.55 * traits.shape.top * (1 + tweaks.headBoost + 0.12 * g.intellect) * (mood === 'sad' ? 0.95 : 1) * breathe;
  const ryBottom = H * 0.45 * traits.shape.bottom;
  const legLen = s * (0.5 + 5 * g.authority) * (1 + tweaks.legMul);
  const footRx = Math.max(1.4 * D, s * (1.6 + 0.9 * g.authority));
  const footRy = Math.max(D, s * 1.1);
  const plinthH = tier.authority >= 4 ? 3 * D : 0;
  const footY = GROUND - plinthH - footRy - lift;
  const cy = footY - legLen - ryBottom - bob;
  const top = cy - ryTop;
  const stanceX = rx * (0.32 + 0.18 * g.authority);

  const eyeBase = Math.max(1.6 * D, s * 2.5);
  const eyeRx = eyeBase * (traits.eyeStyle === 'wide' ? 1.2 : traits.eyeStyle === 'tall' ? 0.9 : 1);
  const eyeRy = eyeBase * (traits.eyeStyle === 'tall' ? 1.3 : 1);
  const eyeY = cy - ryTop * 0.3;
  const eyeDx = rx * 0.36 * traits.eyeSpacing;
  const mouthY = Math.round(eyeY + eyeRy + Math.max(1.5 * D, s * 1.8));
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
    const pulse = frameIndex % 10 < 5 ? 0 : D;
    const shape = ellipse(cx, cy, rx + 4 * D + pulse, (ryTop + ryBottom) / 2 + 5 * D + pulse);
    forEachPixel(shape, (x, y) => {
      if ((x + y) % 2 === 0) c.plot(x, y, (x + y) % 4 === 0 ? ramps.heartAccent[2] : ramps.heartAccent[3], aura);
    });
  }

  // ── Orbiting items (back half) ──
  const books = tier.intellect >= 5 ? orbit(2, t * 1.4, cx, top - D, rx + 5 * D, 2.5 * D) : [];
  const tools = tier.craft >= 5 ? orbit(2, t * 1.1 + 1, cx, cy + ryBottom * 0.2, rx + 7 * D, 2 * D) : [];
  books.filter((o) => !o.front).forEach((o) => drawBook(c, o.x, o.y));
  tools.filter((o) => !o.front).forEach((o) => drawTool(c, o.x, o.y, o.index));

  // ── Friends (Heart T4) hop beside Ping ──
  if (tier.heart >= 4) {
    const friends = c.newPart({ outline: true });
    for (const side of [-1, 1]) {
      const fx = cx + side * (rx + 7 * D);
      const fy = GROUND - 2.4 * D - (Math.sin(t * 4 + side) > 0.6 ? D : 0);
      c.fill(ellipse(fx, fy, 2.4 * D, 2.1 * D), ramps.heartAccent, friends, fillOpts);
      block(c, fx + side * 0.8 * D - 1, fy - D, 1, D, ramps.neutral[0]);
      block(c, fx - side * 0.4 * D - 1, fy - D, 1, D, ramps.neutral[0]);
    }
  }

  // ── Plinth (Authority T4) ──
  if (plinthH) {
    const plinth = c.newPart({ outline: true });
    c.fill(rect(cx - rx * 0.95, GROUND - plinthH, rx * 1.9, plinthH - 0.01), ramps.steel, plinth, { thresholds: [-0.6, 0.2, 0.55] });
  }

  // ── Legs and feet ──
  const legs = c.newPart({ outline: true, innerOutline: true });
  const legR = Math.max(1.2 * D, s * (1.3 + 0.9 * g.authority));
  for (const side of [-1, 1]) {
    const lx = cx + side * stanceX;
    if (legLen > footRy * 0.6) c.fill(capsule(lx, cy + ryBottom * 0.6, lx, footY, legR), coat, legs, fillOpts);
    c.fill(ellipse(lx + side * 0.4 * D, footY, footRx, footRy), coat, legs, fillOpts);
  }

  // ── Ears ──
  drawEars(c, traits, cx, top, rx, ryTop, s, t, fillOpts);

  // ── Body ──
  const body = c.newPart({ outline: true, innerOutline: true });
  c.fill(blob(cx, cy, rx, ryTop, ryBottom, shape.power, shape.topWidth), coat, body, { ...fillOpts, thresholds: [-0.15, 0.3, 0.66, 0.985] });
  const onBody = (x: number, y: number) => c.partAt(x, y) === body;
  drawMarking(c, traits, onBody, { cx, cy, rx, ryTop, ryBottom, eyeY, eyeRy, top, s });

  // ── Clothing and marks (clipped to the body) ──
  if (signature === 'intellect') {
    const robe = c.newPart({ outline: true });
    const robeTop = Math.round(cy + ryBottom * 0.25);
    c.fill(blob(cx, cy, rx, ryTop, ryBottom, shape.power, shape.topWidth), ramps.intellect, robe, { ...fillOpts, clip: (x, y) => y >= robeTop && onBody(x, y) });
    for (let x = 0; x < c.width; x++) if (c.partAt(x, robeTop) === robe) c.paint(x, robeTop, ramps.intellect[3]);
  }
  if (signature === 'craft') {
    const apron = c.newPart({ outline: true });
    const apronTop = mouthY + 1.5 * D;
    c.fill(rect(cx - rx * 0.45, apronTop, rx * 0.9, ryBottom * 2), ramps.craft, apron, { clip: onBody });
    for (const side of [-1, 1]) c.line(cx + side * rx * 0.4, apronTop, cx + side * rx * 0.72, eyeY + eyeRy, ramps.craft[1], -1, true);
  }
  if (tier.craft >= 3) {
    const belt = c.newPart({ outline: true });
    const beltY = cy + ryBottom * 0.7;
    const beltH = Math.max(2 * D, s * 2.2);
    c.fill(rect(cx - rx, beltY, rx * 2, beltH), ramps.steel, belt, { clip: (x, y) => onBody(x, y) || c.partAt(x, y) > body });
    c.fill(rect(cx - 1.4 * D, beltY - 0.3 * D, 2.8 * D, beltH + 0.6 * D), ramps.orange.slice(1, 4), belt);
    c.fill(rect(cx - 0.6 * D, beltY + 0.5 * D, 1.2 * D, beltH - D), ramps.steel, belt);
  }
  const hasSash = tier.authority >= 3 || signature === 'authority';
  const sashA: [number, number] = [cx - rx * 0.8, cy + ryBottom * 0.12];
  const sashB: [number, number] = [cx + rx * 0.8, cy + ryBottom * 0.98];
  if (hasSash) {
    const sash = c.newPart({ outline: true });
    c.fill(capsule(...sashA, ...sashB, Math.max(D, s * 1.2)), ramps.heart, sash, {
      clip: (x, y) => onBody(x, y) || (c.partAt(x, y) > body && c.get(x, y) !== null),
    });
  }
  if (tier.heart >= 2) {
    const heartPart = c.newPart({ outline: true, innerOutline: true });
    c.fill(heart(cx, heartCy, heartR), ramps.heart, heartPart, fillOpts);
  } else {
    // The game's own envelope-seal mark (not the showcase logo).
    const seal = c.newPart();
    c.fill(ellipse(cx, heartCy, Math.max(1.2 * D, s * 1.4), Math.max(1.2 * D, s * 1.4)), ramps.heart.slice(1), seal);
  }
  if (tier.authority === 2 && !hasSash) {
    const cardW = Math.max(3 * D, Math.round(3 * s));
    const cardH = Math.round(cardW * 1.3);
    const cardX = Math.round(cx - rx * 0.5 - cardW / 2);
    const cardY = Math.round(cy + ryBottom * 0.3);
    c.line(cx - rx * 0.4, mouthY + D, cardX + 1, cardY, ramps.neutral[5], -1, true);
    c.line(cx + rx * 0.1, mouthY + D, cardX + cardW - 2, cardY, ramps.neutral[5], -1, true);
    const card = c.newPart({ outline: true, innerOutline: true });
    c.fill(rect(cardX, cardY, cardW - 0.01, cardH - 0.01), ramps.paper, card);
    block(c, cardX, cardY, cardW, Math.max(1, Math.round(cardH * 0.25)), ramps.orange[2]);
    block(c, cardX + 1, cardY + Math.round(cardH * 0.4), Math.round(cardW * 0.4), Math.round(cardW * 0.4), ramps.neutral[5]);
    block(c, cardX + 1, cardY + cardH - 2, cardW - 2, 1, ramps.neutral[6]);
  }
  if (signature === 'heart') {
    const flower = c.newPart({ outline: true });
    const fx = Math.round(cx + rx * 0.62), fy = Math.round(top + D);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) c.fill(ellipse(fx + dx * D, fy + dy * D, 0.9 * D, 0.9 * D), ramps.orange.slice(3), flower);
    block(c, fx - 1, fy - 1, 2, 2, ramps.orange[2]);
  }

  // ── Brain (Intellect T2+) and cap (T4) ──
  if (showBrain) {
    const brain = c.newPart({ outline: true, innerOutline: true });
    c.fill(ellipse(cx, brainCy, brainRx, brainRy), ramps.brain, brain, { ...fillOpts, thresholds: [-0.2, 0.55, 0.95] });
    const onBrain = (x: number, y: number) => c.partAt(x, y) === brain;
    const fold = ramps.brain[0];
    for (let y = Math.floor(brainCy - brainRy + 1); y < brainCy + brainRy * 0.1; y++) if (onBrain(Math.floor(cx), y)) c.paint(cx, y, fold);
    const rand = mulberry32(traits.foldSeed);
    const folds = 4 + Math.round(6 * g.intellect);
    for (let i = 0; i < folds; i++) {
      const side = i % 2 ? 1 : -1;
      const fx = cx + side * (1.5 * D + rand() * brainRx * 0.55);
      const fy = brainCy - brainRy * 0.5 + rand() * brainRy * 0.9;
      const len = (3 + Math.floor(rand() * 3)) * D;
      const dir = rand() < 0.5 ? -1 : 1;
      for (let k = 0; k < len; k++) {
        const x = Math.floor(fx + k * side * 0.8), y = Math.floor(fy + (Math.floor(k / D) % 2) * dir);
        if (onBrain(x, y) && onBrain(x, y - 1) && onBrain(x, y + 1)) c.paint(x, y, fold);
      }
    }
    if (tier.intellect >= 4) {
      const cap = c.newPart({ outline: true, innerOutline: true });
      const brainTop = brainCy - brainRy;
      c.fill(ellipse(cx, brainTop + 1.5 * D, brainRx * 0.62, 2.6 * D), ramps.body, cap, fillOpts);
      c.fill(rect(cx - brainRx * 1.05, brainTop - 1.5 * D, brainRx * 2.1, 1.2 * D), ramps.body, cap, { thresholds: [-0.9, 0.2, 0.5, 0.95] });
    }
  }

  // ── Arms and hands (Craft) ──
  const arms = c.newPart({ outline: true, innerOutline: true });
  const gauntlet = tier.craft >= 4 ? c.newPart({ outline: true, innerOutline: true }) : -1;
  const armLen = s * (3 + 9 * g.craft);
  const armR = Math.max(1.5 * D, s * (1.3 + 1.2 * g.craft) * (1 + tweaks.armThick));
  const armSwing = Math.round(Math.sin(t * 2 + traits.bobPhase) * 0.5 * D);
  const hands: [number, number][] = [];
  for (const side of [-1, 1]) {
    const sx = cx + side * rx * 0.82;
    const sy = cy + ryBottom * 0.05;
    let hx = sx + side * armLen * 0.5;
    let hy = sy + armLen * 0.85 + armSwing;
    if (mood === 'happy') { hx = sx + side * armLen * 0.75; hy = sy + armLen * 0.35; }
    if (mood === 'sad') { hx = sx + side * armLen * 0.2; hy = sy + armLen; }
    hy = Math.min(hy, footY - D);
    hands.push([hx, hy]);
    c.fill(capsule(sx, sy, hx, hy, armR), coat, arms, fillOpts);
    c.fill(ellipse(hx, hy, armR * 1.3, armR * 1.3), coat, arms, fillOpts);
    if (gauntlet >= 0) {
      const mx = (sx + hx) / 2, my = (sy + hy) / 2;
      c.fill(capsule(mx, my, hx, hy, armR + 0.4 * D), ramps.steel, gauntlet, fillOpts);
      c.fill(ellipse(hx, hy, armR * 1.35, armR * 1.35), ramps.steel, gauntlet, fillOpts);
    }
  }
  if (tier.craft >= 2) {
    const stylus = c.newPart({ outline: true });
    const [hx, hy] = hands[0];
    const len = 3 * D + s * 2;
    const tipX = hx - D - len * 0.6, tipY = hy - D - len;
    c.fill(capsule(hx - D, hy - D, tipX, tipY, 0.6 * D), ramps.orange.slice(1), stylus);
    c.fill(ellipse(tipX, tipY, 0.7 * D, 0.7 * D), ramps.steel.slice(2), stylus);
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
  const bulbY = headTop - (tier.intellect >= 4 ? 7 : 5) * D + (Math.sin(t * 2) > 0 ? 0 : D);
  if (tier.intellect >= 5) {
    const bulb = c.newPart({ outline: true });
    c.fill(ellipse(cx, bulbY, 2.4 * D, 2.4 * D), [ramps.orange[3], ramps.orange[4], ramps.neutral[8]], bulb);
    c.fill(rect(cx - D, bulbY + 2 * D, 2 * D, 1.2 * D), ramps.steel, bulb);
  }

  c.outline(outlineColor);

  // ── Face (always drawn last so nothing covers the eyes) ──
  const eyesClosed = blinking || mood === 'sleepy';
  const lookY = mood === 'sad' ? 0.35 : 0.2;
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDx;
    if (eyesClosed) {
      // A soft closed-eye curve, D pixels thick.
      const w = Math.max(2, Math.round(eyeRx));
      for (let k = -w; k < w; k++) {
        const u = (k + 0.5) / w;
        const dy = Math.round((1 - u * u) * eyeRy * 0.45);
        block(c, ex + k, eyeY + dy, 1, D, ramps.neutral[5]);
      }
      continue;
    }
    forEachPixel(ellipse(ex, eyeY, eyeRx, eyeRy), (x, y) => {
      const lower = y + 0.5 - eyeY > eyeRy * 0.35 && x + 0.5 - ex > 0;
      c.plot(x, y, lower ? ramps.neutral[6] : ramps.neutral[8]);
    });
    const pr = mood === 'happy' ? 0.66 : 0.56;
    const px = ex + side * -0.15 * eyeRx, py = eyeY + eyeRy * lookY;
    const prx = Math.max(0.8 * D, eyeRx * pr), pry = Math.max(0.9 * D, eyeRy * pr);
    forEachPixel(ellipse(px, py, prx, pry), (x, y) => {
      const lower = y + 0.5 - py > pry * 0.3;
      c.plot(x, y, lower ? traits.eyes[1] : traits.eyes[0]);
    });
    // Two catch-lights: a big one up-left and a small one down-right.
    const hl = Math.max(1, Math.round(prx * 0.5));
    block(c, px - prx * 0.55, py - pry * 0.6, hl, hl, ramps.neutral[8]);
    c.plot(px + prx * 0.35, py + pry * 0.35, ramps.neutral[8]);
    if (mood === 'sad') {
      forEachPixel(ellipse(ex, eyeY, eyeRx, eyeRy), (x, y) => {
        if (y + 0.5 < eyeY - eyeRy * 0.15) c.plot(x, y, coat[1]);
      });
    }
    if (tier.intellect >= 3) {
      const inner = 0.5 * D, outer = inner + 0.8 * D;
      forEachPixel(ellipse(ex, eyeY, eyeRx + outer, eyeRy + outer), (x, y) => {
        const u = (x + 0.5 - ex) / (eyeRx + inner), v = (y + 0.5 - eyeY) / (eyeRy + inner);
        if (u * u + v * v > 1) c.plot(x, y, ramps.steel[3]);
      });
    }
  }
  if (tier.intellect >= 3 && !eyesClosed) {
    const gap = eyeRx + 1.3 * D;
    for (let x = Math.ceil(cx - eyeDx + gap); x < cx + eyeDx - gap; x++) c.plot(x, eyeY - D, ramps.steel[3]);
  }

  drawMouth(c, cx, mouthY, s, mood);

  // Cheeks and freckles.
  const blush = 1 + (tier.heart >= 1 ? 1 : 0) + tweaks.blush;
  const cheekY = eyeY + eyeRy + 0.6 * D;
  for (const side of [-1, 1]) {
    const bx = cx + side * (eyeDx + eyeRx * 0.55);
    forEachPixel(ellipse(bx, cheekY, s * (0.55 + 0.35 * blush), Math.max(D * 0.6, s * 0.5)), (x, y) => {
      if (onBody(x, y)) c.paint(x, y, (x + y) % 2 && y + 0.5 < cheekY && traits.cheek === ramps.orange[2] ? ramps.orange[3] : traits.cheek);
    });
  }
  for (const f of traits.freckles) {
    const x = Math.floor(cx + f.side * (eyeDx + eyeRx + D) + f.dx * D);
    const y = Math.floor(cheekY + 1.5 * D + f.dy * D);
    if (onBody(x, y)) c.paint(x, y, ramps.neutral[4]);
  }

  if (polymath) {
    const crest = [ramps.intellect[1], ramps.craft[1], ramps.heartAccent[1], ramps.authority[1]];
    const x0 = Math.floor(cx) - D, y0 = Math.floor(showBrain ? brainCy + brainRy * 0.15 : eyeY - eyeRy - 3 * D);
    crest.forEach((color, i) => block(c, x0 + (i % 2) * D, y0 + Math.floor(i / 2) * D, D, D, color));
  }
  if (hasSash) {
    const sx = sashA[0] + (sashB[0] - sashA[0]) * 0.3, sy = sashA[1] + (sashB[1] - sashA[1]) * 0.3;
    drawStar(c, sx, sy, Math.max(2, Math.round(s * 1.4)));
  }

  // ── Particles (no outline) ──
  if (showBrain && tier.intellect >= 4) {
    const tx = Math.floor(cx + brainRx * 0.95), ty = Math.floor(brainCy - brainRy - D);
    c.line(tx, ty, tx, ty + 3 * D, ramps.orange[2]);
    block(c, tx - 1, ty + 3 * D, 3, D, ramps.orange[3]);
  }
  if (tier.intellect >= 5 && frameIndex % 6 < 3) {
    for (const [dx, dy] of [[0, -4], [-4, 0], [4, 0], [-3, -3], [3, -3]]) c.line(cx + dx * D, bulbY + dy * D, cx + dx * D * 1.3, bulbY + dy * D * 1.3, ramps.orange[3]);
  }
  if (shieldBox && tier.authority >= 5) {
    const { x: sx, y: sy, w, h } = shieldBox;
    forEachPixel(shield(sx, sy, w + 2.2 * D, h + 2.2 * D), (x, y) => {
      if (c.get(x, y) === null && (x + y + frameIndex) % 3 === 0) c.plot(x, y, ramps.authority[2]);
    });
    for (let k = 1; k <= 3; k++) {
      c.fill(ellipse(sx - w * 0.5 - k * 0.8 * D, sy - h - D + k * D, 0.7 * D, 0.5 * D), ramps.orange.slice(3), -1);
      c.fill(ellipse(sx + w * 0.5 + k * 0.8 * D, sy - h - D + k * D, 0.7 * D, 0.5 * D), ramps.orange.slice(3), -1);
    }
  }
  if (signature === 'craft') {
    const rand = mulberry32(frameIndex * 7919 + 13);
    for (const [hx, hy] of hands) {
      if (rand() < 0.7) block(c, hx + (rand() * 6 - 3) * D, hy - (2 + rand() * 3) * D, 1 + Math.floor(rand() * 2), 1 + Math.floor(rand() * 2), rand() < 0.5 ? ramps.orange[2] : ramps.orange[4]);
    }
  }
  if (stage === 'legend' || polymath) {
    const rand = mulberry32(traits.foldSeed + 99);
    for (let k = 0; k < 6; k++) {
      const a = rand() * Math.PI * 2;
      const x = cx + Math.cos(a) * (rx + (9 + rand() * 4) * D);
      const y = cy + Math.sin(a) * (ryTop + 6 * D);
      if ((frameIndex + k * 3) % 8 < 4) drawSparkle(c, x, y);
    }
  }
  if (mood === 'sleepy') {
    const rise = frameIndex % 20;
    drawZ(c, cx + rx * 0.7 + Math.floor(rise / 6) * D, headTop - 2 * D - Math.floor(rise / 3) * D);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface BodyBox { cx: number; cy: number; rx: number; ryTop: number; ryBottom: number; eyeY: number; eyeRy: number; top: number; s: number }

/** Seeded coat markings, painted in the coat's light tone and clipped to the body. */
function drawMarking(c: PixelCanvas, traits: Traits, onBody: (x: number, y: number) => boolean, b: BodyBox): void {
  const ramp = traits.coat.ramp;
  // A two-tone dither reads as a soft fur pattern without hiding the coat.
  const tone = (x: number, y: number) => ((x + y) % 2 ? ramp[3] : ramp[4]);
  const paint = (shape: Shape) => forEachPixel(shape, (x, y) => { if (onBody(x, y)) c.paint(x, y, tone(x, y)); });
  switch (traits.marking) {
    case 'belly':
      paint(ellipse(b.cx, b.cy + b.ryBottom * 0.4, b.rx * 0.55, b.ryBottom * 0.62));
      break;
    case 'spots': {
      const rand = mulberry32(traits.foldSeed + 7);
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 1 : -1;
        paint(ellipse(b.cx + side * b.rx * (0.5 + rand() * 0.3), b.cy - b.ryTop * (0.05 + rand() * 0.55), b.s * (1 + rand() * 0.8), b.s * (1 + rand() * 0.8)));
      }
      break;
    }
    case 'mask':
      paint(ellipse(b.cx, b.eyeY, b.rx * 0.82, b.eyeRy * 2.1));
      break;
    case 'crown':
      paint(ellipse(b.cx, b.top, b.rx, b.ryTop * 0.42));
      break;
  }
}

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
    const lift = twitch && side === 1 ? D : 0;
    const ex = cx + side * rx * 0.6;
    switch (traits.earStyle) {
      case 'round':
        c.fill(ellipse(ex + side * 0.5 * D, top + ryTop * 0.15 - lift, s * 2.6 * size, s * 2.6 * size), traits.coat.ramp, ears, fillOpts);
        break;
      case 'pointy':
        c.fill(triangle(ex - s * 2.6, top + ryTop * 0.35, ex + s * 2.6, top + ryTop * 0.35, ex + side * s * 1.6, top - s * 3.6 * size - lift),
          traits.coat.ramp, ears, fillOpts);
        break;
      case 'floppy':
        c.fill(ellipse(cx + side * rx * 0.88, top + ryTop * 0.45 - lift, s * 1.8, s * 3.4 * size), traits.coat.ramp, ears, fillOpts);
        break;
      case 'tuft':
        c.fill(capsule(cx + side * D, top + 1.5 * D, cx + side * 2.2 * D, top - s * 2.6 * size - lift, Math.max(D, s)), traits.coat.ramp, ears, fillOpts);
        break;
    }
  }
}

function drawMouth(c: PixelCanvas, cx: number, y: number, s: number, mood: PingGenome['mood']): void {
  const hw = Math.max(1.5 * D, s * 1.6);
  const line = ramps.neutral[5];
  // A 1px curve y = y0 + depth·(1 − u²) across the mouth width (depth < 0 frowns).
  const curve = (depth: number) => {
    let prev: [number, number] | null = null;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw) - 1; x++) {
      const u = (x + 0.5 - cx) / hw;
      const py = Math.round(y + depth * (1 - u * u));
      if (prev) c.line(prev[0], prev[1], x, py, line);
      prev = [x, py];
    }
  };
  switch (mood) {
    case 'happy': {
      // Open smile: a half-ellipse with a tongue.
      const depth = Math.max(1.5 * D, s * 1.6);
      forEachPixel(ellipse(cx, y, hw, depth), (x, py) => {
        if (py + 0.5 < y) return;
        const tongue = (x + 0.5 - cx) ** 2 / (hw * 0.6) ** 2 + (py + 0.5 - (y + depth)) ** 2 / (depth * 0.6) ** 2 <= 1;
        c.plot(x, py, tongue ? ramps.orange[3] : ramps.orange[0]);
      });
      break;
    }
    case 'neutral':
      curve(0.8 * D);
      break;
    case 'sad':
      curve(-0.8 * D);
      break;
    case 'sleepy':
      forEachPixel(ellipse(cx, y + 0.5 * D, 0.7 * D, 0.6 * D), (x, py) => c.plot(x, py, ramps.neutral[4]));
      break;
  }
}

function drawBook(c: PixelCanvas, x: number, y: number): void {
  const book = c.newPart({ outline: true, innerOutline: true });
  c.fill(rect(x - 2 * D, y - 1.5 * D, 4 * D, 3 * D), ramps.intellect, book);
  block(c, x - 2 * D, y + D, 4 * D, Math.max(1, D / 2), ramps.neutral[8]);
  block(c, x - 2 * D, y - 1.5 * D, 1, 3 * D, ramps.intellect[0]);
}

function drawTool(c: PixelCanvas, x: number, y: number, index: number): void {
  const part = c.newPart({ outline: true, innerOutline: true });
  if (index === 0) {
    // Game controller: body, d-pad and two buttons.
    c.fill(rect(x - 3 * D, y - 1.5 * D, 6 * D, 3.5 * D), ramps.body, part);
    const dx = Math.round(x - 1.8 * D), dy = Math.round(y);
    block(c, dx - 1, dy, 3, 1, ramps.neutral[8]);
    block(c, dx, dy - 1, 1, 3, ramps.neutral[8]);
    block(c, x + D, y - D, D, D, ramps.orange[2]);
    block(c, x + 2 * D, y, D, D, ramps.orange[3]);
  } else {
    // Wrench.
    c.fill(capsule(x - 2 * D, y + 2 * D, x + D, y - D, 0.8 * D), ramps.steel, part);
    c.fill(ellipse(x + 1.5 * D, y - 1.5 * D, 1.6 * D, 1.6 * D), ramps.steel, part);
    block(c, x + 1.5 * D, y - 2.5 * D, D, D, ramps.neutral[2]);
  }
}

function drawStar(c: PixelCanvas, x: number, y: number, r: number): void {
  for (let k = -r; k <= r; k++) {
    c.plot(x + k, y, ramps.neutral[8]);
    c.plot(x, y + k, ramps.neutral[8]);
  }
  const d = Math.floor(r / 2);
  for (let k = 1; k <= d; k++) {
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) c.plot(x + sx * k, y + sy * k, ramps.orange[4]);
  }
  c.plot(x, y, ramps.orange[3]);
}

function drawSparkle(c: PixelCanvas, x: number, y: number): void {
  for (let k = 1; k <= D + 1; k++) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.plot(x + dx * k, y + dy * k, k > D ? ramps.orange[4] : ramps.orange[3]);
  }
  c.plot(x, y, ramps.neutral[8]);
}

function drawZ(c: PixelCanvas, x: number, y: number): void {
  const size = 3 * D;
  const color = ramps.neutral[4];
  c.line(x, y, x + size, y, color);
  c.line(x + size, y, x, y + size, color);
  c.line(x, y + size, x + size, y + size, color);
}

/** A solid rectangle of pixels (no shading, no part). */
function block(c: PixelCanvas, x: number, y: number, w: number, h: number, color: string): void {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  for (let yy = y0; yy < y0 + h; yy++) for (let xx = x0; xx < x0 + w; xx++) c.plot(xx, yy, color);
}

// ─── Canvas output ─────────────────────────────────────────────────────────

const rgbaCache = new Map<string, number>();
function rgba(hex: string): number {
  let v = rgbaCache.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff); // little-endian ABGR
    rgbaCache.set(hex, v);
  }
  return v;
}

let scratch: HTMLCanvasElement | null = null;

/** Draw a frame onto a 2D context at an integer scale with nearest-neighbour filtering. */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: PingFrame, scale: number, ox = 0, oy = 0): void {
  scratch ??= document.createElement('canvas');
  scratch.width = frame.width;
  scratch.height = frame.height;
  const sctx = scratch.getContext('2d')!;
  const image = sctx.createImageData(frame.width, frame.height);
  const words = new Uint32Array(image.data.buffer);
  frame.pixels.forEach((color, i) => { if (color) words[i] = rgba(color); });
  sctx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratch, ox, oy, frame.width * scale, frame.height * scale);
}
