import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const publicDir = join(process.cwd(), "public");
const source = join(publicDir, "franchess-mark.svg");

async function mark(size, scale = 0.66) {
  return sharp(source).resize({ width: Math.round(size * scale), height: Math.round(size * scale), fit: "contain" }).png().toBuffer();
}

async function iconBuffer(size, scale = 0.66) {
  const radius = Math.round(size * 0.22);
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#0c1017"/><circle cx="${Math.round(size * .76)}" cy="${Math.round(size * .2)}" r="${Math.round(size * .3)}" fill="#8faa52" opacity=".22"/></svg>`);
  return sharp(background).composite([{ input: await mark(size, scale), gravity: "center" }]).png().toBuffer();
}

async function saveIcon(filename, size, scale = 0.66) {
  await sharp(await iconBuffer(size, scale)).toFile(join(publicDir, filename));
}

await saveIcon("franchess-logo.png", 512);
await saveIcon("favicon-16x16.png", 16, 0.76);
await saveIcon("favicon-32x32.png", 32, 0.74);
await saveIcon("favicon-48x48.png", 48, 0.72);
await saveIcon("apple-touch-icon.png", 180);
await saveIcon("android-chrome-192x192.png", 192);
await saveIcon("android-chrome-512x512.png", 512);
await saveIcon("maskable-icon.png", 512, 0.56);

const ogBackground = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0c1017"/><circle cx="930" cy="80" r="380" fill="#8faa52" opacity=".13"/><text x="600" y="510" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="70" font-weight="700" fill="white">FranChess.co</text><text x="600" y="565" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="26" fill="#aeb7c4">Play. Analyze. Improve.</text></svg>');
await sharp(ogBackground).composite([{ input: await mark(360, 0.82), top: 75, left: 420 }]).png().toFile(join(publicDir, "og-image.png"));

const icoFrames = [16, 32, 48].map((size) => ({ size, bytes: readFileSync(join(publicDir, `favicon-${size}x${size}.png`)) }));
const headerSize = 6 + icoFrames.length * 16;
const parts = [Buffer.alloc(headerSize)];
parts[0].writeUInt16LE(0, 0);
parts[0].writeUInt16LE(1, 2);
parts[0].writeUInt16LE(icoFrames.length, 4);
let byteOffset = headerSize;
icoFrames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  parts[0].writeUInt8(frame.size, entry);
  parts[0].writeUInt8(frame.size, entry + 1);
  parts[0].writeUInt16LE(1, entry + 4);
  parts[0].writeUInt16LE(32, entry + 6);
  parts[0].writeUInt32LE(frame.bytes.length, entry + 8);
  parts[0].writeUInt32LE(byteOffset, entry + 12);
  byteOffset += frame.bytes.length;
  parts.push(frame.bytes);
});
writeFileSync(join(publicDir, "favicon.ico"), Buffer.concat(parts));

console.log("Generated FranChess.co brand assets from franchess-mark.svg.");
