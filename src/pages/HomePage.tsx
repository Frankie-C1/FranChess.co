import { BarChart3, Brain, Eye, Play, Star, Upload } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { StatCard } from "../components/StatCard";
import { buildCoachProfile } from "../lib/analysis/profile";
import type { CoachView, StoredGame } from "../types";

export function HomePage({ onNavigate, games }: { onNavigate: (view: CoachView) => void; games: StoredGame[] }) {
  const profile = buildCoachProfile(games);
  const analyzed = games.filter((game) => game.analysis.length > 0);
  const favorites = games.filter((game) => game.favorite);
  const recent = [...games].sort((a, b) => b.importedAt.localeCompare(a.importedAt)).slice(0, 5);
  const topCategory = profile.topCategories[0]?.category ?? "Noch offen";

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-accent)]">Trainer-Zentrale</p>
            <h1 className="mt-1 text-2xl font-semibold">Willkommen zurück bei FranChess.co</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Deine Partien, Fehlerprofile und Trainingswege an einem Ort.</p>
          </div>
          <ActionButton onClick={() => onNavigate("play")} icon={<Play size={18} />}>
            Coach starten
          </ActionButton>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Importierte Partien" value={games.length} />
        <StatCard label="Analysierte Partien" value={analyzed.length} />
        <StatCard label="Favoriten" value={favorites.length} />
        <StatCard label="Häufigster Fehler" value={<span className="text-base">{topCategory}</span>} />
        <StatCard label="Durchschnittlicher CPL" value={profile.averageCentipawnLoss || "–"} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Zuletzt importiert</h2>
            <button type="button" className="text-sm font-medium text-[var(--color-accent)]" onClick={() => onNavigate("viewer")}>
              Viewer öffnen
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Noch keine Partien importiert.</p>
          ) : (
            <div className="grid gap-3">
              {recent.map((game) => (
                <div key={game.id} className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-surface-2)] px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {game.favorite && <Star className="mr-1 inline text-[#b88700]" size={14} fill="currentColor" />}
                      {game.metadata.white} gegen {game.metadata.black}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-muted)]">
                      {game.metadata.result} · {game.metadata.date || "ohne Datum"} · {game.metadata.opening || "Eröffnung nicht im PGN"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="font-semibold">Schnellaktionen</h2>
          <div className="mt-4 grid gap-3">
            <ActionButton onClick={() => onNavigate("play")} icon={<Play size={18} />}>
              Coach starten
            </ActionButton>
            <ActionButton onClick={() => onNavigate("upload")} variant="quiet" icon={<Upload size={18} />}>
              Partie importieren
            </ActionButton>
            <ActionButton onClick={() => onNavigate("viewer")} variant="quiet" icon={<Eye size={18} />}>
              Viewer öffnen
            </ActionButton>
            <ActionButton onClick={() => onNavigate("training")} variant="quiet" icon={<Brain size={18} />}>
              Training starten
            </ActionButton>
            <ActionButton onClick={() => onNavigate("dashboard")} variant="quiet" icon={<BarChart3 size={18} />}>
              Analyse-Dashboard
            </ActionButton>
          </div>
        </div>
      </section>
    </div>
  );
}
