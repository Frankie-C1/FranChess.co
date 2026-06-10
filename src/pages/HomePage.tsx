import { BarChart3, Brain, Eye, Play, Star, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { ActionButton } from "../components/ActionButton";
import { StatCard } from "../components/StatCard";
import { buildCoachProfile } from "../lib/analysis/profile";
import type { CoachView, StoredGame } from "../types";

export function HomePage({ onNavigate, games }: { onNavigate: (view: CoachView) => void; games: StoredGame[] }) {
  const analyzedGames = games.filter((game) => game.analysis.length > 0);
  const favorites = games.filter((game) => game.favorite);
  const profile = buildCoachProfile(games);
  const lastImported = [...games].sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0] ?? null;
  const recentGames = [...games].sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 4);
  const topCategory = profile.topCategories[0];

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-muted)]">Trainer-Zentrale</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Willkommen zurück.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              Wähle eine Partie, starte den Coach oder arbeite direkt an den Mustern, die deine Analysen zeigen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => onNavigate("play")} icon={<Play size={17} />}>Coach starten</ActionButton>
            <ActionButton variant="quiet" onClick={() => onNavigate("upload")} icon={<Upload size={17} />}>Import</ActionButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Importierte Partien" value={games.length} />
        <StatCard label="Analysierte Partien" value={analyzedGames.length} />
        <StatCard label="Favoriten" value={favorites.length} />
        <StatCard label="Letzter Import" value={lastImported ? shortDate(lastImported.importedAt) : "-"} />
        <StatCard label="Durchschnittlicher CPL" value={profile.averageCentipawnLoss ? Math.round(profile.averageCentipawnLoss) : "-"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Zuletzt importiert</h2>
            <ActionButton variant="quiet" onClick={() => onNavigate("viewer")} icon={<Eye size={16} />}>Analyse öffnen</ActionButton>
          </div>
          {recentGames.length === 0 ? (
            <p className="rounded-md bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-muted)]">
              Noch keine Partien gespeichert. Importiere ein PGN oder lade Partien über Chess.com.
            </p>
          ) : (
            <div className="grid gap-3">
              {recentGames.map((game) => (
                <article key={game.id} className="rounded-md border border-[var(--color-border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {game.metadata.white} gegen {game.metadata.black}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {game.metadata.result} - {game.metadata.date || "ohne Datum"} - {game.analysis.length > 0 ? "analysiert" : "nicht analysiert"}
                      </p>
                    </div>
                    {game.favorite && <Star size={18} className="shrink-0 text-[var(--color-accent)]" fill="currentColor" />}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Analyse-Fokus</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {topCategory
                ? `Häufigstes Muster: ${humanCategory(topCategory.category)} (${topCategory.count}x).`
                : "Sobald analysierte Partien vorhanden sind, erscheint hier dein häufigstes Fehlermuster."}
            </p>
          </div>

          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Schnellaktionen</h2>
            <div className="mt-4 grid gap-2">
              <QuickAction icon={<Play size={17} />} label="Coach starten" onClick={() => onNavigate("play")} />
              <QuickAction icon={<Upload size={17} />} label="Partie importieren" onClick={() => onNavigate("upload")} />
              <QuickAction icon={<Eye size={17} />} label="Analyse öffnen" onClick={() => onNavigate("viewer")} />
              <QuickAction icon={<Brain size={17} />} label="Training öffnen" onClick={() => onNavigate("training")} />
              <QuickAction icon={<BarChart3 size={17} />} label="Analyse-Dashboard" onClick={() => onNavigate("dashboard")} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center gap-3 rounded-md border border-[var(--color-border)] px-3 text-left text-sm transition hover:bg-[var(--color-surface-2)]"
    >
      <span className="text-[var(--color-accent)]">{icon}</span>
      {label}
    </button>
  );
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function humanCategory(category: string): string {
  const labels: Record<string, string> = {
    hanging_piece: "hängende Figuren",
    undefended_piece: "ungedeckte Figuren",
    king_safety: "Königssicherheit",
    bad_development: "Entwicklung",
    missed_mate: "verpasste Mattmotive",
    tactical_blunder: "taktische Patzer",
    exchange_blunder: "Abtauschfehler",
    pawn_structure_damage: "Bauernstruktur"
  };
  return labels[category] ?? category.replace(/_/g, " ");
}
