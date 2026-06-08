import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, "node_modules", "stockfish", "bin");
const publicDir = join(root, "public", "stockfish");

const engine = {
  js: "stockfish-18-lite-single.js",
  wasm: "stockfish-18-lite-single.wasm"
};

const sourceJs = join(sourceDir, engine.js);
const sourceWasm = join(sourceDir, engine.wasm);
const targetJs = join(publicDir, "stockfish.js");
const targetWasm = join(publicDir, "stockfish.wasm");

for (const file of [sourceJs, sourceWasm]) {
  if (!existsSync(file)) {
    throw new Error(`Stockfish asset missing: ${file}`);
  }
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(sourceJs, targetJs);
copyFileSync(sourceWasm, targetWasm);

const wasmMb = (statSync(targetWasm).size / 1024 / 1024).toFixed(2);
console.log(`Copied Stockfish 18 lite single-threaded WASM to public/stockfish (${wasmMb} MB).`);
