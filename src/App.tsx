import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Brain, Download, Eye, Play, Settings, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "./components/BrandLogo";
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
  { id: "dashboard", label: "Übersicht", icon: BarChart3 },
  { id: "viewer", label: "Analyse", icon: Eye },
  { id: "play", label: "Coach", icon: Play },
  { id: "training", label: "Training", icon: Brain },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Einstellungen", icon: Settings }
] satisfies Array<{ id: CoachView; label: string; icon: LucideIcon }>;

export default function App() {
  const [view, setView] = useState<CoachView>(() => initialView());
  const [games, setGames] = useState<StoredGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [viewerInitialPly, setViewerInitialPly] = useState<number | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [showSplash, setShowSplash] = useState(() => shouldShowMobileSplash());

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

  useEffect(() => {
    if (!showSplash) return;
    window.sessionStorage.setItem("franchess.mobileSplash.v1", "shown");
    const timer = window.setTimeout(() => setShowSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

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
    setViewerInitialPly(null);
    navigate("viewer");
  }

  function openTrainingGame(id: string, ply: number) {
    setSelectedGameId(id);
    setViewerInitialPly(ply);
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
    <>
    {showSplash && (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,var(--color-surface-2)_25%,transparent_25%),linear-gradient(-45deg,var(--color-surface-2)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--color-surface-2)_75%),linear-gradient(-45deg,transparent_75%,var(--color-surface-2)_75%)] [background-position:0_0,0_24px,24px_-24px,-24px_0] [background-size:48px_48px]" />
        <div className="relative grid place-items-center gap-3 animate-[splashPulse_900ms_ease-out]">
          <BrandLogo size="lg" />
          <span className="text-sm font-semibold tracking-wide text-[var(--color-muted)]">FranChess.co</span>
        </div>
      </div>
    )}
    <Layout
      nav={nav}
      view={view}
      onNavigate={navigate}
      layoutMode={settings.layoutMode}
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
          initialPly={viewerInitialPly ?? undefined}
        />
      )}
      {view === "play" && <PlayPage settings={settings} onSettingsChange={setSettings} games={games} />}
      {view === "training" && (
        <TrainingPage games={games} onUpload={() => navigate("upload")} onSelectGame={openTrainingGame} settings={settings} />
      )}
      {view === "export" && <ExportPage games={games} onUpload={() => navigate("upload")} />}
      {view === "settings" && (
        <SettingsPage
          settings={settings}
          onSettingsChange={setSettings}
          games={games}
          onGamesChange={updateGames}
          onOpenGame={openGame}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </Layout>
    </>
  );
}

function initialView(): CoachView {
  if (typeof window === "undefined") return "home";
  const saved = window.localStorage.getItem("franchess.lastView.v1") as CoachView | null;
  if (saved) return saved;
  return window.matchMedia?.("(max-width: 767px)").matches ? "play" : "home";
}

function shouldShowMobileSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem("franchess.mobileSplash.v1")) return false;
  return window.matchMedia?.("(max-width: 767px)").matches ?? false;
}
