import { deflateSync } from "node:zlib";

const SIZE = 512;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RGB { r: number; g: number; b: number; }

function hslToRgb(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function blendColor(base: RGB, overlay: RGB, alpha: number): RGB {
  return {
    r: Math.round(base.r * (1 - alpha) + overlay.r * alpha),
    g: Math.round(base.g * (1 - alpha) + overlay.g * alpha),
    b: Math.round(base.b * (1 - alpha) + overlay.b * alpha),
  };
}

function generatePattern(rand: () => number): boolean[][] {
  const grid: boolean[][] = [];
  for (let row = 0; row < 7; row++) {
    grid[row] = [];
    for (let col = 0; col < 4; col++) grid[row][col] = rand() > 0.5;
    grid[row][4] = grid[row][2];
    grid[row][5] = grid[row][1];
    grid[row][6] = grid[row][0];
  }
  return grid;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(width: number, height: number, pixels: Buffer): Buffer {
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      const dstIdx = rowOffset + 1 + x * 3;
      rawData[dstIdx] = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
    }
  }
  const compressed = deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; ihdrData[9] = 2;
  return Buffer.concat([signature, makeChunk("IHDR", ihdrData), makeChunk("IDAT", compressed), makeChunk("IEND", Buffer.alloc(0))]);
}

function isOutsideRoundedRect(x: number, y: number, w: number, h: number, r: number): boolean {
  if (x < r && y < r) return (r - x) ** 2 + (r - y) ** 2 > r ** 2;
  if (x >= w - r && y < r) return (x - (w - r - 1)) ** 2 + (r - y) ** 2 > r ** 2;
  if (x < r && y >= h - r) return (r - x) ** 2 + (y - (h - r - 1)) ** 2 > r ** 2;
  if (x >= w - r && y >= h - r) return (x - (w - r - 1)) ** 2 + (y - (h - r - 1)) ** 2 > r ** 2;
  return false;
}

export function generateTokenLogo(name: string, symbol: string): Buffer {
  const seed = hashString(`${name}:${symbol}`);
  const rand = mulberry32(seed);

  const hue1 = Math.floor(rand() * 360);
  const hue2 = (hue1 + 90 + Math.floor(rand() * 90)) % 360;
  const color1 = hslToRgb(hue1, 0.65, 0.5);
  const color2 = hslToRgb(hue2, 0.55, 0.35);
  const patternColor = hslToRgb(hue1, 0.4, 0.9);
  const pattern = generatePattern(rand);

  const pixels = Buffer.alloc(SIZE * SIZE * 3);
  const gridSize = 7;
  const cellPx = 36;
  const gridWidth = gridSize * cellPx;
  const offsetX = Math.floor((SIZE - gridWidth) / 2);
  const offsetY = Math.floor((SIZE - gridWidth) / 2);
  const cornerRadius = 48;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 3;
      if (isOutsideRoundedRect(x, y, SIZE, SIZE, cornerRadius)) {
        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 0;
        continue;
      }
      const t = (x + y) / (SIZE * 2);
      let color = lerpColor(color1, color2, t);
      const gx = x - offsetX;
      const gy = y - offsetY;
      if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridWidth) {
        const col = Math.floor(gx / cellPx);
        const row = Math.floor(gy / cellPx);
        if (col < gridSize && row < gridSize && pattern[row][col]) {
          color = blendColor(color, patternColor, 0.35);
        }
      }
      pixels[idx] = color.r;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.b;
    }
  }

  return encodePng(SIZE, SIZE, pixels);
}
