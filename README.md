# FranChess.co

FranChess.co ist eine kostenlose Open-Source-Schachtrainer-Webapp für PGN-Import, lokale Analyse, Fehlerprofile, Training und Coach-Export.

## Installation

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Stockfish Setup

FranChess.co nutzt das npm-Paket `stockfish@18.0.7`. Beim Build kopiert `npm run prepare:stockfish` die empfohlene Browser-Variante in den Public-Ordner:

```text
node_modules/stockfish/bin/stockfish-18-lite-single.js
node_modules/stockfish/bin/stockfish-18-lite-single.wasm
```

Ziel:

```text
public/stockfish/stockfish.js
public/stockfish/stockfish.wasm
```

Diese Variante ist echtes WASM, single-threaded und braucht keine Cross-Origin-Isolation-Header. FranChess.co lädt `public/stockfish/stockfish.js` als WebWorker; der Worker lädt `stockfish.wasm` aus demselben Ordner. Wenn der Worker nicht mit `uciok` und `readyok` antwortet, schaltet die App auf eine lokale Material/Mobilitäts-Heuristik um und zeigt das im Viewer an.

## Supabase Optional

Ohne ENV-Variablen nutzt FranChess.co `localStorage`. Optional:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Der Tabellenentwurf liegt in `src/lib/storage/supabase.ts` als `supabaseSchemaSql`:

- users
- games
- moves
- analyses
- mistakes
- training_sessions

## V1 Kann

- eine oder mehrere PGN-Dateien importieren
- öffentliche Chess.com-Partien per PubAPI importieren
- Chess.com-Duplikate anhand Partie-URL oder Metadaten/Zugliste vermeiden
- PGN-Metadaten anzeigen
- Partien lokal speichern
- Züge mit Stockfish-Worker oder Fallback analysieren
- Centipawn Loss, beste Züge, Bewertungen und Mate Scores speichern
- regelbasierte Fehler erkennen
- Dashboard mit Winrate, CPL, Fehlerphasen, Farben und Eröffnungen anzeigen
- Partie-Viewer mit Brett, Zugliste, Bewertungsgrafik und Fehlerdetails
- gegen einen begrenzten Coach spielen
- Trainingsaufgaben aus eigenen Fehlern erzeugen
- Coach-Export als ZIP mit `games.pgn`, `analysis.json`, `mistakes.csv`, `profile.json`, `summary.md`
- Netlify Build via `netlify.toml`

## Chess.com Auto-Import

Im Upload-Bereich kann ein Chess.com Username eingetragen werden. FranChess.co nutzt ausschließlich die offizielle öffentliche PubAPI:

```text
https://api.chess.com/pub/player/{username}/games/archives
https://api.chess.com/pub/player/{username}/games/{yyyy}/{mm}/pgn
```

Es werden keine Login-Daten, Passwörter oder Scraping-Techniken verwendet. Der Username wird lokal im Browserprofil gespeichert.

Filter in V1:

- alle, Rapid, Blitz oder Bullet
- letzter Monat, letztes Jahr oder alle Archive

Falls der Browser direkte PubAPI-Anfragen blockiert, nutzt FranChess.co den Netlify Function Proxy:

```text
/api/chesscom?url=...
```

Der Proxy erlaubt nur URLs unter `https://api.chess.com/pub/`. Lokal funktioniert der direkte Browserzugriff meist sofort. Für einen lokalen Test des Proxy-Pfads nutze Netlify Dev statt reinem Vite:

```bash
netlify dev
```

## Bekannte Grenzen

- Ohne echte Stockfish-WASM-Dateien ist die Bewertung nur eine Heuristik.
- PGN-Zeitdaten werden nur erkannt, wenn Clock-Kommentare im PGN vorhanden sind.
- Chess.com Filter für Rapid/Blitz/Bullet werden aus dem PGN-`TimeControl` abgeleitet.
- Sehr große Chess.com Accounts können viele Monatsarchive haben; bei Rate-Limits bitte später erneut importieren.
- Der Spielername wird in V1 aus PGN-Namen abgeleitet; ein festes Profilfeld ist vorbereitet, aber noch nicht als Account-Flow umgesetzt.
- Hanging-piece und King-safety sind regelbasierte Näherungen und ersetzen keine vollständige Engine-Taktikerkennung.
- Supabase ist vorbereitet, aber lokaler Speicher bleibt der robuste Standardpfad.
