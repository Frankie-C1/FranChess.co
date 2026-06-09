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

- `Automatisch`: Handy nutzt Bottom-Bar, Desktop nutzt Top-Navigation.
- `Web/Layout oben`: Top-Navigation auf allen Geraeten.
- `Mobile Layout unten`: Bottom-Bar auch auf Desktop/Laptop erzwingen.

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
- Supabase ist vorbereitet, aber lokaler Speicher bleibt der robuste Standardpfad.
