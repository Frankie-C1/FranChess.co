import { EmptyState } from "../components/EmptyState";
import { StatCard } from "../components/StatCard";
import { buildCoachProfile, colorPerformance, phaseBreakdown } from "../lib/analysis/profile";
import type { CoachView, StoredGame } from "../types";

export function DashboardPage({ games, onNavigate }: { games: StoredGame[]; onNavigate: (view: CoachView) => void }) {
  if (games.length === 0) return <EmptyState onUpload={() => onNavigate("upload")} />;

  const profile = buildCoachProfile(games);
  const phases = phaseBreakdown(games);
  const colors = colorPerformance(games);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Analysierte Partien" value={games.filter((game) => game.analysis.length > 0).length} detail={`${games.length} importiert`} />
        <StatCard label="Siegquote" value={`${profile.winrate}%`} detail="PGN-Ergebnisdaten" />
        <StatCard label="Average CPL" value={profile.averageCentipawnLoss} detail="über analysierte Züge" />
        <StatCard label="Größte Elo-Bremse" value={<span className="text-base">{profile.diagnosis}</span>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">Häufigste Fehler</h2>
          <div className="mt-4 grid gap-3">
            {profile.topCategories.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-sm">
                  <span>{item.category}</span>
                  <span>{item.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100 dark:bg-stone-800">
                  <div className="h-2 rounded-full bg-[#5f8f45]" style={{ width: `${Math.min(100, item.count * 14)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">Fehler nach Spielphase</h2>
          <div className="mt-4 grid gap-3 text-sm">
            {Object.entries(phases).map(([phase, count]) => (
              <div key={phase} className="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0 dark:border-stone-800">
                <span>{phase}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">Weiß/Schwarz</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Weiß" value={`${colors.white}%`} />
            <StatCard label="Schwarz" value={`${colors.black}%`} />
          </div>
          <h3 className="mt-5 text-sm font-semibold">Eröffnungen</h3>
          <div className="mt-2 grid gap-2 text-sm text-stone-600 dark:text-stone-300">
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
