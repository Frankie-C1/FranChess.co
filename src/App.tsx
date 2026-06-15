import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Brain, Download, Eye, Gamepad2, Play, Settings, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "./components/BrandLogo";
import { Layout } from "./components/Layout";
import { LoginScreen } from "./components/LoginScreen";
import { HomePage } from "./pages/HomePage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ViewerPage } from "./pages/ViewerPage";
import { PlayPage } from "./pages/PlayPage";
import { TrainingPage } from "./pages/TrainingPage";
import { ExportPage } from "./pages/ExportPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OnlinePlayPage } from "./pages/OnlinePlayPage";
import { storageAdapter } from "./lib/storage";
import { defaultSettings, loadSettings, saveSettings } from "./lib/storage/settings";
import { clearProfile, loadProfile, saveProfile } from "./lib/storage/profile";
import { hasLocalUserData, hasMigrated, loadCloudSnapshot, loginOrCreateProfile, markMigrated, mergeSnapshots, pushCloudSnapshot, type CloudSnapshot } from "./lib/storage/cloudSync";
import { isSupabaseConfigured, supabase } from "./lib/storage/supabase";
import type { CloudSyncState, CoachUserProfile, CoachView, StoredGame } from "./types";

const nav = [
  { id: "home", label: "Start", icon: Activity },
  { id: "online", label: "Online spielen", icon: Gamepad2 },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "dashboard", label: "Übersicht", icon: BarChart3 },
  { id: "viewer", label: "Analyse", icon: Eye },
  { id: "play", label: "Coach", icon: Play },
  { id: "training", label: "Training", icon: Brain },
  { id: "export", label: "Export", icon: Download },
  { id: "settings", label: "Einstellungen", icon: Settings }
] satisfies Array<{ id: CoachView; label: string; icon: LucideIcon }>;

interface PendingInvitation {
  id: string;
  opponent: string;
  timeControl: string;
}

export default function App() {
  const [view, setView] = useState<CoachView>(() => initialView());
  const [games, setGames] = useState<StoredGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [viewerInitialPly, setViewerInitialPly] = useState<number | null>(null);
  const [settings, setSettings] = useState(loadSettings);
  const [profile, setProfile] = useState<CoachUserProfile>(loadProfile);
  const [cloudState, setCloudState] = useState<CloudSyncState>(isSupabaseConfigured ? "syncing" : "local");
  const [booting, setBooting] = useState(true);
  const [pendingCloud, setPendingCloud] = useState<CloudSnapshot | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<PendingInvitation | null>(null);
  const [showSplash, setShowSplash] = useState(() => shouldShowMobileSplash());
  const syncReady = useRef(false);
  const syncTimer = useRef<number | null>(null);

  useEffect(() => {
    storageAdapter.loadGames().then((loaded) => {
      setGames(loaded);
      setSelectedGameId(loaded[0]?.id ?? null);
      setBooting(false);
    });
  }, []);

  useEffect(() => {
    if (booting || !profile.username) return;
    if (!isSupabaseConfigured) {
      setCloudState("local");
      return;
    }
    if (!profile.id) {
      setCloudState("syncing");
      loginOrCreateProfile(profile.username).then((connected) => {
        saveProfile(connected);
        setProfile(connected);
      }).catch(() => setCloudState("offline"));
      return;
    }
    let cancelled = false;
    setCloudState("syncing");
    loadCloudSnapshot(profile.id, defaultSettings).then(async (cloud) => {
      if (cancelled) return;
      if (hasLocalUserData(games) && !hasMigrated(profile.id!)) {
        setPendingCloud(cloud);
        setCloudState("online");
        return;
      }
      const merged = mergeSnapshots(games, cloud.games);
      setGames(merged);
      setSelectedGameId((current) => current ?? merged[0]?.id ?? null);
      await storageAdapter.saveGames(merged);
      if (cloud.settings) setSettings(cloud.settings);
      syncReady.current = true;
      setCloudState("online");
    }).catch(() => {
      if (!cancelled) setCloudState("offline");
    });
    return () => { cancelled = true; };
  }, [booting, profile.id]);

  useEffect(() => {
    if (!profile.username || profile.id || !isSupabaseConfigured) return;
    const reconnect = () => {
      setCloudState("syncing");
      loginOrCreateProfile(profile.username!).then((connected) => {
        saveProfile(connected);
        setProfile(connected);
      }).catch(() => setCloudState("offline"));
    };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [profile.id, profile.username]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.documentElement.dataset.theme = settings.colorTheme;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!syncReady.current || !profile.id || !isSupabaseConfigured) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      setCloudState("syncing");
      pushCloudSnapshot(profile.id!, games, settings)
        .then(() => setCloudState("online"))
        .catch(() => setCloudState("offline"));
    }, 700);
    return () => { if (syncTimer.current) window.clearTimeout(syncTimer.current); };
  }, [games, profile.id, settings]);

  useEffect(() => {
    if (!profile.id || !isSupabaseConfigured) return;
    const syncNow = () => {
      if (!syncReady.current) return;
      setCloudState("syncing");
      pushCloudSnapshot(profile.id!, games, settings).then(() => setCloudState("online")).catch(() => setCloudState("offline"));
    };
    window.addEventListener("online", syncNow);
    const interval = window.setInterval(syncNow, 30_000);
    return () => {
      window.removeEventListener("online", syncNow);
      window.clearInterval(interval);
    };
  }, [games, profile.id, settings]);

  useEffect(() => {
    if (!supabase || !profile.id) {
      setPendingInvitation(null);
      return;
    }
    const client = supabase;
    let cancelled = false;

    async function refreshInvitations() {
      const { data, error } = await client
        .from("online_games")
        .select("id, white_profile_id, black_profile_id, created_by_profile_id, white_username, black_username, time_control, created_at")
        .eq("status", "waiting")
        .or(`white_profile_id.eq.${profile.id},black_profile_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || error) return;
      const invitation = data?.find((row) => row.created_by_profile_id !== profile.id);
      if (!invitation) {
        setPendingInvitation(null);
        return;
      }
      setPendingInvitation({
        id: invitation.id,
        opponent: invitation.white_profile_id === profile.id
          ? invitation.black_username || "Ein Spieler"
          : invitation.white_username || "Ein Spieler",
        timeControl: invitation.time_control
      });
    }

    void refreshInvitations();
    const channel = client
      .channel(`global-invitations-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_games" }, () => void refreshInvitations())
      .subscribe();
    const interval = window.setInterval(() => void refreshInvitations(), 1_000);
    const onFocus = () => void refreshInvitations();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void client.removeChannel(channel);
    };
  }, [profile.id]);

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

  async function handleLogin(username: string) {
    const nextProfile = await loginOrCreateProfile(username);
    saveProfile(nextProfile);
    setProfile(nextProfile);
  }

  function handleLocalLogin(username: string) {
    const nextProfile = { username, chessComUsername: username, createdAt: new Date().toISOString() };
    saveProfile(nextProfile);
    setProfile(nextProfile);
    setCloudState("local");
  }

  function logout() {
    clearProfile();
    syncReady.current = false;
    setPendingCloud(null);
    setPendingInvitation(null);
    setProfile({});
    setCloudState(isSupabaseConfigured ? "syncing" : "local");
  }

  async function resolveMigration(uploadLocal: boolean) {
    if (!profile.id || !pendingCloud) return;
    const nextGames = uploadLocal ? mergeSnapshots(games, pendingCloud.games) : pendingCloud.games;
    const nextSettings = uploadLocal ? settings : (pendingCloud.settings ?? settings);
    setGames(nextGames);
    setSettings(nextSettings);
    setSelectedGameId(nextGames[0]?.id ?? null);
    await storageAdapter.saveGames(nextGames);
    markMigrated(profile.id);
    setPendingCloud(null);
    syncReady.current = true;
    setCloudState("syncing");
    try {
      await pushCloudSnapshot(profile.id, nextGames, nextSettings);
      setCloudState("online");
    } catch {
      setCloudState("offline");
    }
  }

  if (booting) return <div className="app-loading"><BrandLogo size="lg" /><span>FranChess wird vorbereitet...</span></div>;
  if (!profile.username) return <LoginScreen onLogin={handleLogin} onLocalLogin={handleLocalLogin} cloudAvailable={isSupabaseConfigured} />;

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
      profile={profile}
      cloudState={cloudState}
      pendingInvitation={pendingInvitation}
      onOpenInvitation={() => navigate("online")}
    >
      {view === "home" && <HomePage onNavigate={navigate} games={games} />}
      {view === "online" && <OnlinePlayPage profile={profile} settings={settings} games={games} onGamesChange={updateGames} onOpenGame={openGame} />}
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
          onLogout={logout}
        />
      )}
    </Layout>
    {pendingCloud && (
      <div className="modal-backdrop">
        <section className="migration-modal" role="dialog" aria-modal="true" aria-labelledby="migration-title">
          <p className="eyebrow">Erster Cloud-Start</p>
          <h2 id="migration-title">Lokale Daten in Cloud übernehmen?</h2>
          <p>Auf diesem Gerät wurden bereits Daten gefunden. Du kannst sie mit dem Profil zusammenführen oder stattdessen den aktuellen Cloud-Stand verwenden.</p>
          <div className="migration-actions">
            <button type="button" className="login-primary" onClick={() => void resolveMigration(true)}>Lokale Daten übernehmen</button>
            <button type="button" className="login-secondary" onClick={() => void resolveMigration(false)}>Cloud-Daten verwenden</button>
          </div>
        </section>
      </div>
    )}
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
