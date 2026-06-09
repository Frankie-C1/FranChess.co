# FranChess.co

FranChess.co ist eine kostenlose Open-Source-Schachtrainer-Webapp für PGN-Import, Chess.com-Import, lokale Analyse, Fehlerprofile, Training und Coach-Export.

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

FranChess.co benötigt echte Stockfish-WASM-Dateien. Beim Build kopiert `npm run prepare:stockfish` die Browser-Variante aus dem npm-Paket `stockfish@18.0.7` in den Public-Ordner:

```text
public/stockfish/stockfish.js
public/stockfish/stockfish.wasm
```

Diese Variante ist WASM, single-threaded und braucht keine Cross-Origin-Isolation-Header. FranChess.co lädt `public/stockfish/stockfish.js` als WebWorker; der Worker lädt `stockfish.wasm` aus demselben Ordner.

Wichtig: Es gibt keinen Fake-Fallback mehr. Wenn Stockfish nicht geladen werden kann, zeigt die App:

```text
Stockfish konnte nicht geladen werden. Bitte Engine-Dateien prüfen.
```

Analyse, Coach-Züge und Zugvorschläge werden dann nicht durch Material- oder Mobilitätsheuristiken ersetzt.

## Supabase Optional

Ohne ENV-Variablen nutzt FranChess.co `localStorage`. Optional:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Der Tabellenentwurf liegt in `src/lib/storage/supabase.ts` als `supabaseSchemaSql`.

## Aktuelle Funktionen

- PGN-Dateien importieren und lokal speichern
- öffentliche Chess.com-Partien per PubAPI oder Netlify Function Proxy importieren
- Chess.com-Duplikate anhand Partie-URL oder Metadaten/Zugliste vermeiden
- echte Stockfish-WASM-Analyse ohne Fake-Heuristik
- gespeicherte Engine-Elo: 800 bis 2200 oder Maximal
- UCI_LimitStrength/UCI_Elo, wenn die verwendete Stockfish-Version diese Optionen meldet
- MultiPV/Top-5-Zugvorschläge, wenn Stockfish MultiPV meldet
- Dashboard mit Winrate, CPL, Fehlerphasen, Farben und Eröffnungen
- Viewer mit Brett, Zugliste, Bewertungsgrafik, Bewertungsbalken, Materialanzeige und Fehlerdetails
- anklickbare Zugliste, Vor-/Zurück-Buttons und synchronisierte Bewertungskurve
- temporäre Varianten im Viewer, ohne die Originalpartie zu verändern
- dezente Engine-Pfeile für Top-Züge
- Klick-zu-Klick-Ziehen zusätzlich zu Drag-and-drop
- optionale Markierung legaler Zielfelder
- Favoriten per Stern in der Partienliste und in den Einstellungen
- Einstellungen-Tab mit persistentem Dark Mode, Engine-Elo, Brett- und Coach-Optionen
- Coach-Modus mit Weiß/Schwarz-Wahl vor Spielstart, Board-Drehung für Schwarz, Verlauf und Navigationsbuttons
- Coach-Einstellungen auf Desktop einklappbar, damit das Brett größer wird
- Move-Judgement-Labels: `!!`, `!`, `□`, `!?`, `?!`, `?`, `??`
- Button „Zug vorschlagen“ im Viewer und Coach mit Top-5-Liste und Pfeilen
- Trainingsaufgaben aus eigenen Fehlern erzeugen
- Coach-Export als ZIP mit `games.pgn`, `analysis.json`, `mistakes.csv`, `profile.json`, `summary.md`
- Netlify Build via `netlify.toml`

## Einstellungen und Storage

Die App speichert Einstellungen lokal unter `franchess.settings.v1`.

- `darkMode`: bleibt nach Reload, App-Neustart und Netlify-Reload erhalten
- `showLegalMoves`: zeigt nach Auswahl einer Figur dezente legale Zielpunkte
- `allowOpponentMoves`: vorbereitet für Analyse- und Variantenmodus; echtes Coach-Spiel bleibt geschützt
- `engineElo`: Coach-Stärke und Vorschlagsstärke
- `coachSettingsCollapsed`: Desktop-Layoutzustand im Coach

Favoriten werden direkt im gespeicherten Game-Datensatz als `favorite: true` abgelegt. Alte gespeicherte Partien ohne dieses Feld bleiben lesbar und werden beim Laden als nicht favorisiert behandelt.

## Chess.com Auto-Import

Im Upload-Bereich kann ein Chess.com Username eingetragen werden. FranChess.co nutzt ausschließlich die offizielle öffentliche PubAPI:

```text
https://api.chess.com/pub/player/{username}/games/archives
https://api.chess.com/pub/player/{username}/games/{yyyy}/{mm}/pgn
```

Falls der Browser direkte PubAPI-Anfragen blockiert, nutzt FranChess.co den Netlify Function Proxy:

```text
/api/chesscom?url=...
```

Der Proxy erlaubt nur URLs unter `https://api.chess.com/pub/`. Für einen lokalen Test des Proxy-Pfads nutze Netlify Dev statt reinem Vite:

```bash
netlify dev
```

## Analysekommentare

Die Fehlerdiagnose ist regelbasiert und nutzt vorhandene Engine-Werte, FEN-Stellungen und einfache Muster. Aktuell werden unter anderem hängende Figuren, ungedeckte Figuren, Königssicherheit, Entwicklung, frühe Damenzüge, wiederholte Figurenbewegungen, verpasste Taktiken, Mattchancen, Abtauschfehler, Bauernstruktur und Endspielfehler klassifiziert.

Move-Judgement-Labels werden aus Centipawn Loss, bestem Enginezug, vorhandenen Kategorien und optionalen Top-Kandidaten abgeleitet.

## Bekannte Grenzen

- MultiPV hängt davon ab, ob die konkrete Stockfish-WASM-Version `MultiPV` als UCI-Option meldet. Wenn nicht, zeigt die UI nur den besten Zug.
- UCI_Elo hängt davon ab, ob die konkrete Stockfish-WASM-Version `UCI_Elo` und `UCI_LimitStrength` meldet. Wenn nicht, wird kein Zufallszug erzeugt; die App zeigt den Status und nutzt normale Engine-Suchtiefe.
- Varianten im Viewer sind temporär und werden noch nicht dauerhaft als eigener Baum gespeichert.
- Der Button „Als Training speichern“ markiert die aktuelle Stellung im UI, schreibt aber noch keine neue persistente Trainingssammlung.
- Taktikkategorien wie Fork, Pin und Skewer sind Näherungen aus Engine-Hinweisen und Zuggeometrie.
- PGN-Zeitdaten werden nur erkannt, wenn Clock-Kommentare im PGN vorhanden sind.
- Sehr große Chess.com Accounts können viele Monatsarchive haben; bei Rate-Limits bitte später erneut importieren.
- Supabase ist vorbereitet, aber lokaler Speicher bleibt der robuste Standardpfad.
