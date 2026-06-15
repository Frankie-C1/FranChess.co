import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Check, Clock3, Gamepad2, Radio, Search, Send, Users } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { useResponsiveBoardWidth } from "../components/useResponsiveBoardWidth";
import { boardColorsFor, buildSquareStyles, pieceColorAt } from "../lib/chess/boardUi";
import { mergeUniqueGames } from "../lib/chess/dedupe";
import { parsePgnBatch } from "../lib/chess/pgn";
import { supabase } from "../lib/storage/supabase";
import type { AppSettings, CoachUserProfile, StoredGame } from "../types";

interface PublicProfile {
  id: string;
  username: string;
  last_seen: string;
}

interface OnlineMove {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fen: string;
  played_at: string;
}

interface OnlineGameRow {
  id: string;
  white_profile_id: string;
  black_profile_id: string;
  created_by_profile_id: string;
  white_username?: string;
  black_username?: string;
  status: "waiting" | "active" | "finished" | "declined";
  time_control: string;
  pgn: string;
  fen: string;
  move_history: OnlineMove[];
  clock_white_ms: number;
  clock_black_ms: number;
  last_move_at: string | null;
  created_at: string;
  updated_at: string;
}

const timeControls = ["1+0", "3+0", "5+0", "10+0", "15+10"];

export function OnlinePlayPage({
  profile,
  settings,
  games,
  onGamesChange,
  onOpenGame
}: {
  profile: CoachUserProfile;
  settings: AppSettings;
  games: StoredGame[];
  onGamesChange: (games: StoredGame[]) => Promise<void>;
  onOpenGame: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PublicProfile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PublicProfile | null>(null);
  const [timeControl, setTimeControl] = useState("5+0");
  const [onlineGames, setOnlineGames] = useState<OnlineGameRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activeGame = onlineGames.find((game) => game.id === selectedId)
    ?? onlineGames.find((game) => game.status === "active")
    ?? onlineGames[0]
    ?? null;
  const invitations = onlineGames.filter((game) => game.status === "waiting" && isInvitedPlayer(game, profile.id));

  useEffect(() => {
    if (!supabase || !profile.id) return;
    const client = supabase;
    void refreshGames();
    const channel = client
      .channel(`online-games-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "online_games" }, () => void refreshGames())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [profile.id]);

  useEffect(() => {
    if (!activeGame || activeGame.status !== "finished" || !activeGame.pgn) return;
    const parsed = parsePgnBatch(activeGame.pgn)[0];
    if (!parsed) return;
    parsed.id = activeGame.id;
    parsed.source = { provider: "pgn", importedBy: profile.username };
    const merged = mergeUniqueGames(games, [parsed]);
    if (merged.added.length) void onGamesChange(merged.games);
  }, [activeGame?.id, activeGame?.status, activeGame?.pgn]);

  async function refreshGames() {
    if (!supabase || !profile.id) return;
    const { data, error } = await supabase
      .from("online_games")
      .select("*")
      .or(`white_profile_id.eq.${profile.id},black_profile_id.eq.${profile.id}`)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) {
      setMessage("Online-Partien konnten nicht geladen werden.");
      return;
    }
    const rows = (data ?? []) as OnlineGameRow[];
    setOnlineGames(rows);
    setSelectedId((current) => current ?? rows[0]?.id ?? null);
  }

  async function searchPlayers() {
    if (!supabase || !profile.id) return;
    const clean = query.trim().replace(/^@/, "");
    if (clean.length < 2) {
      setMessage("Gib mindestens zwei Zeichen ein.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, last_seen")
      .ilike("username", `%${clean}%`)
      .neq("id", profile.id)
      .limit(8);
    setLoading(false);
    if (error) {
      setMessage("Spielersuche ist gerade nicht erreichbar.");
      return;
    }
    setPlayers((data ?? []) as PublicProfile[]);
    setMessage(data?.length ? "" : "Kein passendes Profil gefunden.");
  }

  async function createInvitation() {
    if (!supabase || !profile.id || !profile.username || !selectedPlayer) return;
    setLoading(true);
    const selfIsWhite = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0;
    const { initialMs } = parseTimeControl(timeControl);
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("online_games").insert({
      id: crypto.randomUUID(),
      white_profile_id: selfIsWhite ? profile.id : selectedPlayer.id,
      black_profile_id: selfIsWhite ? selectedPlayer.id : profile.id,
      created_by_profile_id: profile.id,
      white_username: selfIsWhite ? profile.username : selectedPlayer.username,
      black_username: selfIsWhite ? selectedPlayer.username : profile.username,
      status: "waiting",
      time_control: timeControl,
      pgn: "",
      fen: new Chess().fen(),
      move_history: [],
      clock_white_ms: initialMs,
      clock_black_ms: initialMs,
      last_move_at: null,
      created_at: now,
      updated_at: now
    }).select("*").single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setOnlineGames((current) => [data as OnlineGameRow, ...current]);
    setSelectedId(data.id);
    setMessage(`Einladung an ${selectedPlayer.username} gesendet. Die Farbe wurde zufällig vergeben.`);
  }

  async function acceptInvitation(game: OnlineGameRow) {
    if (!supabase) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("online_games").update({ status: "active", last_move_at: now, updated_at: now }).eq("id", game.id).eq("status", "waiting");
    if (error) setMessage(error.message);
    else {
      setSelectedId(game.id);
      await refreshGames();
    }
  }

  if (!supabase || !profile.id) {
    return (
      <section className="premium-panel online-offline">
        <Gamepad2 size={28} />
        <h1>Online spielen benötigt Cloud-Sync</h1>
        <p>Du bist aktuell im lokalen Modus. Sobald Supabase erreichbar und dein Profil verbunden ist, werden Spielersuche, Einladungen und Live-Züge aktiviert.</p>
      </section>
    );
  }

  return (
    <div className="online-layout">
      <section className="online-lobby premium-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Live Arena</p><h1>Online spielen</h1></div>
          <span className="status-chip"><Radio size={14} /> Realtime</span>
        </div>

        {invitations.length > 0 && (
          <div className="invitation-stack">
            <h2>Offene Einladungen</h2>
            {invitations.map((game) => (
              <button type="button" key={game.id} className="invitation-card" onClick={() => void acceptInvitation(game)}>
                <span><strong>{opponentName(game, profile.id)}</strong><small>{game.time_control} · Farbe zufällig</small></span>
                <span className="accept-icon"><Check size={17} /></span>
              </button>
            ))}
          </div>
        )}

        <label className="field-label">Spieler suchen</label>
        <div className="search-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchPlayers(); }} placeholder="Benutzername" />
          <button type="button" onClick={() => void searchPlayers()} aria-label="Suchen"><Search size={18} /></button>
        </div>
        <div className="player-results">
          {players.map((player) => (
            <button type="button" key={player.id} onClick={() => setSelectedPlayer(player)} className={selectedPlayer?.id === player.id ? "selected" : ""}>
              <span className="player-avatar">{player.username.slice(0, 1).toUpperCase()}</span>
              <span><strong>{player.username}</strong><small>Profil verfügbar</small></span>
            </button>
          ))}
        </div>

        <label className="field-label">Zeitkontrolle</label>
        <div className="time-grid">
          {timeControls.map((value) => <button type="button" key={value} className={timeControl === value ? "selected" : ""} onClick={() => setTimeControl(value)}>{value}</button>)}
        </div>
        <ActionButton className="w-full" onClick={() => void createInvitation()} disabled={!selectedPlayer || loading} icon={<Send size={17} />}>Einladung erstellen</ActionButton>
        {message && <p className="online-message">{message}</p>}

        <div className="game-list">
          <h2>Deine Online-Partien</h2>
          {onlineGames.map((game) => (
            <button type="button" key={game.id} className={activeGame?.id === game.id ? "selected" : ""} onClick={() => setSelectedId(game.id)}>
              <Users size={17} /><span><strong>{opponentName(game, profile.id)}</strong><small>{statusLabel(game.status)} · {game.time_control}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="online-board-area">
        {activeGame ? (
          <LiveBoard game={activeGame} profile={profile} settings={settings} onUpdated={refreshGames} onOpenAnalysis={() => onOpenGame(activeGame.id)} />
        ) : (
          <div className="premium-panel online-empty"><Gamepad2 size={32} /><h2>Bereit für eine Partie?</h2><p>Suche links nach einem echten FranChess-Profil und sende eine Einladung.</p></div>
        )}
      </section>
    </div>
  );
}

function LiveBoard({ game, profile, settings, onUpdated, onOpenAnalysis }: { game: OnlineGameRow; profile: CoachUserProfile; settings: AppSettings; onUpdated: () => Promise<void>; onOpenAnalysis: () => void }) {
  const board = useResponsiveBoardWidth(690);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [tick, setTick] = useState(Date.now());
  const chess = useMemo(() => replayGame(game), [game.fen, game.move_history]);
  const isWhite = game.white_profile_id === profile.id;
  const orientation = isWhite ? "white" : "black";
  const myTurn = game.status === "active" && chess.turn() === (isWhite ? "w" : "b");
  const boardColors = boardColorsFor(settings.boardTheme, settings.colorTheme, settings.darkMode);
  const squareStyles = buildSquareStyles({ fen: chess.fen(), selectedSquare, showLegalMoves: settings.showLegalMoves && myTurn });
  const clocks = currentClocks(game, chess.turn(), tick);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (game.status !== "active") return;
    if (clocks.white <= 0) void finishOnTime("0-1");
    else if (clocks.black <= 0) void finishOnTime("1-0");
  }, [game.status, clocks.white, clocks.black]);

  async function finishOnTime(result: "1-0" | "0-1") {
    if (!supabase) return;
    const finalChess = replayGame(game);
    finalChess.header(
      "Event", "FranChess Online",
      "Site", "FranChess.co",
      "Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      "White", game.white_username || "White",
      "Black", game.black_username || "Black",
      "TimeControl", game.time_control,
      "Termination", "time forfeit",
      "Result", result
    );
    const now = new Date().toISOString();
    const { error } = await supabase.from("online_games").update({ status: "finished", pgn: finalChess.pgn(), updated_at: now }).eq("id", game.id).eq("status", "active");
    if (!error) await onUpdated();
  }

  async function playMove(from: Square, to: Square) {
    if (!supabase || !myTurn) return false;
    const next = replayGame(game);
    const move = next.move({ from, to, promotion: "q" });
    setSelectedSquare(null);
    if (!move) return false;
    const now = new Date().toISOString();
    const { incrementMs } = parseTimeControl(game.time_control);
    const nextClocks = currentClocks(game, move.color, Date.now());
    if (move.color === "w") nextClocks.white += incrementMs;
    else nextClocks.black += incrementMs;
    const result = gameResult(next);
    next.header(
      "Event", "FranChess Online",
      "Site", "FranChess.co",
      "Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      "White", game.white_username || "White",
      "Black", game.black_username || "Black",
      "TimeControl", game.time_control,
      "Result", result
    );
    const moveHistory = [...(game.move_history ?? []), { from, to, promotion: move.promotion, san: move.san, fen: next.fen(), played_at: now }];
    const { error } = await supabase.from("online_games").update({
      fen: next.fen(),
      pgn: next.pgn(),
      move_history: moveHistory,
      status: result === "*" ? "active" : "finished",
      clock_white_ms: Math.max(0, nextClocks.white),
      clock_black_ms: Math.max(0, nextClocks.black),
      last_move_at: now,
      updated_at: now
    }).eq("id", game.id).eq("updated_at", game.updated_at);
    if (!error) await onUpdated();
    return !error;
  }

  function handleDrop(from: Square, to: Square): boolean {
    if (!myTurn) return false;
    void playMove(from, to);
    return true;
  }

  function clickSquare(square: Square) {
    if (!myTurn) return;
    if (selectedSquare) {
      const ownColor = isWhite ? "w" : "b";
      if (pieceColorAt(chess.fen(), square) === ownColor) setSelectedSquare(square);
      else void playMove(selectedSquare, square);
      return;
    }
    if (pieceColorAt(chess.fen(), square) === (isWhite ? "w" : "b")) setSelectedSquare(square);
  }

  return (
    <div className="live-board-shell">
      <div className="online-game-header premium-panel">
        <div><p className="eyebrow">{statusLabel(game.status)}</p><h2>{game.white_username || "Weiß"} vs {game.black_username || "Schwarz"}</h2></div>
        <span className="status-chip"><Clock3 size={14} /> {game.time_control}</span>
      </div>
      <PlayerClock name={orientation === "white" ? game.black_username : game.white_username} value={orientation === "white" ? clocks.black : clocks.white} active={game.status === "active" && chess.turn() === (orientation === "white" ? "b" : "w")} />
      <div ref={board.ref} className="board-touch-area online-board-frame">
        <Chessboard
          id={`online-${game.id}`}
          position={chess.fen()}
          boardWidth={board.width}
          boardOrientation={orientation}
          onPieceDrop={(from, to) => handleDrop(from as Square, to as Square)}
          onSquareClick={(square) => clickSquare(square as Square)}
          isDraggablePiece={({ piece }) => myTurn && piece.startsWith(isWhite ? "w" : "b")}
          customSquareStyles={squareStyles}
          customDarkSquareStyle={{ backgroundColor: boardColors.dark }}
          customLightSquareStyle={{ backgroundColor: boardColors.light }}
          animationDuration={160}
        />
      </div>
      <PlayerClock name={orientation === "white" ? game.white_username : game.black_username} value={orientation === "white" ? clocks.white : clocks.black} active={game.status === "active" && chess.turn() === (orientation === "white" ? "w" : "b")} />
      <div className="online-moves premium-panel">
        <div className="section-heading"><h3>Zugverlauf</h3><span>{game.move_history?.length ?? 0} Halbzüge</span></div>
        <div className="move-strip">{game.move_history?.map((move, index) => <span key={`${move.san}-${index}`}>{Math.floor(index / 2) + 1}{index % 2 ? "..." : "."} {move.san}</span>)}</div>
        {game.status === "waiting" && <p>Einladung gesendet. Die Partie startet, sobald der zweite Spieler beitritt.</p>}
        {game.status === "active" && <p>{myTurn ? "Du bist am Zug." : "Warte auf den Zug deines Gegners."}</p>}
        {game.status === "finished" && <ActionButton onClick={onOpenAnalysis}>Partie analysieren</ActionButton>}
      </div>
    </div>
  );
}

function PlayerClock({ name, value, active }: { name?: string; value: number; active: boolean }) {
  return <div className={`player-clock ${active ? "active" : ""}`}><span>{name || "Spieler"}</span><strong>{formatClock(value)}</strong></div>;
}

function replayGame(game: Pick<OnlineGameRow, "move_history">): Chess {
  const chess = new Chess();
  for (const move of game.move_history ?? []) chess.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
  return chess;
}

function gameResult(chess: Chess): "1-0" | "0-1" | "1/2-1/2" | "*" {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0";
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) return "1/2-1/2";
  return "*";
}

function parseTimeControl(value: string): { initialMs: number; incrementMs: number } {
  const [minutes, increment] = value.split("+").map(Number);
  return { initialMs: (minutes || 5) * 60_000, incrementMs: (increment || 0) * 1000 };
}

function currentClocks(game: OnlineGameRow, turn: "w" | "b", now: number): { white: number; black: number } {
  const clocks = { white: game.clock_white_ms, black: game.clock_black_ms };
  if (game.status !== "active" || !game.last_move_at) return clocks;
  const elapsed = Math.max(0, now - new Date(game.last_move_at).getTime());
  if (turn === "w") clocks.white -= elapsed;
  else clocks.black -= elapsed;
  return clocks;
}

function formatClock(value: number): string {
  const total = Math.max(0, Math.ceil(value / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function opponentName(game: OnlineGameRow, profileId?: string): string {
  return game.white_profile_id === profileId ? (game.black_username || "Gegner") : (game.white_username || "Gegner");
}

function isInvitedPlayer(game: OnlineGameRow, profileId?: string): boolean {
  if (!profileId) return false;
  return game.created_by_profile_id !== profileId && (game.white_profile_id === profileId || game.black_profile_id === profileId);
}

function statusLabel(status: OnlineGameRow["status"]): string {
  return status === "waiting" ? "Wartet" : status === "active" ? "Live" : status === "finished" ? "Beendet" : "Abgelehnt";
}
