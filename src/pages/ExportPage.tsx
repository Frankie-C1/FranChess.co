import { Download } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { EmptyState } from "../components/EmptyState";
import { createCoachExport, downloadBlob } from "../lib/export/createCoachExport";
import { buildCoachProfile } from "../lib/analysis/profile";
import type { StoredGame } from "../types";

export function ExportPage({ games, onUpload }: { games: StoredGame[]; onUpload: () => void }) {
  if (games.length === 0) return <EmptyState onUpload={onUpload} />;

  const profile = buildCoachProfile(games);

  async function exportZip() {
    const blob = await createCoachExport(games);
    downloadBlob(blob, `franchess-export-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-md border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-2xl font-semibold">Coach-Export erstellen</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Der ZIP-Export enthält PGNs, Analyse-Rohdaten, Fehlerliste, Profil und eine Markdown-Zusammenfassung für einen Coach.
        </p>
        <ActionButton className="mt-6" onClick={() => void exportZip()} icon={<Download size={18} />}>
          Coach-Export erstellen
        </ActionButton>
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-semibold">Export-Vorschau</h2>
        <div className="mt-4 grid gap-3 text-sm">
          <Row label="games.pgn" value={`${games.length} Partie(n)`} />
          <Row label="analysis.json" value={`${games.flatMap((game) => game.analysis).length} Züge`} />
          <Row label="mistakes.csv" value={`${games.flatMap((game) => game.analysis).filter((move) => move.categories.length > 0).length} Fehler`} />
          <Row label="profile.json" value={profile.playerName} />
          <Row label="summary.md" value="Trainingsplan Richtung 2000 Elo" />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 dark:border-stone-800">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
