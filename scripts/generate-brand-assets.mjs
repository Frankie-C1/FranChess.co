import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const source = "C:/Users/Francesco/Downloads/ChatGPT Image 8. Juni 2026, 14_33_14.png";
const publicDir = join(process.cwd(), "public");

if (!existsSync(source)) {
  throw new Error(`Logo source not found: ${source}`);
}

const input = sharp(source).ensureAlpha();
const metadata = await input.metadata();
const width = metadata.width ?? 0;
const height = metadata.height ?? 0;
const raw = await input.raw().toBuffer();
const pixels = new Uint8ClampedArray(raw);
const visited = new Uint8Array(width * height);
const remove = new Uint8Array(width * height);
const queue = [];

function index(x, y) {
  return y * width + x;
}

function offset(x, y) {
  return index(x, y) * 4;
}

function isBackground(x, y) {
  const i = offset(x, y);
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min > 218 && max - min < 24;
}

function addPoint(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const key = index(x, y);
  if (visited[key]) return;
  visited[key] = 1;
  if (isBackground(x, y)) {
    remove[key] = 1;
    queue.push([x, y]);
  }
}

for (let x = 0; x < width; x += 1) {
  addPoint(x, 0);
  addPoint(x, height - 1);
}
for (let y = 0; y < height; y += 1) {
  addPoint(0, y);
  addPoint(width - 1, y);
}

const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const [x, y] = queue[cursor];
  for (const [dx, dy] of dirs) addPoint(x + dx, y + dy);
}

for (let pass = 0; pass < 2; pass += 1) {
  const next = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const key = index(x, y);
      if (remove[key] || !isBackground(x, y)) continue;
      if (dirs.some(([dx, dy]) => remove[index(x + dx, y + dy)])) next[key] = 1;
    }
  }
  for (let i = 0; i < remove.length; i += 1) {
    if (next[i]) remove[i] = 1;
  }
}

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (!remove[index(x, y)]) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

const pad = 22;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (remove[index(x, y)]) {
      const i = offset(x, y);
      pixels[i + 3] = 0;
    }
  }
}

const cropWidth = maxX - minX + 1;
const cropHeight = maxY - minY + 1;
const logoPng = await sharp(Buffer.from(pixels), {
  raw: { width, height, channels: 4 }
})
  .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
  .png()
  .toBuffer();

await sharp(logoPng).png().toFile(join(publicDir, "franchess-logo.png"));

async function saveIcon(filename, size, scale = 0.88) {
  const target = Math.round(size * scale);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([
      {
        input: await sharp(logoPng)
          .resize({ width: target, height: target, fit: "inside" })
          .png()
          .toBuffer(),
        gravity: "center"
      }
    ])
    .png()
    .toFile(join(publicDir, filename));
}

await saveIcon("favicon-16x16.png", 16);
await saveIcon("favicon-32x32.png", 32);
await saveIcon("favicon-48x48.png", 48);
await saveIcon("apple-touch-icon.png", 180);
await saveIcon("android-chrome-192x192.png", 192);
await saveIcon("android-chrome-512x512.png", 512);
await saveIcon("maskable-icon.png", 512, 0.72);

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: "#f4f1ea"
  }
})
  .composite([
    {
      input: await sharp(logoPng).resize({ width: 380, height: 380, fit: "inside" }).png().toBuffer(),
      top: 62,
      left: 410
    },
    {
      input: Buffer.from(
        `<svg width="1200" height="140" viewBox="0 0 1200 140" xmlns="http://www.w3.org/2000/svg"><text x="600" y="88" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="700" fill="#1f2933">FranChess.co</text></svg>`
      ),
      top: 455,
      left: 0
    }
  ])
  .png()
  .toFile(join(publicDir, "og-image.png"));

const icoFrames = [
  { size: 16, bytes: readFileSync(join(publicDir, "favicon-16x16.png")) },
  { size: 32, bytes: readFileSync(join(publicDir, "favicon-32x32.png")) },
  { size: 48, bytes: readFileSync(join(publicDir, "favicon-48x48.png")) }
];
const headerSize = 6 + icoFrames.length * 16;
const icoParts = [Buffer.alloc(headerSize)];
const header = icoParts[0];
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoFrames.length, 4);
let offsetBytes = headerSize;
for (let i = 0; i < icoFrames.length; i += 1) {
  const frame = icoFrames[i];
  const entry = 6 + i * 16;
  header.writeUInt8(frame.size, entry);
  header.writeUInt8(frame.size, entry + 1);
  header.writeUInt8(0, entry + 2);
  header.writeUInt8(0, entry + 3);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.bytes.length, entry + 8);
  header.writeUInt32LE(offsetBytes, entry + 12);
  offsetBytes += frame.bytes.length;
  icoParts.push(frame.bytes);
}
writeFileSync(join(publicDir, "favicon.ico"), Buffer.concat(icoParts));

console.log("Generated FranChess.co brand assets.");
