// Low-resolution pixel buffer with lit shape filling and automatic outlines (GDD §9.4 steps 2–5).

/** A shape samples a pixel centre and returns a pseudo-normal (length ≤ 1) if inside. */
export interface Shape {
  bbox: [x0: number, y0: number, x1: number, y1: number];
  sample(px: number, py: number): [nx: number, ny: number] | null;
}

export interface PartStyle {
  /** Draw a 1px outline where this part meets empty space. */
  outline?: boolean;
  /** Draw a 1px outline where this part overlaps a part drawn earlier. */
  innerOutline?: boolean;
}

export interface FillOptions {
  dither?: boolean;
  /** Only fill where this returns true (e.g. clip clothing to the body). */
  clip?: (x: number, y: number) => boolean;
  /** Intensity thresholds between ramp steps (length = ramp.length - 1). */
  thresholds?: number[];
}

const LIGHT = normalize3(-0.5, -0.72, 0.48);
const BAYER = [0, 2, 3, 1];

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
}

export function defaultThresholds(len: number): number[] {
  if (len <= 1) return [];
  if (len === 2) return [0.05];
  if (len === 3) return [-0.05, 0.6];
  return [-0.1, 0.5, 0.93, ...Array(len - 4).fill(2)];
}

export class PixelCanvas {
  readonly color: (string | null)[];
  readonly part: Int16Array;
  private readonly styles: PartStyle[] = [];

  constructor(readonly width: number, readonly height: number) {
    this.color = new Array(width * height).fill(null);
    this.part = new Int16Array(width * height).fill(-1);
  }

  /** Register a part; parts drawn later sit in front of earlier ones. */
  newPart(style: PartStyle = {}): number {
    this.styles.push(style);
    return this.styles.length - 1;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): string | null {
    return this.inBounds(x, y) ? this.color[y * this.width + x] : null;
  }

  partAt(x: number, y: number): number {
    return this.inBounds(x, y) ? this.part[y * this.width + x] : -1;
  }

  plot(x: number, y: number, color: string, part = -1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inBounds(x, y)) return;
    const i = y * this.width + x;
    this.color[i] = color;
    this.part[i] = part;
  }

  /** Recolour a pixel that is already filled, keeping its part (for details drawn on a part). */
  paint(x: number, y: number, color: string): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inBounds(x, y)) return;
    const i = y * this.width + x;
    if (this.color[i] !== null) this.color[i] = color;
  }

  fill(shape: Shape, ramp: readonly string[], part: number, opts: FillOptions = {}): void {
    const thresholds = opts.thresholds ?? defaultThresholds(ramp.length);
    const [bx0, by0, bx1, by1] = shape.bbox;
    const x0 = Math.max(0, Math.floor(bx0));
    const y0 = Math.max(0, Math.floor(by0));
    const x1 = Math.min(this.width - 1, Math.ceil(bx1));
    const y1 = Math.min(this.height - 1, Math.ceil(by1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const n = shape.sample(x + 0.5, y + 0.5);
        if (!n) continue;
        if (opts.clip && !opts.clip(x, y)) continue;
        let intensity = light(n[0], n[1]);
        if (opts.dither) intensity += (BAYER[(y & 1) * 2 + (x & 1)] / 4 - 0.375) * 0.22;
        let step = 0;
        while (step < thresholds.length && intensity > thresholds[step]) step++;
        this.plot(x, y, ramp[Math.min(step, ramp.length - 1)], part);
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: string, part = -1, onlyOver = false): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (onlyOver) this.paint(x0, y0, color);
      else this.plot(x0, y0, color, part);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Outline pass: inner outlines between overlapping parts, then the outer silhouette. */
  outline(color: string): void {
    const { width: w, height: h } = this;
    const partSnap = Int16Array.from(this.part);
    const colorSnap = this.color.slice();
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const p = partSnap[i];
        if (p >= 0) {
          if (!this.styles[p].innerOutline) continue;
          for (const [dx, dy] of neighbours) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = partSnap[ny * w + nx];
            if (q >= 0 && q < p && this.styles[q].outline) {
              this.color[i] = color;
              break;
            }
          }
        } else if (colorSnap[i] === null) {
          for (const [dx, dy] of neighbours) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = partSnap[ny * w + nx];
            if (q >= 0 && this.styles[q].outline) {
              this.color[i] = color;
              this.part[i] = -2;
              break;
            }
          }
        }
      }
    }
  }
}

function light(nx: number, ny: number): number {
  const d2 = nx * nx + ny * ny;
  const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d2)));
  return nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
}

/** Large heart: two round lobes over a rounded point, so the top dip stays clear. */
function heartCurve(cx: number, cy: number, r: number): Shape {
  const lobeR = r * 0.56, lobeX = r * 0.48, lobeY = cy - r * 0.3;
  const tipY = cy + r * 1.05;
  return {
    bbox: [cx - r * 1.1, lobeY - lobeR, cx + r * 1.1, tipY],
    sample(px, py) {
      const u = (px - cx) / r, v = (py - cy) / r;
      for (const side of [-1, 1]) {
        const du = (px - (cx + side * lobeX)) / lobeR, dv = (py - lobeY) / lobeR;
        if (du * du + dv * dv <= 1) return [u * 0.7, (v + 0.3) * 0.7];
      }
      // Lower body: width shrinks linearly from the lobes' widest point to the tip.
      if (py < lobeY || py > tipY) return null;
      const halfW = (lobeX + lobeR * 0.92) * (1 - (py - lobeY) / (tipY - lobeY));
      return Math.abs(px - cx) <= halfW ? [u * 0.7, (v + 0.3) * 0.7] : null;
    },
  };
}

// ─── Shapes ────────────────────────────────────────────────────────────────

export function ellipse(cx: number, cy: number, rx: number, ry: number): Shape {
  return {
    bbox: [cx - rx, cy - ry, cx + rx, cy + ry],
    sample(px, py) {
      const u = (px - cx) / rx;
      const v = (py - cy) / ry;
      return u * u + v * v <= 1 ? [u, v] : null;
    },
  };
}

/** Superellipse with separate top/bottom radii: Pip's egg-shaped body. */
export function blob(cx: number, cy: number, rx: number, ryTop: number, ryBottom: number, power = 2.3): Shape {
  return {
    bbox: [cx - rx, cy - ryTop, cx + rx, cy + ryBottom],
    sample(px, py) {
      const u = (px - cx) / rx;
      const v = (py - cy) / (py < cy ? ryTop : ryBottom);
      return Math.abs(u) ** power + Math.abs(v) ** power <= 1 ? [u, v] : null;
    },
  };
}

/** A rounded limb between two points. */
export function capsule(ax: number, ay: number, bx: number, by: number, r: number): Shape {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  return {
    bbox: [Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r],
    sample(px, py) {
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const u = (px - (ax + dx * t)) / r;
      const v = (py - (ay + dy * t)) / r;
      return u * u + v * v <= 1 ? [u, v] : null;
    },
  };
}

export function rect(x: number, y: number, w: number, h: number): Shape {
  return {
    bbox: [x, y, x + w, y + h],
    sample(px, py) {
      if (px < x || py < y || px > x + w || py > y + h) return null;
      // Gentle pillow shading: brighter towards the top-left.
      return [((px - x) / w - 0.5) * 0.9, ((py - y) / h - 0.5) * 0.9];
    },
  };
}

// Pixel hearts read better than a sampled curve at small sizes, so small hearts use glyphs.
const HEART_GLYPHS = [
  ['.1..1.', '111111', '111111', '.1111.', '..11..'],
  ['.11..11.', '11111111', '11111111', '11111111', '.111111.', '..1111..', '...11...'],
  ['.111..111.', '1111111111', '1111111111', '1111111111', '.11111111.', '..111111..', '...1111...', '....11....'],
  ['..111..111..', '.1111111111.', '111111111111', '111111111111', '111111111111', '.1111111111.', '..11111111..', '...111111...', '....1111....', '.....11.....'],
];

/** Symmetric pixel heart, point-down; `r` is roughly half its width. */
export function heart(cx: number, cy: number, r: number): Shape {
  if (r >= 5.5) return heartCurve(cx, cy, r);
  const glyph = HEART_GLYPHS[Math.max(0, Math.min(HEART_GLYPHS.length - 1, Math.round(r) - 3))];
  const w = glyph[0].length, h = glyph.length;
  const x0 = Math.round(cx) - w / 2;
  const y0 = Math.round(cy - h / 2);
  return {
    bbox: [x0, y0, x0 + w - 1, y0 + h - 1],
    sample(px, py) {
      const gx = Math.floor(px - x0), gy = Math.floor(py - y0);
      if (gx < 0 || gy < 0 || gx >= w || gy >= h || glyph[gy][gx] !== '1') return null;
      return [((gx + 0.5) / w - 0.5) * 1.6, ((gy + 0.5) / h - 0.5) * 1.6];
    },
  };
}

/** Heater shield: flat top, pointed bottom. */
export function shield(cx: number, cy: number, halfW: number, halfH: number): Shape {
  return {
    bbox: [cx - halfW, cy - halfH, cx + halfW, cy + halfH],
    sample(px, py) {
      const u = (px - cx) / halfW;
      const v = (py - cy) / halfH; // -1 top … 1 point
      if (v < -1 || v > 1) return null;
      const limit = v < 0.1 ? 1 : 1 - (v - 0.1) / 0.9;
      if (Math.abs(u) > limit) return null;
      if (v < -0.75 && Math.abs(u) > 0.78 && (Math.abs(u) - 0.78) ** 2 + (v + 0.75) ** 2 > 0.06) return null;
      return [u * 0.8, v * 0.6];
    },
  };
}

export function triangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): Shape {
  const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3;
  const span = Math.max(Math.hypot(ax - mx, ay - my), Math.hypot(bx - mx, by - my), Math.hypot(cx - mx, cy - my));
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  return {
    bbox: [Math.min(ax, bx, cx), Math.min(ay, by, cy), Math.max(ax, bx, cx), Math.max(ay, by, cy)],
    sample(px, py) {
      const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / area;
      const w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) return null;
      return [(px - mx) / span, (py - my) / span];
    },
  };
}
