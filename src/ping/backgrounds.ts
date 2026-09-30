// Procedural pixel backgrounds for Ping's room. Each achievement unlocks one; harder
// achievements unlock rarer, more elaborate (and often animated) scenes.
// Scenes are drawn on the same 128×128 grid as Ping (floor at GROUND).

import { ellipse, PixelCanvas, triangle, type Shape } from './raster';
import { GROUND, PING_CANVAS, type PingFrame } from './render';
import { mulberry32 } from './traits';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BackgroundDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Achievement that unlocks it; null for the default room. */
  achievement: string | null;
  animated?: boolean;
  draw(c: PixelCanvas, t: number, frame: number): void;
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

const W = PING_CANVAS;
const H = PING_CANVAS;
const G = GROUND;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ─── Drawing helpers ───────────────────────────────────────────────────────

function rect(c: PixelCanvas, x: number, y: number, w: number, h: number, color: string): void {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.floor(x + w)), y1 = Math.min(H, Math.floor(y + h));
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) c.plot(xx, yy, color);
}

/** Vertical gradient through `colors`, dithered with a 4×4 Bayer matrix. */
function vgrad(c: PixelCanvas, x0: number, x1: number, y0: number, y1: number, colors: string[]): void {
  for (let y = y0; y < y1; y++) {
    const pos = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(pos));
    const f = pos - i;
    for (let x = x0; x < x1; x++) c.plot(x, y, f > BAYER4[(y % 4) * 4 + (x % 4)] / 16 ? colors[i + 1] : colors[i]);
  }
}

function each(shape: Shape, fn: (x: number, y: number) => void): void {
  const [x0, y0, x1, y1] = shape.bbox;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (shape.sample(x + 0.5, y + 0.5)) fn(x, y);
  }
}

function disc(c: PixelCanvas, cx: number, cy: number, rx: number, color: string, ry = rx): void {
  each(ellipse(cx, cy, rx, ry), (x, y) => c.plot(x, y, color));
}

function floor(c: PixelCanvas, color: string, line: string): void {
  rect(c, 0, G, W, H - G, color);
  rect(c, 0, G, W, 2, line);
}

/** A soft dithered glow behind Ping so it stays readable on dark scenes. */
function halo(c: PixelCanvas, color: string): void {
  each(ellipse(W / 2, G - 34, 40, 44), (x, y) => {
    if (y < G && x % 2 === 0 && y % 2 === 0) c.plot(x, y, color);
  });
}

function stars(c: PixelCanvas, count: number, maxY: number, frame: number, seed: number): void {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * W), y = Math.floor(rand() * maxY), big = rand() < 0.15;
    if ((frame + i * 3) % 14 >= 11) continue;
    c.plot(x, y, rand() < 0.3 ? '#FFC4AE' : '#FFFFFF');
    if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.plot(x + dx, y + dy, '#8FA3D9');
  }
}

function cloud(c: PixelCanvas, x: number, y: number, s: number, color = '#FFFFFF'): void {
  disc(c, x, y, 4 * s, color, 3 * s);
  disc(c, x + 5 * s, y - 2 * s, 5 * s, color, 4 * s);
  disc(c, x + 11 * s, y, 4 * s, color, 3 * s);
  rect(c, x, y, 11 * s, 3 * s, color);
}

function ridge(c: PixelCanvas, base: number, amp: number, freq: number, phase: number, color: string, to = G): void {
  for (let x = 0; x < W; x++) {
    const top = Math.round(base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.4);
    rect(c, x, top, 1, to - top, color);
  }
}

// ─── Scenes ────────────────────────────────────────────────────────────────

export const BACKGROUNDS: BackgroundDef[] = [
  {
    id: 'room', name: 'Ping’s Room', rarity: 'common', achievement: null,
    draw(c) {
      rect(c, 0, 0, W, G, '#F2F2F2');
      for (let y = 4, row = 0; y < G; y += 12, row++) for (let x = row % 2 ? 6 : 1; x < W; x += 12) c.plot(x, y, '#E6E5E8');
      floor(c, '#D6D5D9', '#232323');
    },
  },

  // ── Common ──
  {
    id: 'mailroom', name: 'Mailroom', rarity: 'common', achievement: 'hatchling',
    draw(c) {
      rect(c, 0, 0, W, G, '#EDE6D8');
      rect(c, 4, 10, 120, 3, '#5A3A26');
      rect(c, 6, 13, 116, 68, '#7A5236');
      const rand = mulberry32(11);
      for (let r = 0; r < 6; r++) for (let col = 0; col < 8; col++) {
        const x = 8 + col * 14, y = 15 + r * 11;
        rect(c, x, y, 13, 10, '#4A3222');
        if (rand() < 0.55) {
          rect(c, x + 2, y + 3, 9, 6, '#FFFFFF');
          c.line(x + 2, y + 3, x + 6, y + 6, '#D6D5D9');
          c.line(x + 10, y + 3, x + 6, y + 6, '#D6D5D9');
          c.plot(x + 6, y + 6, '#FF5B23');
        }
      }
      floor(c, '#C49A6C', '#5A3A26');
    },
  },
  {
    id: 'cafe', name: 'Café Chat', rarity: 'common', achievement: 'first-contact',
    draw(c) {
      rect(c, 0, 0, W, G, '#A9472F');
      for (let y = 0, row = 0; y < G; y += 6, row++) {
        rect(c, 0, y, W, 1, '#C9826A');
        for (let x = (row % 2) * 6; x < W; x += 12) rect(c, x, y, 1, 6, '#C9826A');
      }
      for (const x of [22, 106]) {
        c.line(x, 0, x, 14, '#232323');
        each(ellipse(x, 24, 11, 9), (px, py) => { if ((px + py) % 2 === 0) c.plot(px, py, '#E8A07F'); });
        rect(c, x - 5, 14, 11, 4, '#232323');
        rect(c, x - 1, 18, 3, 2, '#FFE58A');
      }
      floor(c, '#3A393E', '#232323');
    },
  },
  {
    id: 'sunny-window', name: 'Sunny Window', rarity: 'common', achievement: 'pen-pal',
    draw(c) {
      rect(c, 0, 0, W, G, '#F4EBDD');
      rect(c, 30, 8, 68, 56, '#FFFFFF');
      vgrad(c, 33, 95, 11, 61, ['#8CCBEF', '#CDEBFA']);
      disc(c, 84, 22, 6, '#FFD34D');
      cloud(c, 40, 30, 1);
      rect(c, 63, 11, 2, 50, '#FFFFFF');
      rect(c, 33, 35, 62, 2, '#FFFFFF');
      rect(c, 26, 62, 76, 3, '#D6CBB8');
      rect(c, 18, 5, 92, 2, '#7A5236');
      for (const x0 of [20, 96]) {
        rect(c, x0, 7, 12, 66, '#FF8A63');
        for (let x = x0 + 2; x < x0 + 12; x += 4) rect(c, x, 7, 1, 66, '#FF5B23');
      }
      floor(c, '#D8C3A0', '#8A6A48');
    },
  },
  {
    id: 'cork-board', name: 'Cork Board', rarity: 'common', achievement: 'believer',
    draw(c) {
      rect(c, 0, 0, W, G, '#DDE4EA');
      rect(c, 12, 10, 104, 62, '#7A5236');
      rect(c, 15, 13, 98, 56, '#C9A27A');
      const rand = mulberry32(5);
      for (let i = 0; i < 140; i++) c.plot(15 + Math.floor(rand() * 98), 13 + Math.floor(rand() * 56), '#B08660');
      const notes: [number, number, string][] = [[20, 18, '#FFF4B0'], [44, 22, '#FFFFFF'], [70, 16, '#DAD2F0'], [92, 22, '#B0E6E1'], [24, 44, '#FFC4AE'], [84, 46, '#FFF4B0']];
      const pins: [number, number][] = [];
      for (const [x, y, color] of notes) {
        rect(c, x + 1, y + 1, 16, 14, '#8A6A48');
        rect(c, x, y, 16, 14, color);
        for (let l = 0; l < 3; l++) rect(c, x + 3, y + 5 + l * 3, 10 - (l % 2) * 3, 1, '#A3A1A8');
        pins.push([x + 8, y + 1]);
      }
      for (let i = 0; i < pins.length - 1; i += 2) c.line(pins[i][0], pins[i][1], pins[i + 1][0], pins[i + 1][1], '#C9401A');
      for (const [x, y] of pins) disc(c, x, y, 1.6, '#E0506E');
      floor(c, '#C3C9D0', '#6E6C73');
    },
  },

  // ── Uncommon ──
  {
    id: 'map-room', name: 'Map Room', rarity: 'uncommon', achievement: 'four-corners',
    draw(c) {
      rect(c, 0, 0, W, G, '#EADFC4');
      rect(c, 10, 8, 108, 66, '#7A5236');
      rect(c, 13, 11, 102, 60, '#9CC9D8');
      for (let y = 17; y < 71; y += 12) rect(c, 13, y, 102, 1, '#B8DAE5');
      for (let x = 25; x < 115; x += 16) rect(c, x, 11, 1, 60, '#B8DAE5');
      for (const [x, y, rx, ry] of [[32, 30, 12, 9], [38, 50, 7, 10], [70, 28, 14, 8], [80, 46, 8, 12], [102, 58, 7, 6]]) {
        disc(c, x, y, rx, '#93A96E', ry);
        disc(c, x - 1, y - 1, rx - 1, '#B7C98F', ry - 1);
      }
      for (let i = 0; i < 12; i++) c.plot(40 + i * 3, 50 - i * 1.6, i % 2 ? '#E0506E' : '#9CC9D8');
      c.line(100, 16, 100, 30, '#FF5B23');
      c.line(93, 23, 107, 23, '#FF5B23');
      disc(c, 100, 23, 2, '#FFFFFF');
      floor(c, '#B99A6B', '#6B4A2E');
    },
  },
  {
    id: 'rainy-window', name: 'Rainy Window', rarity: 'uncommon', achievement: 'persistence', animated: true,
    draw(c, t) {
      rect(c, 0, 0, W, G, '#C3C8D2');
      rect(c, 28, 8, 72, 58, '#EDEFF3');
      vgrad(c, 31, 97, 11, 63, ['#56637A', '#7D8AA3']);
      const rand = mulberry32(8);
      for (let i = 0; i < 45; i++) {
        const x0 = 31 + rand() * 66, y0 = rand() * 52, speed = 50 + rand() * 30;
        const y = 11 + ((y0 + t * speed) % 52);
        for (let k = 0; k < 4; k++) {
          const px = Math.floor(x0 - k * 0.5 - (t * 8) % 66), py = Math.floor(y - k);
          const wx = ((px - 31) % 66 + 66) % 66 + 31;
          if (py >= 11 && py < 63) c.plot(wx, py, '#B8C8DD');
        }
      }
      for (let i = 0; i < 10; i++) disc(c, 35 + rand() * 58, 14 + rand() * 46, 1, '#9FB0C8');
      rect(c, 63, 11, 2, 52, '#EDEFF3');
      rect(c, 31, 36, 66, 2, '#EDEFF3');
      rect(c, 24, 64, 80, 3, '#DCDFE6');
      floor(c, '#8E95A3', '#4A5060');
    },
  },
  {
    id: 'sunset', name: 'Sunset', rarity: 'uncommon', achievement: 'streak-week',
    draw(c) {
      vgrad(c, 0, W, 0, 100, ['#4B3A78', '#8E4F8E', '#E0506E', '#FF8A63', '#FFC4AE']);
      each(ellipse(64, 92, 20, 20), (x, y) => { if (y < 92 && ![80, 84, 87, 90].includes(y)) c.plot(x, y, '#FFE08A'); });
      ridge(c, 90, 3, 0.05, 1, '#6A4C7A');
      ridge(c, 100, 4, 0.04, 3, '#3E2F55');
      floor(c, '#2B2238', '#1A1426');
    },
  },
  {
    id: 'library', name: 'Library', rarity: 'uncommon', achievement: 'category-academia',
    draw(c) {
      rect(c, 0, 0, W, G, '#4A3222');
      const colors = ['#8E7CC3', '#5C7C99', '#E0506E', '#2FA39A', '#FF8A63', '#D6CBB8', '#C9401A', '#B7AADD'];
      const rand = mulberry32(21);
      for (const y of [4, 26, 48, 70, 92]) {
        rect(c, 0, y + 18, W, 3, '#7A5236');
        for (let x = 1; x < W - 3;) {
          const w = 3 + Math.floor(rand() * 3), h = 11 + Math.floor(rand() * 6);
          const color = colors[Math.floor(rand() * colors.length)];
          rect(c, x, y + 18 - h, w, h, color);
          rect(c, x, y + 18 - h + 2, w, 1, '#FFFFFF');
          x += w + (rand() < 0.2 ? 2 : 0);
        }
      }
      halo(c, '#E8D8C0');
      floor(c, '#5A3A26', '#2E1E14');
      disc(c, 64, 122, 44, '#8E7CC3', 4);
    },
  },
  {
    id: 'game-studio', name: 'Game Studio', rarity: 'uncommon', achievement: 'category-industry',
    draw(c) {
      rect(c, 0, 0, W, G, '#39424F');
      rect(c, 0, 5, W, 2, '#FF8A63');
      rect(c, 8, 14, 20, 26, '#FF5B23');
      rect(c, 11, 17, 14, 14, '#FFFFFF');
      rect(c, 15, 21, 6, 6, '#232323');
      rect(c, 100, 16, 20, 24, '#2FA39A');
      disc(c, 110, 26, 5, '#B0E6E1');
      const rand = mulberry32(4);
      for (const x0 of [4, 94]) {
        rect(c, x0 - 4, 84, 38, 3, '#6E6C73');
        rect(c, x0, 87, 2, G - 87, '#6E6C73');
        rect(c, x0 + 28, 87, 2, G - 87, '#6E6C73');
        rect(c, x0 + 2, 60, 26, 20, '#1B1F2E');
        rect(c, x0 + 4, 62, 22, 16, '#86A2BC');
        for (let l = 0; l < 5; l++) rect(c, x0 + 6, 64 + l * 3, 4 + Math.floor(rand() * 14), 1, l % 2 ? '#FF8A63' : '#DAD2F0');
        rect(c, x0 + 13, 80, 4, 4, '#1B1F2E');
      }
      halo(c, '#5A6578');
      floor(c, '#2D3440', '#1B1F2E');
    },
  },
  {
    id: 'garden', name: 'Community Garden', rarity: 'uncommon', achievement: 'category-organizations',
    draw(c) {
      vgrad(c, 0, W, 0, 80, ['#9FD6F2', '#DDF1FB']);
      disc(c, 108, 16, 7, '#FFE08A');
      cloud(c, 14, 20, 1);
      for (let x = 0; x < W; x += 14) disc(c, x, 74, 9, '#8CC784', 8);
      rect(c, 0, 74, W, G - 74, '#8CC784');
      for (let x = 2; x < W; x += 8) {
        rect(c, x, 74, 5, 28, '#FFFFFF');
        c.plot(x + 2, 73, '#FFFFFF');
        rect(c, x + 4, 76, 1, 26, '#E6E5E8');
      }
      rect(c, 0, 80, W, 2, '#E6E5E8');
      rect(c, 0, 94, W, 2, '#E6E5E8');
      const rand = mulberry32(9);
      const flowers = ['#E0506E', '#FF8A63', '#B7AADD', '#FFFFFF', '#FFD34D'];
      for (let x = 4; x < W; x += 16) {
        disc(c, x, 106, 8, '#6FAF5A', 6);
        for (let i = 0; i < 5; i++) disc(c, x - 5 + rand() * 10, 101 + rand() * 8, 1.2, flowers[Math.floor(rand() * flowers.length)]);
      }
      floor(c, '#7BC26A', '#5C9A4E');
    },
  },
  {
    id: 'capitol', name: 'Capitol Steps', rarity: 'uncommon', achievement: 'category-government',
    draw(c) {
      vgrad(c, 0, W, 0, G, ['#B9D8EE', '#E6F1F8', '#E6F1F8']);
      each(ellipse(64, 26, 15, 15), (x, y) => { if (y <= 26) c.plot(x, y, x < 64 ? '#EFEAE0' : '#DDD7C9'); });
      rect(c, 62, 5, 4, 7, '#E8E3D6');
      c.line(64, 0, 64, 5, '#6E6C73');
      rect(c, 65, 0, 5, 3, '#FF5B23');
      rect(c, 46, 26, 36, 6, '#E8E3D6');
      each(triangle(6, 42, 122, 42, 64, 28), (x, y) => c.plot(x, y, '#EFEAE0'));
      c.line(6, 42, 64, 28, '#C9C3B4');
      c.line(122, 42, 64, 28, '#C9C3B4');
      rect(c, 10, 42, 108, 4, '#D6D0C2');
      rect(c, 10, 46, 108, 44, '#E8E3D6');
      for (let x = 15; x < 114; x += 12) {
        rect(c, x, 46, 6, 44, '#FFFFFF');
        rect(c, x + 5, 46, 1, 44, '#D6D0C2');
      }
      for (let i = 0; i < 5; i++) rect(c, 2, 90 + i * 5, 124, 5, i % 2 ? '#DDD7C9' : '#E8E3D6');
      floor(c, '#CFC8B8', '#9C9586');
    },
  },

  // ── Rare ──
  {
    id: 'expo-hall', name: 'Expo Hall', rarity: 'rare', achievement: 'signed-sealed', animated: true,
    draw(c, t) {
      rect(c, 0, 0, W, G, '#2D2C31');
      rect(c, 0, 6, W, 1, '#6E6C73');
      rect(c, 0, 11, W, 1, '#6E6C73');
      for (let x = 0; x < W; x += 8) c.line(x, 6, x + 4, 11, '#6E6C73');
      for (const [x, color] of [[48, '#8E7CC3'], [70, '#FF8A63']] as const) {
        rect(c, x, 14, 10, 24, color);
        each(triangle(x, 38, x + 10, 38, x + 5, 42), (px, py) => c.plot(px, py, color));
      }
      for (const [x, color] of [[4, '#FF5B23'], [90, '#2FA39A']] as const) {
        rect(c, x, 58, 34, G - 58, '#3A393E');
        rect(c, x, 50, 34, 8, color);
        rect(c, x + 4, 53, 26, 1, '#FFFFFF');
        rect(c, x + 6, 70, 22, 12, '#232323');
        rect(c, x + 8, 72, 18, 8, color);
      }
      const sway = Math.sin(t * 0.8) * 10;
      for (const [sx, tx] of [[20, 64 + sway], [108, 64 - sway]]) {
        each(triangle(sx - 2, 12, sx + 2, 12, tx, G), (x, y) => { if ((x + y) % 3 === 0) c.plot(x, y, '#FFE9D6'); });
      }
      halo(c, '#57555C');
      floor(c, '#3A393E', '#1B1B1B');
      rect(c, 40, G + 2, 48, H - G - 2, '#C9401A');
    },
  },
  {
    id: 'ocean', name: 'Ocean Breeze', rarity: 'rare', achievement: 'the-ripple', animated: true,
    draw(c, t) {
      vgrad(c, 0, W, 0, 64, ['#8FCFF0', '#D8F0FB']);
      disc(c, 24, 18, 7, '#FFE08A');
      cloud(c, 80, 20, 1.2);
      vgrad(c, 0, W, 64, 100, ['#2FA39A', '#1D6E68']);
      for (let y = 67, row = 0; y < 100; y += 5, row++) {
        for (let x = 0; x < W; x++) if ((x + Math.floor(t * (8 + row)) + row * 7) % 18 < 3) c.plot(x, y, '#B0E6E1');
      }
      rect(c, 0, 100, W, G - 100, '#F2D9A6');
      for (let x = 0; x < W; x++) if ((x + Math.floor(t * 6)) % 10 < 6) c.plot(x, 100 + Math.round(Math.sin(x * 0.2 + t * 2)), '#FFFFFF');
      floor(c, '#F2D9A6', '#D9BD86');
    },
  },
  {
    id: 'network', name: 'The Network', rarity: 'rare', achievement: 'chain-reaction', animated: true,
    draw(c, t) {
      vgrad(c, 0, W, 0, G, ['#141B2D', '#1F2A44']);
      const rand = mulberry32(13);
      const nodes = Array.from({ length: 18 }, () => [4 + rand() * 120, 4 + rand() * 104] as [number, number]);
      const edges: [number, number][] = [];
      nodes.forEach((a, i) => {
        const near = nodes.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1])] as const).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2);
        for (const [j] of near) if (i < j) edges.push([i, j]);
      });
      for (const [i, j] of edges) c.line(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1], '#34436A');
      edges.forEach(([i, j], k) => {
        const p = (t * 0.5 + k * 0.37) % 1;
        c.plot(nodes[i][0] + (nodes[j][0] - nodes[i][0]) * p, nodes[i][1] + (nodes[j][1] - nodes[i][1]) * p, '#FFC4AE');
      });
      const colors = ['#6CCBC3', '#FF8A63', '#B7AADD'];
      nodes.forEach(([x, y], i) => disc(c, x, y, 1.8, colors[i % 3]));
      halo(c, '#35456B');
      floor(c, '#1B2335', '#34436A');
    },
  },
  {
    id: 'starry-night', name: 'Starry Night', rarity: 'rare', achievement: 'perfect-day', animated: true,
    draw(c, _t, frame) {
      vgrad(c, 0, W, 0, G, ['#0F1530', '#28336A']);
      stars(c, 60, 90, frame, 3);
      disc(c, 100, 22, 9, '#FFF3C4');
      disc(c, 104, 19, 8, '#131A38');
      ridge(c, 100, 3, 0.05, 2, '#1B2240');
      halo(c, '#3A4580');
      floor(c, '#161C36', '#0A0E20');
    },
  },
  {
    id: 'dawn', name: 'New Dawn', rarity: 'rare', achievement: 'comeback-kid',
    draw(c) {
      vgrad(c, 0, W, 0, 92, ['#8DB8E8', '#F7D6C8', '#FFB38A']);
      each(ellipse(64, 88, 13, 13), (x, y) => { if (y < 88) c.plot(x, y, '#FFD37A'); });
      ridge(c, 78, 8, 0.06, 0.5, '#B7AADD', 96);
      ridge(c, 88, 6, 0.08, 2.5, '#8E7CC3', 100);
      for (let x = 0; x < W; x++) if ((x + 88) % 3 === 0) c.plot(x, 88 + (x % 2), '#FFFFFF');
      rect(c, 0, 98, W, G - 98, '#9CCB7F');
      floor(c, '#8BBF6E', '#5E8F48');
    },
  },

  // ── Epic ──
  {
    id: 'city-night', name: 'City at Night', rarity: 'epic', achievement: 'the-conversation', animated: true,
    draw(c, _t, frame) {
      vgrad(c, 0, W, 0, G, ['#1E2447', '#4B3A78', '#8E4F8E']);
      stars(c, 25, 40, frame, 7);
      disc(c, 20, 16, 5, '#FFF3C4');
      const rand = mulberry32(17);
      for (let x = 0; x < W;) {
        const w = 10 + Math.floor(rand() * 14), h = 30 + Math.floor(rand() * 50);
        rect(c, x, G - h, w, h, '#161A2E');
        for (let wy = G - h + 3; wy < G - 4; wy += 4) {
          for (let wx = x + 2; wx < x + w - 2; wx += 3) {
            const lit = rand() < 0.4, flicker = lit && rand() < 0.1 && (frame + wx) % 20 < 3;
            if (lit && !flicker) rect(c, wx, wy, 2, 2, '#FFD34D');
          }
        }
        x += w + 1;
      }
      halo(c, '#4C4575');
      floor(c, '#2D2C31', '#FF8A63');
    },
  },
  {
    id: 'arcade', name: 'Retro Arcade', rarity: 'epic', achievement: 'well-rounded', animated: true,
    draw(c, _t, frame) {
      rect(c, 0, 0, W, G, '#1E1630');
      const neon = ['#FF5B23', '#2FA39A', '#8E7CC3', '#E0506E'];
      for (let i = 0; i < 4; i++) rect(c, 24 + i * 20, 8, 18, 3, neon[(i + Math.floor(frame / 5)) % 4]);
      const cabinets: [number, string][] = [[2, '#5E4F8F'], [28, '#1D6E68'], [76, '#A3304B'], [102, '#C9401A']];
      cabinets.forEach(([x, color], i) => {
        rect(c, x, G - 62, 24, 62, color);
        rect(c, x + 2, G - 60, 20, 6, neon[i]);
        rect(c, x + 3, G - 50, 18, 16, '#0B0B12');
        for (let b = 0; b < 4; b++) rect(c, x + 5 + b * 4, G - 46 + ((frame + b * 3 + i) % 8), 2, 2, neon[(i + b) % 4]);
        rect(c, x + 2, G - 32, 20, 4, '#232323');
        disc(c, x + 7, G - 31, 1.5, '#FFFFFF');
        disc(c, x + 16, G - 31, 1.5, neon[(i + 1) % 4]);
      });
      halo(c, '#3C2E5C');
      for (let y = G; y < H; y++) for (let x = 0; x < W; x++) c.plot(x, y, ((x >> 2) + (y >> 2)) % 2 ? '#F2F2F2' : '#232323');
    },
  },
  {
    id: 'paper-sky', name: 'Paper Airplane Sky', rarity: 'epic', achievement: 'postmaster', animated: true,
    draw(c, t) {
      vgrad(c, 0, W, 0, G, ['#BFE4FA', '#F4FBFF']);
      cloud(c, 6, 30, 1.3);
      cloud(c, 80, 18, 1);
      cloud(c, 60, 60, 0.8);
      const rand = mulberry32(31);
      for (let i = 0; i < 7; i++) {
        const y0 = 10 + rand() * 80, speed = 10 + rand() * 12, x0 = rand() * 160;
        const x = ((x0 + t * speed) % 160) - 16, y = y0 + Math.sin(t * 1.5 + i) * 3;
        for (let k = 1; k < 7; k++) c.plot(x - k * 3, y + 4, '#A3A1A8');
        each(triangle(x, y, x + 12, y + 4, x, y + 5), (px, py) => c.plot(px, py, '#FFFFFF'));
        each(triangle(x, y + 5, x + 12, y + 4, x + 2, y + 8), (px, py) => c.plot(px, py, '#D6D5D9'));
        c.line(x, y, x + 12, y + 4, '#6E6C73');
        c.line(x + 2, y + 8, x + 12, y + 4, '#6E6C73');
      }
      for (let x = 0; x < W; x += 12) disc(c, x, G, 9, '#FFFFFF', 6);
      floor(c, '#EAF4FB', '#FFFFFF');
    },
  },

  // ── Legendary ──
  {
    id: 'stage', name: 'Showcase Stage', rarity: 'legendary', achievement: 'showrunner', animated: true,
    draw(c, t) {
      rect(c, 0, 0, W, G, '#1B1B1E');
      const sway = Math.sin(t * 0.9) * 12;
      for (const [sx, tx] of [[30, 64 - sway], [98, 64 + sway]]) {
        each(triangle(sx - 3, 12, sx + 3, 12, tx, G), (x, y) => { if ((x + y) % 3 === 0) c.plot(x, y, '#FFE9D6'); });
      }
      for (const [x0, w] of [[0, 26], [102, 26]]) {
        rect(c, x0, 0, w, G, '#C9401A');
        for (let x = x0; x < x0 + w; x++) {
          const k = (x - x0) % 6;
          if (k === 0) rect(c, x, 0, 1, G, '#8A2A0B');
          if (k === 3) rect(c, x, 0, 1, G, '#FF5B23');
        }
      }
      rect(c, 0, 0, W, 10, '#FF5B23');
      for (let x = 6; x < W; x += 12) disc(c, x, 10, 6, '#FF5B23', 4);
      rect(c, 0, 2, W, 1, '#FFD34D');
      each(ellipse(64, G, 30, 5), (x, y) => { if ((x + y) % 2 === 0) c.plot(x, y, '#FFE9D6'); });
      rect(c, 0, G, W, H - G, '#7A5236');
      for (let y = G + 3; y < H; y += 4) rect(c, 0, y, W, 1, '#5A3A26');
      rect(c, 0, G, W, 1, '#FFD34D');
      each(ellipse(64, G + 2, 30, 3), (x, y) => { if ((x + y) % 2 === 0) c.plot(x, y, '#E8C29A'); });
    },
  },
  {
    id: 'aurora', name: 'Aurora', rarity: 'legendary', achievement: 'streak-month', animated: true,
    draw(c, t, frame) {
      vgrad(c, 0, W, 0, G, ['#0B1022', '#18264A']);
      stars(c, 50, 70, frame, 11);
      const bands = ['#6CCBC3', '#B7AADD', '#2FA39A'];
      for (let k = 0; k < 3; k++) {
        for (let x = 0; x < W; x++) {
          const cy = 26 + k * 11 + Math.sin(x * 0.07 + t * 1.1 + k * 1.7) * 7;
          for (let dy = -7; dy <= 7; dy++) {
            const y = Math.round(cy + dy);
            const strength = (1 - Math.abs(dy) / 7) * 0.8;
            if (y >= 0 && strength > BAYER4[((y & 3) << 2) + (x & 3)] / 16) c.plot(x, y, bands[k]);
          }
        }
      }
      ridge(c, 96, 5, 0.05, 1.2, '#C3D2E0');
      ridge(c, 104, 3, 0.07, 3, '#DDE7F0');
      halo(c, '#2C3E6B');
      floor(c, '#EEF4F9', '#C3D2E0');
    },
  },
  {
    id: 'hall-of-fame', name: 'Hall of Fame', rarity: 'legendary', achievement: 'hall-of-fame', animated: true,
    draw(c, t, frame) {
      vgrad(c, 0, W, 0, G, ['#3A2A12', '#5A4020']);
      for (const x of [6, 30, 88, 112]) {
        rect(c, x - 1, 6, 12, 4, '#FFD34D');
        rect(c, x, 10, 10, G - 10, '#E0A93A');
        rect(c, x + 2, 10, 1, G - 10, '#FFE58A');
        rect(c, x + 8, 10, 2, G - 10, '#9C6F1E');
      }
      for (const x of [44, 72]) {
        rect(c, x, 8, 12, 22, '#C9401A');
        each(triangle(x, 30, x + 12, 30, x + 6, 35), (px, py) => c.plot(px, py, '#C9401A'));
        disc(c, x + 6, 18, 2.5, '#FFD34D');
      }
      for (const x of [18, 110]) {
        rect(c, x - 6, G - 22, 12, 22, '#E8E3D6');
        rect(c, x - 6, G - 22, 12, 2, '#FFFFFF');
        disc(c, x, G - 30, 5, '#FFD34D', 6);
        rect(c, x - 2, G - 25, 4, 3, '#E0A93A');
        disc(c, x - 6, G - 31, 2, '#E0A93A');
        disc(c, x + 6, G - 31, 2, '#E0A93A');
        if ((frame + x) % 12 < 4) c.plot(x - 2, G - 33, '#FFFFFF');
      }
      halo(c, '#8A6A30');
      const rand = mulberry32(41);
      for (let i = 0; i < 40; i++) {
        const x0 = rand() * W, speed = 12 + rand() * 14, color = ['#FFD34D', '#FF8A63', '#FFFFFF'][i % 3];
        const y = (rand() * G + t * speed) % G;
        c.plot(x0 + Math.sin(t * 2 + i) * 2, y, color);
      }
      rect(c, 0, G, W, H - G, '#7A5A22');
      rect(c, 0, G, W, 1, '#FFD34D');
      rect(c, 40, G + 1, 48, H - G - 1, '#C9401A');
      rect(c, 40, G + 1, 1, H - G - 1, '#FFD34D');
      rect(c, 87, G + 1, 1, H - G - 1, '#FFD34D');
    },
  },
];

export const BACKGROUND_BY_ID = new Map(BACKGROUNDS.map((b) => [b.id, b]));

const cache = new Map<string, PingFrame>();

/** Render a background (cached; animated ones are regenerated per 10 fps frame). */
export function renderBackground(id: string, time = 0): PingFrame {
  const def = BACKGROUND_BY_ID.get(id) ?? BACKGROUNDS[0];
  const frame = Math.floor(time * 10);
  const key = def.animated ? `${def.id}:${frame}` : def.id;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = new PixelCanvas(W, H);
  def.draw(c, frame / 10, frame);
  const out: PingFrame = { width: W, height: H, pixels: c.color, form: 'none' };
  if (def.animated) for (const k of cache.keys()) if (k.startsWith(`${def.id}:`)) cache.delete(k);
  cache.set(key, out);
  return out;
}

/** Backgrounds the player has unlocked, given the ids of unlocked achievements. */
export function unlockedBackgrounds(unlockedAchievements: Set<string>): Set<string> {
  return new Set(BACKGROUNDS.filter((b) => !b.achievement || unlockedAchievements.has(b.achievement)).map((b) => b.id));
}
