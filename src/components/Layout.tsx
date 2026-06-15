import { useState, type ReactNode } from "react";
import { ChevronRight, Cloud, CloudOff, Crown, Menu, RefreshCw, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CloudSyncState, CoachUserProfile, CoachView, LayoutMode } from "../types";
import { BrandLogo } from "./BrandLogo";

interface LayoutProps {
  nav: Array<{ id: CoachView; label: string; icon: LucideIcon }>;
  view: CoachView;
  onNavigate: (view: CoachView) => void;
  layoutMode: LayoutMode;
  profile: CoachUserProfile;
  cloudState: CloudSyncState;
  utility?: ReactNode;
  children: ReactNode;
}

export function Layout({ nav, view, onNavigate, layoutMode, profile, cloudState, utility, children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const forceTop = layoutMode === "top";
  const forceBottom = layoutMode === "bottom";

  function navigate(nextView: CoachView) {
    onNavigate(nextView);
    setMenuOpen(false);
  }

  return (
    <div className={`app-shell ${forceTop ? "layout-top" : ""} ${forceBottom ? "layout-bottom" : ""}`}>
      <aside className="desktop-sidebar">
        <button type="button" className="sidebar-brand" onClick={() => navigate("home")}>
          <BrandLogo size="sm" />
          <span><strong>FranChess.co</strong><small>Premium Chess Studio</small></span>
        </button>
        <nav className="sidebar-nav" aria-label="Hauptnavigation">
          {nav.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} />)}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-avatar">{profile.username?.slice(0, 1).toUpperCase()}</span>
          <span className="profile-copy"><strong>{profile.username}</strong><small><CloudLabel state={cloudState} /></small></span>
          <ChevronRight size={17} />
        </div>
      </aside>

      <div className="app-content">
        <header className="compact-header">
          <button type="button" className="compact-brand" onClick={() => navigate("home")}><BrandLogo size="sm" /><strong>FranChess.co</strong></button>
          <div className="compact-actions"><CloudPill state={cloudState} />{utility}<button type="button" onClick={() => setMenuOpen(true)} aria-label="Menü öffnen"><Menu size={20} /></button></div>
        </header>

        <nav className="tablet-nav" aria-label="Tablet-Navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return <button type="button" key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={16} /><span>{item.label}</span></button>;
          })}
        </nav>

        <main className="app-main">{children}</main>
      </div>

      {menuOpen && <button type="button" className="mobile-menu-backdrop" aria-label="Menü schließen" onClick={() => setMenuOpen(false)} />}
      <aside className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="mobile-menu-head"><div><p className="eyebrow">Navigation</p><h2>FranChess.co</h2></div><button type="button" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <div className="mobile-profile-row"><span className="profile-avatar">{profile.username?.slice(0, 1).toUpperCase()}</span><span><strong>{profile.username}</strong><small><CloudLabel state={cloudState} /></small></span></div>
        <nav className="mobile-menu-nav">
          {nav.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} />)}
        </nav>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <MobileButton nav={nav} id="home" view={view} onNavigate={navigate} />
        <MobileButton nav={nav} id="viewer" view={view} onNavigate={navigate} />
        <button type="button" className={`coach-orb ${view === "play" ? "active" : ""}`} onClick={() => navigate("play")}><Crown size={21} /><span>Coach</span></button>
        <MobileButton nav={nav} id="training" view={view} onNavigate={navigate} />
        <button type="button" className={menuOpen ? "active" : ""} onClick={() => setMenuOpen(true)}><Menu size={20} /><span>Menü</span></button>
      </nav>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: { id: CoachView; label: string; icon: LucideIcon }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button type="button" className={active ? "active" : ""} onClick={onClick}><Icon size={18} /><span>{item.label}</span>{active && <i />}</button>;
}

function MobileButton({ nav, id, view, onNavigate }: { nav: Array<{ id: CoachView; label: string; icon: LucideIcon }>; id: CoachView; view: CoachView; onNavigate: (view: CoachView) => void }) {
  const item = nav.find((entry) => entry.id === id);
  if (!item) return null;
  const Icon = item.icon;
  return <button type="button" className={view === id ? "active" : ""} onClick={() => onNavigate(id)}><Icon size={20} /><span>{item.label}</span></button>;
}

function CloudLabel({ state }: { state: CloudSyncState }) {
  if (state === "syncing") return <>Synchronisiert...</>;
  if (state === "online") return <>Cloud-Sync aktiv</>;
  if (state === "local") return <>Nur lokal</>;
  return <>Cloud-Sync offline</>;
}

function CloudPill({ state }: { state: CloudSyncState }) {
  return <span className={`cloud-pill ${state}`}>{state === "online" ? <Cloud size={15} /> : state === "syncing" ? <RefreshCw size={15} className="spin" /> : <CloudOff size={15} />}<span><CloudLabel state={state} /></span></span>;
}
