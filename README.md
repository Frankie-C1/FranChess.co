# FranChess.co

FranChess.co ist eine kostenlose Open-Source-Schachtrainer-Webapp fuer PGN-Import, Chess.com-Import, lokale Analyse, Fehlerprofile, Training, Coach-Modus und Coach-Export.

## Installation

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Supabase Setup

FranChess arbeitet local-first. Supabase erweitert die lokale Speicherung um Profil-Sync und Online-Partien; Import, Viewer, Coach, Training und Stockfish bleiben auch bei einem Cloud-Ausfall lokal nutzbar.

1. Im Supabase SQL Editor zuerst [`supabase/migrations/202606150001_franchess_cloud.sql`](supabase/migrations/202606150001_franchess_cloud.sql) ausfuehren.
2. Danach [`supabase/migrations/202606150002_online_game_runtime.sql`](supabase/migrations/202606150002_online_game_runtime.sql) in einer neuen Query ausfuehren. Diese Migration stellt die serverseitige Uhr sowie Zug-, Remis- und Aufgeben-Operationen bereit.
3. Lokal eine `.env` oder `.env.local` anlegen. In Netlify dieselben Werte unter **Project configuration > Environment variables** eintragen.

```env
VITE_SUPABASE_URL=https://hxvhnxtcifhroisqdqsy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_kTDseP3mKy1tTQwvXww8Ew_YiZpyJHq
```

Nur Project URL und Publishable/Anon Key gehoeren ins Frontend. Niemals PostgreSQL Connection URL, Datenbankpasswort oder Service Role Key in Vite-Variablen eintragen.

Die Migration erstellt:

- `profiles`
- `user_settings`
- `games`
- `analyses`
- `training_progress`
- `puzzle_progress`
- `opening_progress`
- `online_games`

`online_games` enthaelt zusaetzlich Realtime- und Uhrfelder (`created_by_profile_id`, Spielernamen, Restzeiten und `last_move_at`). Die Tabelle wird der Supabase-Realtime-Publication hinzugefuegt.

## Login ohne Passwort

Beim ersten Start fragt FranChess nur nach einem Benutzernamen. Idealerweise entspricht er dem Chess.com Username. Das Geraet speichert Profil-ID und Username lokal und meldet den Nutzer bei spaeteren Starts automatisch an.

Wichtig: Das ist bewusst **kein sicherer Auth-Login**. Ein Benutzername ist nur ein einfacher Profil- und Sync-Schluessel. Wer denselben Namen kennt, kann dasselbe Profil oeffnen. Die RLS-Policies der Migration sind deshalb fuer `anon` permissiv und duerfen nicht mit einer geschuetzten Benutzerverwaltung verwechselt werden. Fuer private oder sensible Daten muss spaeter Supabase Auth ergaenzt werden.

Wenn Supabase nicht konfiguriert oder nicht erreichbar ist, kann die App im lokalen Modus weiterverwendet werden. Der Cloud-Status wird in Navigation und Profil sichtbar angezeigt.

## Cloud Sync

Synchronisiert werden:

- Einstellungen inklusive Theme, Brett, Layout, Engine-Elo und Zugmarkierungen
- importierte PGN- und Chess.com-Partien
- Favoriten
- Stockfish-Analysen als JSON
- Puzzle-Fortschritt
- Eroeffnungsfortschritt
- generierter Trainingsstand

Lokale Daten werden immer zuerst gespeichert. Cloud-Sync laeuft danach im Hintergrund, erneut bei wiederhergestellter Verbindung und periodisch. Beim ersten Cloud-Login mit vorhandenen lokalen Daten fragt die App: **„Lokale Daten in Cloud uebernehmen?“**. Dabei kann lokal und Cloud zusammengefuehrt oder der Cloud-Stand verwendet werden.

Konfliktverhalten: Partien werden ueber ID und bestehenden PGN-Fingerprint zusammengefuehrt. Lokale Analysen und Favoriten bleiben beim Merge erhalten. Puzzle- und Eroeffnungsfortschritt wird nach Puzzle-/Opening-ID zusammengefuehrt.

## Online spielen

Der Bereich **Online spielen** ist als funktionsfaehige Supabase-Realtime-Version umgesetzt:

- echte Profilsuche, keine Fake-Spieler
- Einladung an einen ausgewaehlten Nutzer
- Zeitkontrollen `1+0`, `3+0`, `5+0`, `10+0`, `15+10`
- zufaellige Farbvergabe
- offene Einladung und Beitritt des zweiten Spielers
- legale Zuege mit `chess.js`
- Live-Zuege ueber Supabase Realtime
- serverautorisierte, zwischen Geraeten synchronisierte Restzeiten
- Coach-Brettsteuerung, Live-Bewertungsbalken und Materialanzeige
- Remis anbieten/annehmen und Partie aufgeben
- synchronisierte FEN, Zugliste und PGN
- Zeitueberschreitung und normales Partieende
- fertige Partie wird automatisch in die importierten Partien uebernommen und ist im vorhandenen Viewer analysierbar

Realtime setzt voraus, dass beide SQL-Migrationen ausgefuehrt wurden und beide Browser dasselbe Supabase-Projekt erreichen. Uhr und Restzeitberechnung laufen atomar mit der Supabase-Serverzeit; Clients gleichen ihre Anzeige regelmaessig mit dieser Zeit ab. Die Zugaktualisierung verwendet zusaetzlich einen `updated_at`-Vergleich, um gleichzeitige veraltete Schreibvorgaenge abzuweisen. Fuer Turnierbetrieb waeren verbindliche serverseitige Schachregelvalidierung und Supabase Auth weitere Haertungsschritte.

## Stockfish Setup

FranChess.co benoetigt echte Stockfish-WASM-Dateien. Beim Build kopiert `npm run prepare:stockfish` die Browser-Variante aus dem npm-Paket `stockfish@18.0.7` in den Public-Ordner:

```text
public/stockfish/stockfish.js
public/stockfish/stockfish.wasm
```

Es gibt keinen Fake-Fallback. Wenn Stockfish nicht geladen werden kann, zeigt die App eine klare Fehlermeldung und ersetzt Analyse, Coach-Zuege oder Vorschlaege nicht durch Material- oder Mobilitaetsheuristiken.

## Aktuelle Funktionen

- PGN-Dateien importieren und lokal speichern
- oeffentliche Chess.com-Partien per PubAPI oder Netlify Function Proxy importieren
- echte Stockfish-WASM-Analyse mit Engine-Elo und MultiPV/Top-5-Vorschlaegen
- Dashboard, Viewer, Coach, Training, Export und Einstellungen
- Viewer mit Brettnavigation, Zugliste, Bewertungsgrafik, Bewertungsbalken, Materialanzeige, Fehlerdetails und Varianten
- Coach-Modus mit Weiss/Schwarz-Wahl, Verlauf, Tastatur-/Buttonnavigation, Bewertung, Top-Zugvorschlaegen und natuerlichem Antwort-Delay
- Favoriten per Stern in Partienlisten und in den Einstellungen
- Klick-zu-Klick-Ziehen, Drag-and-drop und optionale Markierung legaler Zielfelder
- Coach-Export als ZIP mit `games.pgn`, `analysis.json`, `mistakes.csv`, `profile.json`, `summary.md`
- Netlify Build via `netlify.toml`

## Theme-System

Einstellungen werden lokal unter `franchess.settings.v1` gespeichert. Neue Nutzer starten im Dark Mode; vorhandene Einstellungen werden respektiert.

Verfuegbare Farbpaletten:

- Standard Gruen/Braun
- Schwarz/Gold
- Schwarz/Lila
- Klassisch Holz
- Minimal Grau
- Blau/Grau
- Turnier Gruen
- Nacht Braun

Dark/Light Mode bleibt eine eigene Einstellung. Die Farbpalette steuert Akzente, Flaechen, Buttons, aktive Tabs und App-Navigation ueber CSS-Variablen.

## Brettdesign

Viewer und Coach nutzen eine gemeinsame gespeicherte Brettfarbe:

- Automatisch nach App-Theme
- Klassisch Gruen
- Braun/Holz
- Grau
- Blau/Grau
- Dunkel

Legal-Move-Dots, Pfeile und Markierungen bleiben dezent und auf den Paletten lesbar.

## Layout-Modus

Der Layout-Modus ist persistent:

- `Automatisch`: Handy nutzt Bottom-Bar, Tablet eine kompakte Top-Navigation und Desktop die Sidebar.
- `Web/Layout oben`: die kompakte Navigation bleibt auch in schmalen Layouts oben.
- `Mobile Layout unten`: Bottom-Bar kann auch auf Desktop/Laptop erzwungen werden.

Die Bottom-Bar beruecksichtigt Safe Areas und ist etwas deckender, damit sie mehr wie eine native App-Leiste wirkt.

## Training, Puzzles und Eroeffnungen

Der Training-Tab ist in drei Bereiche gegliedert:

- `Training`: Aufgaben aus eigenen analysierten Partien. Ein Klick oeffnet die passende Partie im Viewer.
- `Puzzles`: echte Lichess-Puzzle-Daten aus einem lokalen Import.
- `Eroeffnungen`: importierte PGNs als trainierbare Hauptvarianten mit Kommentaren.

### Lichess Puzzle Database importieren

FranChess.co nutzt keine Chess.com-Puzzle-Daten und scrapet keine Websites. Die Lichess Puzzle Database ist offiziell frei verfuegbar und laut Lichess unter Creative Commons CC0 veroeffentlicht: https://database.lichess.org/

Die komplette CSV ist zu gross fuer das Frontend. Lade sie lokal herunter, entpacke sie und erzeuge einen kleinen Datensatz:

```bash
node scripts/import-lichess-puzzles.mjs path/to/lichess_db_puzzle.csv public/data/puzzles.json 1000
```

Der Importer filtert auf typische Trainingsthemen wie `fork`, `pin`, `mate`, `hangingPiece`, `endgame`, `advantage`, `crushing`, `discoveredAttack` und `opening`. Wenn `public/data/puzzles.json` fehlt, zeigt die App eine Import-Anleitung statt Fake-Puzzles.

### Eroeffnungs-PGN importieren

Im Bereich `Eroeffnungen` kann ein eigenes PGN eingefuegt werden. Die Hauptvariante wird trainierbar, Kommentare in `{ ... }` werden als Hinweise angezeigt und lokal gespeichert.

Bitte keine fremden Lichess Studies, Nutzertexte oder fremde Kommentare ungeprueft kopieren. Eigene PGNs, eigene Study-Exports oder frei lizenzierte PGNs sind der saubere Weg.

## Chess.com Auto-Import

Im Upload-Bereich kann ein Chess.com Username eingetragen werden. FranChess.co nutzt die offizielle oeffentliche PubAPI:

```text
https://api.chess.com/pub/player/{username}/games/archives
https://api.chess.com/pub/player/{username}/games/{yyyy}/{mm}/pgn
```

Falls der Browser direkte PubAPI-Anfragen blockiert, nutzt FranChess.co den Netlify Function Proxy:

```text
/api/chesscom?url=...
```

Der Proxy erlaubt nur URLs unter `https://api.chess.com/pub/`. Fuer einen lokalen Test des Proxy-Pfads nutze Netlify Dev statt reinem Vite:

```bash
netlify dev
```

## Bekannte Grenzen

- MultiPV haengt davon ab, ob die konkrete Stockfish-WASM-Version `MultiPV` als UCI-Option meldet.
- UCI_Elo haengt davon ab, ob die Stockfish-Version `UCI_Elo` und `UCI_LimitStrength` meldet.
- Varianten im Viewer und Coach sind noch keine dauerhaft gespeicherten Variantenbaeume.
- Der Puzzle-Bereich benoetigt eine lokal erzeugte `public/data/puzzles.json`; es wird kein grosser Lichess-Datensatz gebundelt.
- Der Eroeffnungsbereich trainiert aktuell die Hauptvariante und zeigt PGN-Kommentare; vollstaendige Variantenbaum-UI ist vorbereitet, aber noch nicht ausgebaut.
- Der Button `Als Training speichern` markiert im Viewer noch nicht dauerhaft eine eigene Trainingssammlung.
- Der Username-Login besitzt absichtlich kein Passwort und keine echte Identitaetspruefung.
- Realtime-Uhren werden clientseitig dargestellt und in der Datenbank fortgeschrieben; fuer wettbewerbssichere Bedenkzeit braucht es eine serverseitige Autoritaet.
- Offline erstellte lokale Daten werden spaeter synchronisiert, Online-Partien selbst koennen ohne Verbindung jedoch nicht fortgesetzt werden.
- Importierte eigene Eroeffnungs-PGN-Dateien bleiben lokal; synchronisiert wird derzeit ihr Fortschritt, nicht der komplette Variantenbaum.
- Der Vite-Build meldet wegen Schachbrett, Supabase und Analyse-Code einen Bundle-Groessenhinweis; das ist kein Build-Fehler.
