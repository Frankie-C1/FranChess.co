import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Brain, Download, Eye, Play, Settings, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ViewerPage } from "./pages/ViewerPage";
import { PlayPage } from "./pages/PlayPage";
import { TrainingPage } from "./pages/TrainingPage";
import { ExportPage } from "./pages/ExportPage";
import { SettingsPage } from "./pages/SettingsPage";
import { storageAdapter } from "./lib/storage";
import { loadSettings, saveSettings } from "./lib/storage/settings";
import type { CoachView, StoredGame } from "./types";

const nav = [
  { id: "home", label: "Start", icon: Activity },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "dashboard", label: "Analyse", icon: BarChart3 },
  { id: "viewer", label: "Viewer", icon: Eye },
  { id: "play", label: "Coach", icon: Play },
  { id: "training", label: "Training", icon: Brain },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Einstellungen", icon: Settings }
] satisfies Array<{ id: CoachView; label: string; icon: LucideIcon }>;

export default function App() {
  const [view, setView] = useState<CoachView>(() => initialView());
  const [games, setGames] = useState<StoredGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    storageAdapter.loadGames().then((loaded) => {
      setGames(loaded);
      setSelectedGameId(loaded[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.documentElement.dataset.theme = settings.colorTheme;
    saveSettings(settings);
  }, [settings]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? games[0] ?? null,
    [games, selectedGameId]
  );

  async function updateGames(nextGames: StoredGame[]) {
    setGames(nextGames);
    if (!selectedGameId && nextGames[0]) setSelectedGameId(nextGames[0].id);
    await storageAdapter.saveGames(nextGames);
  }

  function openGame(id: string) {
    setSelectedGameId(id);
    navigate("viewer");
  }

  async function toggleFavorite(id: string) {
    await updateGames(games.map((game) => (game.id === id ? { ...game, favorite: !game.favorite } : game)));
  }

  function navigate(nextView: CoachView) {
    setView(nextView);
    window.localStorage.setItem("franchess.lastView.v1", nextView);
  }

  return (
    <Layout
      nav={nav}
      view={view}
      onNavigate={navigate}
    >
      {view === "home" && <HomePage onNavigate={navigate} games={games} />}
      {view === "upload" && <UploadPage games={games} onGamesChange={updateGames} onOpenGame={openGame} onToggleFavorite={toggleFavorite} />}
      {view === "dashboard" && <DashboardPage games={games} onNavigate={setView} />}
      {view === "viewer" && (
        <ViewerPage
          games={games}
          selectedGame={selectedGame}
          onSelectGame={setSelectedGameId}
          onGamesChange={updateGames}
          onUpload={() => navigate("upload")}
          settings={settings}
        />
      )}
      {view === "play" && <PlayPage settings={settings} onSettingsChange={setSettings} games={games} />}
      {view === "training" && (
        <TrainingPage games={games} onUpload={() => navigate("upload")} onSelectGame={(id) => { setSelectedGameId(id); navigate("viewer"); }} />
      )}
      {view === "export" && <ExportPage games={games} onUpload={() => navigate("upload")} />}
      {view === "settings" && <SettingsPage settings={settings} onSettingsChange={setSettings} games={games} onOpenGame={openGame} onToggleFavorite={toggleFavorite} />}
    </Layout>
  );
}

function initialView(): CoachView {
  if (typeof window === "undefined") return "home";
  const saved = window.localStorage.getItem("franchess.lastView.v1") as CoachView | null;
  if (saved) return saved;
  return window.matchMedia?.("(max-width: 767px)").matches ? "play" : "home";
}
