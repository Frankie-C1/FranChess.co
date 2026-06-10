import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

const sourceUrl = "https://database.lichess.org/#puzzles";
const license = "Creative Commons CC0";
const [, , inputArg, outputArg = "public/data/puzzles.json", limitArg = "1000"] = process.argv;

if (!inputArg) {
  console.error("Usage: node scripts/import-lichess-puzzles.mjs path/to/lichess_db_puzzle.csv public/data/puzzles.json 1000");
  console.error(`Source: ${sourceUrl}`);
  console.error(`License: ${license}`);
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const limit = Math.max(1, Number(limitArg) || 1000);
const allowedThemes = new Set(["fork", "pin", "mate", "hangingPiece", "endgame", "advantage", "crushing", "discoveredAttack", "opening"]);

if (!existsSync(input)) {
  console.error(`Input CSV not found: ${input}`);
  process.exit(1);
}

const rows = [];
const reader = createInterface({
  input: createReadStream(input, { encoding: "utf8" }),
  crlfDelay: Infinity
});

let isHeader = true;
for await (const line of reader) {
  if (isHeader) {
    isHeader = false;
    continue;
  }
  if (!line.trim()) continue;
  const columns = splitCsv(line);
  if (columns.length < 9) continue;
  const themes = columns[7].split(/\s+/).filter(Boolean);
  if (!themes.some((theme) => allowedThemes.has(theme))) continue;

  rows.push({
    puzzleId: columns[0],
    fen: columns[1],
    moves: columns[2].split(/\s+/).filter(Boolean),
    rating: Number(columns[3]) || 0,
    themes,
    gameUrl: columns[8] || undefined,
    openingTags: columns[9] ? columns[9].split(/\s+/).filter(Boolean) : []
  });

  if (rows.length >= limit) break;
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  `${JSON.stringify(rows, null, 2)}\n`
);
console.log(`Wrote ${rows.length} puzzles to ${output}`);
console.log(`Source: ${sourceUrl}`);
console.log(`License: ${license}`);

function splitCsv(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
