import { ArrowRight, BarChart3, BookOpen, Brain, Eye, Gamepad2, Play, Puzzle, Sparkles, Star, Target, Trophy, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { ActionButton } from "../components/ActionButton";
import { buildCoachProfile } from "../lib/analysis/profile";
import { sortGamesByDate } from "../lib/chess/gameList";
import type { CoachView, StoredGame } from "../types";

export function HomePage({ onNavigate, games, username }: { onNavigate: (view: CoachView) => void; games: StoredGame[]; username: string }) {
  const analyzedGames = games.filter((game) => game.analysis.length > 0);
  const favorites = games.filter((game) => game.favorite);
  const profile = buildCoachProfile(games);
  const recentGames = sortGamesByDate(games, "desc").slice(0, 4);
  const topCategory = profile.topCategories[0];

  return (
    <div className="home-dashboard">
      <section className="dashboard-welcome premium-panel">
        <div>
          <p className="eyebrow">Dein Chess Studio</p>
          <h1>Willkommen zurück, {username}.</h1>
          <p>Spiele, analysiere und trainiere in einem konzentrierten Arbeitsbereich, der sich aus deinen echten Partien entwickelt.</p>
        </div>
        <div className="welcome-actions">
          <ActionButton onClick={() => onNavigate("play")} icon={<Play size={17} />}>Coach starten</ActionButton>
          <ActionButton variant="quiet" onClick={() => onNavigate("upload")} icon={<Upload size={17} />}>Partie importieren</ActionButton>
        </div>
      </section>

      <section className="feature-card-grid">
        <FeatureCard icon={<Gamepad2 />} visual="♞" title="Online spielen" text="Fordere ein echtes FranChess-Profil heraus." action="Lobby öffnen" onClick={() => onNavigate("online")} tone="accent" />
        <FeatureCard icon={<Puzzle />} visual="✦" title="Puzzle des Tages" text="Trainiere Taktik mit der vorhandenen Puzzle-Sammlung." action="Puzzle starten" onClick={() => onNavigate("training")} />
        <FeatureCard icon={<Eye />} visual="⌕" title="Partie analysieren" text="Stockfish-Review mit Zugdetails und Coach-Hinweisen." action="Analyse öffnen" onClick={() => onNavigate("viewer")} />
      </section>

      <section className="dashboard-metrics">
        <Metric label="Partien" value={games.length} detail={`${analyzedGames.length} analysiert`} />
        <Metric label="Favoriten" value={favorites.length} detail="markierte Reviews" />
        <Metric label="Average CPL" value={profile.averageCentipawnLoss ? Math.round(profile.averageCentipawnLoss) : "–"} detail="über analysierte Züge" />
        <Metric label="Trainingsfelder" value={profile.topCategories.length} detail="erkannte Muster" />
      </section>

      <div className="dashboard-lower-grid">
        <section className="recent-panel premium-panel">
          <div className="section-heading"><div><p className="eyebrow">Bibliothek</p><h2>Letzte Partien</h2></div><button type="button" onClick={() => onNavigate("upload")}>Alle ansehen <ArrowRight size={15} /></button></div>
          {recentGames.length ? (
            <div className="recent-game-list">
              {recentGames.map((game) => (
                <button type="button" key={game.id} onClick={() => onNavigate("viewer")}>
                  <span className="game-result-mark">{game.metadata.result}</span>
                  <span className="game-names"><strong>{game.metadata.white} <i>vs</i> {game.metadata.black}</strong><small>{game.metadata.date || "Ohne Datum"} · {game.metadata.opening || "Eröffnung nicht im PGN"}</small></span>
                  {game.favorite && <Star size={16} fill="currentColor" />}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          ) : <div className="dashboard-empty"><Upload size={23} /><p>Noch keine Partie gespeichert.</p><button type="button" onClick={() => onNavigate("upload")}>Ersten Import starten</button></div>}
        </section>

        <section className="focus-panel premium-panel">
          <div className="focus-icon"><Sparkles size={20} /></div>
          <p className="eyebrow">Coach Fokus</p>
          <h2>{topCategory ? humanCategory(topCategory.category) : "Dein Profil entsteht"}</h2>
          <p>{topCategory ? `Dieses Muster kam in deinen Analysen ${topCategory.count}-mal vor. Starte eine fokussierte Session aus echten Stellungen.` : "Analysiere deine ersten Partien. FranChess baut daraus automatisch ein persönliches Fehler- und Trainingsprofil."}</p>
          <ActionButton className="w-full" onClick={() => onNavigate(topCategory ? "training" : "upload")} icon={topCategory ? <Brain size={16} /> : <Upload size={16} />}>{topCategory ? "Fokus trainieren" : "Partien hinzufügen"}</ActionButton>
          <div className="focus-links">
            <button type="button" onClick={() => onNavigate("dashboard")}><BarChart3 size={16} /> Fortschritt</button>
            <button type="button" onClick={() => onNavigate("play")}><Play size={16} /> Coach</button>
          </div>
        </section>
      </div>

      <section className="recommendation-strip premium-panel">
        <div><p className="eyebrow">Empfohlen für dich</p><h2>Weiter trainieren</h2></div>
        <button type="button" onClick={() => onNavigate("training")}><span><Target size={19} /></span><strong>Taktik</strong><small>Aus eigenen Fehlern</small></button>
        <button type="button" onClick={() => onNavigate("training")}><span><Puzzle size={19} /></span><strong>Puzzles</strong><small>Motive festigen</small></button>
        <button type="button" onClick={() => onNavigate("training")}><span><BookOpen size={19} /></span><strong>Eröffnungen</strong><small>Repertoire üben</small></button>
        <button type="button" onClick={() => onNavigate("dashboard")}><span><Trophy size={19} /></span><strong>Fortschritt</strong><small>Profil ansehen</small></button>
      </section>
    </div>
  );
}

function FeatureCard({ icon, visual, title, text, action, onClick, tone = "default" }: { icon: ReactNode; visual: string; title: string; text: string; action: string; onClick: () => void; tone?: "default" | "accent" }) {
  return <button type="button" className={`dashboard-feature premium-panel ${tone}`} onClick={onClick}><span className="feature-icon">{icon}</span><span className="feature-copy"><strong>{title}</strong><small>{text}</small></span><span className="feature-visual" aria-hidden="true">{visual}</span><span className="feature-action">{action} <ArrowRight size={14} /></span></button>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="dashboard-metric premium-panel"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function humanCategory(category: string): string {
  const labels: Record<string, string> = {
    hanging_piece: "Hängende Figuren",
    undefended_piece: "Ungedeckte Figuren",
    king_safety: "Königssicherheit",
    bad_development: "Entwicklung verbessern",
    missed_mate: "Mattmotive erkennen",
    tactical_blunder: "Taktische Patzer",
    exchange_blunder: "Abtauschentscheidungen",
    pawn_structure_damage: "Bauernstruktur"
  };
  return labels[category] ?? category.replace(/_/g, " ");
}
