import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Brain, Download, Moon, Play, Sun, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ViewerPage } from "./pages/ViewerPage";
import { PlayPage } from "./pages/PlayPage";
import { TrainingPage } from "./pages/TrainingPage";
import { ExportPage } from "./pages/ExportPage";
import { storageAdapter } from "./lib/storage";
import type { CoachView, StoredGame } from "./types";

const nav = [
  { id: "home", label: "Start", icon: Activity },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "dashboard", label: "Analyse", icon: BarChart3 },
  { id: "viewer", label: "Viewer", icon: Brain },
  { id: "play", label: "Coach", icon: Play },
  { id: "training", label: "Training", icon: Brain },
  { id: "export", label: "Export", icon: Download }
] satisfies Array<{ id: CoachView; label: string; icon: LucideIcon }>;

export default function App() {
  const [view, setView] = useState<CoachView>("home");
  const [games, setGames] = useState<StoredGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    storageAdapter.loadGames().then((loaded) => {
      setGames(loaded);
      setSelectedGameId(loaded[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? games[0] ?? null,
    [games, selectedGameId]
  );

  async function updateGames(nextGames: StoredGame[]) {
    setGames(nextGames);
    if (!selectedGameId && nextGames[0]) setSelectedGameId(nextGames[0].id);
    await storageAdapter.saveGames(nextGames);
  }

  return (
    <Layout
      nav={nav}
      view={view}
      onNavigate={setView}
      utility={
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 shadow-sm transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
          onClick={() => setDarkMode((value) => !value)}
          aria-label={darkMode ? "Hellen Modus aktivieren" : "Dunklen Modus aktivieren"}
          title={darkMode ? "Heller Modus" : "Dunkler Modus"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      }
    >
      {view === "home" && <HomePage onNavigate={setView} gameCount={games.length} />}
      {view === "upload" && <UploadPage games={games} onGamesChange={updateGames} onSelectGame={setSelectedGameId} />}
      {view === "dashboard" && <DashboardPage games={games} onNavigate={setView} />}
      {view === "viewer" && (
        <ViewerPage
          games={games}
          selectedGame={selectedGame}
          onSelectGame={setSelectedGameId}
          onGamesChange={updateGames}
          onUpload={() => setView("upload")}
        />
      )}
      {view === "play" && <PlayPage />}
      {view === "training" && (
        <TrainingPage games={games} onUpload={() => setView("upload")} onSelectGame={(id) => { setSelectedGameId(id); setView("viewer"); }} />
      )}
      {view === "export" && <ExportPage games={games} onUpload={() => setView("upload")} />}
    </Layout>
  );
}
