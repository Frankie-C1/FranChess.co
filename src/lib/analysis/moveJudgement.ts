import type { EngineCandidateMove, MistakeCategory, MoveJudgement } from "../../types";

export function judgeMove({
  playedUci,
  bestMove,
  centipawnLoss,
  categories,
  candidates
}: {
  playedUci?: string | null;
  bestMove?: string | null;
  centipawnLoss: number;
  categories?: MistakeCategory[];
  candidates?: EngineCandidateMove[];
}): MoveJudgement {
  const onlyMove = isOnlyMove(candidates);
  const matchesBest = Boolean(playedUci && bestMove && playedUci === bestMove);
  const missedMate = categories?.includes("missed_mate") ?? false;
  const materialSacWithComp = isMaterialSacrificeWithCompensation(categories, centipawnLoss);

  if (missedMate || centipawnLoss > 300) {
    return makeJudgement("blunder", "??", "Grober Patzer", centipawnLoss, "Die Bewertung bricht stark ein. Suche zuerst nach Mattdrohungen, Checks und hängendem Material.");
  }
  if (materialSacWithComp) {
    return makeJudgement("brilliant", "!!", "Brillanter Zug", centipawnLoss, "Der Zug investiert Material, hält aber die Bewertung und erzeugt konkrete Kompensation.");
  }
  if (onlyMove && matchesBest) {
    return makeJudgement("only_move", "□", "Einziger Zug", centipawnLoss, "Dieser Zug hält die Stellung; die Alternativen fallen deutlich ab.");
  }
  if (matchesBest || centipawnLoss < 30) {
    return makeJudgement("good", "!", "Guter Zug", centipawnLoss, "Der Zug hält die Stellung stabil und folgt der besten Engine-Idee.");
  }
  if (centipawnLoss < 70) {
    return makeJudgement("interesting", "!?", "Interessanter Zug", centipawnLoss, "Die Idee ist spielbar, aber nicht ganz so präzise wie der beste Kandidat.");
  }
  if (centipawnLoss < 150) {
    return makeJudgement("dubious", "?!", "Fragwürdiger Zug", centipawnLoss, "Die Bewertung fällt spürbar. Prüfe Drohungen und Königssicherheit.");
  }
  if (centipawnLoss <= 300) {
    return makeJudgement("mistake", "?", "Fehler", centipawnLoss, "Der Zug gibt zu viel Vorteil ab. Der beste Zug hätte die Stellung deutlich besser gehalten.");
  }
  return makeJudgement("blunder", "??", "Grober Patzer", centipawnLoss, "Die Bewertung bricht stark ein. Suche zuerst nach Mattdrohungen, Checks und hängendem Material.");
}

export function neutralJudgement(cp: number | null, mate: number | null): string {
  if (mate !== null) return `Bewertung: M${Math.abs(mate)}`;
  if (cp === null) return "Bewertung noch nicht verfügbar.";
  return `Bewertung: ${(cp / 100 >= 0 ? "+" : "") + (cp / 100).toFixed(1)}`;
}

function makeJudgement(
  kind: MoveJudgement["kind"],
  symbol: MoveJudgement["symbol"],
  text: MoveJudgement["text"],
  centipawnLoss: number,
  comment: string
): MoveJudgement {
  return { kind, symbol, text, centipawnLoss, comment };
}

function isOnlyMove(candidates?: EngineCandidateMove[]): boolean {
  if (!candidates || candidates.length < 2) return false;
  const first = candidateScore(candidates[0]);
  const second = candidateScore(candidates[1]);
  if (first === null || second === null) return false;
  return Math.abs(first - second) > 180;
}

function candidateScore(candidate: EngineCandidateMove): number | null {
  if (candidate.mate !== null) return candidate.mate > 0 ? 100000 - candidate.mate : -100000 - candidate.mate;
  return candidate.cp;
}

function isMaterialSacrificeWithCompensation(categories: MistakeCategory[] | undefined, centipawnLoss: number): boolean {
  if (!categories) return false;
  return categories.includes("exchange_blunder") === false && categories.includes("tactical_blunder") === false && centipawnLoss <= 20;
}
