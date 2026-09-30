// Dev helper: minimal PNG encoder for rendering Pip frames outside the browser.
import { deflateSync } from 'node:zlib';
import type { PipFrame } from '../src/pip/render';

export function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Lay frames out in a grid on the room-wall colour and encode as PNG. */
export function encodeSheet(rows: PipFrame[][], scale: number, background = [242, 242, 242, 255]): Buffer {
  const cell = 64 * scale;
  const cols = Math.max(...rows.map((r) => r.length));
  const W = cols * cell, H = rows.length * cell;
  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set(background, i * 4);
  rows.forEach((row, r) => row.forEach((f, col) => {
    for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
      const c = f.pixels[y * f.width + x];
      if (!c) continue;
      const v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        rgba.set(v, ((r * cell + y * scale + sy) * W + col * cell + x * scale + sx) * 4);
      }
    }
  }));
  return png(W, H, rgba);
}
