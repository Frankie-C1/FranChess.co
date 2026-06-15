import { useState } from "react";
import { Cloud, CloudOff, LogIn, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function LoginScreen({
  onLogin,
  onLocalLogin,
  cloudAvailable
}: {
  onLogin: (username: string) => Promise<void>;
  onLocalLogin: (username: string) => void;
  cloudAvailable: boolean;
}) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const clean = username.trim().replace(/^@/, "");
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(clean)) {
      setError("Bitte 3 bis 32 Zeichen verwenden: Buchstaben, Zahlen, Punkt, _ oder -.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(clean);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Cloud-Login ist gerade nicht erreichbar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <BrandLogo size="lg" />
          <div>
            <p className="eyebrow">FranChess.co</p>
            <h1>Dein Schach. Auf jedem Gerät.</h1>
          </div>
        </div>
        <p className="login-copy">
          Ein Benutzername genügt. Am besten verwendest du deinen Chess.com Namen, damit Import, Profil und Cloud-Sync zusammenpassen.
        </p>
        <label className="field-label">
          Benutzername
          <div className="login-input-wrap">
            <span>@</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void submit(); }}
              placeholder="dein_username"
              autoFocus
              autoComplete="username"
            />
          </div>
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="button" className="login-primary" onClick={() => void submit()} disabled={loading || !cloudAvailable}>
          {cloudAvailable ? <Cloud size={18} /> : <CloudOff size={18} />}
          {loading ? "Profil wird verbunden..." : cloudAvailable ? "Profil öffnen" : "Cloud nicht konfiguriert"}
        </button>
        <button type="button" className="login-secondary" onClick={() => onLocalLogin(username.trim() || "lokaler-spieler")}>
          <LogIn size={17} /> Nur lokal fortfahren
        </button>
        <div className="login-note">
          <ShieldCheck size={18} />
          <span>Kein Passwort, keine E-Mail. Dieses Profil ist bewusst ein einfacher Sync-Schlüssel und kein sicherer Auth-Login.</span>
        </div>
      </section>
    </main>
  );
}
