import { EmptyState } from "../components/EmptyState";
import { StatCard } from "../components/StatCard";
import { buildCoachProfile, colorPerformance, phaseBreakdown } from "../lib/analysis/profile";
import type { CoachView, StoredGame } from "../types";

interface ResultStats {
  playerName: string | null;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

export function DashboardPage({ games, onNavigate }: { games: StoredGame[]; onNavigate: (view: CoachView) => void }) {
  if (games.length === 0) return <EmptyState onUpload={() => onNavigate("upload")} />;

  const profile = buildCoachProfile(games);
  const phases = phaseBreakdown(games);
  const colors = colorPerformance(games);
  const results = buildResultStats(games);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Importierte Partien" value={games.length} detail={`${games.filter((game) => game.analysis.length > 0).length} analysiert`} />
        <StatCard label="Siegquote" value={results.total ? `${percent(results.wins, results.total)}%` : "-"} detail={results.playerName ? `aus allen Partien für ${results.playerName}` : "Spieler nicht eindeutig"} />
        <StatCard label="Average CPL" value={profile.averageCentipawnLoss} detail="über analysierte Züge" />
        <StatCard label="Größte Elo-Bremse" value={<span className="text-base">{profile.diagnosis}</span>} />
      </div>

      <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">Ergebnisse</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {results.playerName
                ? `Berechnet aus allen importierten PGN-Ergebnissen für ${results.playerName}.`
                : "Kein eindeutiger Spielername gefunden. Importiere über Chess.com oder nutze konsistente Spielernamen."}
            </p>
          </div>
          <p className="text-sm text-[var(--color-muted)]">{results.total} gewertete Partien</p>
        </div>
        <ResultBar stats={results} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <h2 className="font-semibold">Häufigste Fehler</h2>
          <div className="mt-4 grid gap-3">
            {profile.topCategories.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-sm">
                  <span>{item.category}</span>
                  <span>{item.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[var(--color-surface-2)]">
                  <div className="h-2 rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, item.count * 14)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <h2 className="font-semibold">Fehler nach Spielphase</h2>
          <div className="mt-4 grid gap-3 text-sm">
            {Object.entries(phases).map(([phase, count]) => (
              <div key={phase} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 last:border-0">
                <span>{phase}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <h2 className="font-semibold">Weiß/Schwarz</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Weiß" value={`${colors.white}%`} />
            <StatCard label="Schwarz" value={`${colors.black}%`} />
          </div>
          <h3 className="mt-5 text-sm font-semibold">Eröffnungen</h3>
          <div className="mt-2 grid gap-2 text-sm text-[var(--color-muted)]">
            {profile.openingCounts.map((item) => (
              <div key={item.opening} className="flex justify-between gap-3">
                <span className="truncate">{item.opening}</span>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultBar({ stats }: { stats: ResultStats }) {
  const winPct = percent(stats.wins, stats.total);
  const lossPct = percent(stats.losses, stats.total);
  const drawPct = percent(stats.draws, stats.total);

  return (
    <div className="mt-5 grid gap-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div className="bg-[#5f8f45]" style={{ width: `${winPct}%` }} />
        <div className="bg-[#b94a48]" style={{ width: `${lossPct}%` }} />
        <div className="bg-stone-400" style={{ width: `${drawPct}%` }} />
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <ResultItem color="bg-[#5f8f45]" label="Siege" count={stats.wins} pct={winPct} />
        <ResultItem color="bg-[#b94a48]" label="Niederlagen" count={stats.losses} pct={lossPct} />
        <ResultItem color="bg-stone-400" label="Remis" count={stats.draws} pct={drawPct} />
      </div>
    </div>
  );
}

function ResultItem({ color, label, count, pct }: { color: string; label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--color-surface-2)] px-3 py-2">
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold">
        {count} / {pct}%
      </span>
    </div>
  );
}

function buildResultStats(games: StoredGame[]): ResultStats {
  const playerName = inferPlayerName(games);
  const stats: ResultStats = { playerName, wins: 0, losses: 0, draws: 0, total: 0 };
  if (!playerName) return stats;
  const normalized = playerName.toLowerCase();

  for (const game of games) {
    const result = game.metadata.result;
    if (result !== "1-0" && result !== "0-1" && result !== "1/2-1/2") continue;
    const isWhite = game.metadata.white.toLowerCase() === normalized;
    const isBlack = game.metadata.black.toLowerCase() === normalized;
    if (!isWhite && !isBlack) continue;
    stats.total += 1;
    if (result === "1/2-1/2") stats.draws += 1;
    else if ((result === "1-0" && isWhite) || (result === "0-1" && isBlack)) stats.wins += 1;
    else stats.losses += 1;
  }

  return stats;
}

function inferPlayerName(games: StoredGame[]): string | null {
  const importedBy = games.find((game) => game.source?.importedBy)?.source?.importedBy;
  if (importedBy) return importedBy;

  const counts = new Map<string, { name: string; count: number }>();
  for (const game of games) {
    for (const name of [game.metadata.white, game.metadata.black]) {
      const key = name.trim().toLowerCase();
      if (!key || key === "unknown" || key === "?") continue;
      const entry = counts.get(key) ?? { name, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.name ?? null;
}

function percent(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}
