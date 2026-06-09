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

Der Tabellenentwurf liegt in `src/lib/storage/supabase.ts` als `supabaseSchemaSql`.

## Aktuelle Funktionen

- PGN-Dateien importieren und lokal speichern
- öffentliche Chess.com-Partien per PubAPI oder Netlify Function Proxy importieren
- Chess.com-Duplikate anhand Partie-URL oder Metadaten/Zugliste vermeiden
- Stockfish-Worker oder Fallback-Heuristik für Analyse und Coach-Züge
- Dashboard mit Winrate, CPL, Fehlerphasen, Farben und Eröffnungen
- Partie-Viewer mit Brett, Zugliste, Bewertungsgrafik, Zugnavigation und Fehlerdetails
- anklickbare Zugliste, Vor-/Zurück-Buttons und synchronisierte Bewertungskurve
- temporäre Varianten im Viewer, ohne die Originalpartie zu verändern
- dezente Engine-Pfeile für bessere Züge und Variantenzüge
- Klick-zu-Klick-Ziehen zusätzlich zu Drag-and-drop
- optionale Markierung legaler Zielfelder
- Einstellungen-Tab mit persistentem Dark Mode, Brett- und Coach-Optionen
- Coach-Modus mit Weiß/Schwarz-Wahl vor Spielstart, Board-Drehung für Schwarz und kurzem Kommentar über dem Brett
- Coach-Stil-Simulationen: Stockfish, Magnus-Stil, Hikaru-Stil, Kasparov-Stil
- Button für bessere Zugvorschläge mit wählbarem Vorschlagsstil
- Trainingsaufgaben aus eigenen Fehlern erzeugen
- Coach-Export als ZIP mit `games.pgn`, `analysis.json`, `mistakes.csv`, `profile.json`, `summary.md`
- Netlify Build via `netlify.toml`

## Einstellungen

Die App speichert Einstellungen lokal unter `franchess.settings.v1`.

- `darkMode`: bleibt nach Reload, App-Neustart und Netlify-Reload erhalten
- `showLegalMoves`: zeigt nach Auswahl einer Figur dezente legale Zielpunkte
- `allowOpponentMoves`: vorbereitet für Analyse-/Variantenmodus; echtes Coach-Spiel bleibt gegen Cheating geschützt

Beim ersten Laden nutzt die App gespeicherte Einstellungen. Wenn keine Einstellung existiert, wird die Systempräferenz für Dark Mode berücksichtigt. Ein Inline-Skript in `index.html` setzt die Theme-Klasse vor dem React-Start, damit kein sichtbares Light/Dark-Flackern entsteht.

## Chess.com Auto-Import

Im Upload-Bereich kann ein Chess.com Username eingetragen werden. FranChess.co nutzt ausschließlich die offizielle öffentliche PubAPI:

```text
https://api.chess.com/pub/player/{username}/games/archives
https://api.chess.com/pub/player/{username}/games/{yyyy}/{mm}/pgn
```

Es werden keine Login-Daten, Passwörter oder Scraping-Techniken verwendet. Der Username wird lokal im Browserprofil gespeichert.

Falls der Browser direkte PubAPI-Anfragen blockiert, nutzt FranChess.co den Netlify Function Proxy:

```text
/api/chesscom?url=...
```

Der Proxy erlaubt nur URLs unter `https://api.chess.com/pub/`. Lokal funktioniert der direkte Browserzugriff meist sofort. Für einen lokalen Test des Proxy-Pfads nutze Netlify Dev statt reinem Vite:

```bash
netlify dev
```

## Analysekommentare

Die Fehlerdiagnose ist regelbasiert und nutzt vorhandene Engine-Werte, FEN-Stellungen und einfache Muster. Aktuell werden unter anderem hängende Figuren, ungedeckte Figuren, Königssicherheit, Entwicklung, frühe Damenzüge, wiederholte Figurenbewegungen, verpasste Taktiken, Mattchancen, Abtauschfehler, Bauernstruktur und Endspielfehler klassifiziert.

Für externe Open-Source-Kommentarsysteme wurde kein neues Paket eingebaut. Viele Projekte sind vollständige Analyseplattformen oder GUIs, keine kleine, sichere Drop-in-Library für die aktuelle React/Vite-App. FranChess.co bleibt daher bei einer eigenen, transparenten Regelbasis.

## Bekannte Grenzen

- Die Stil-Auswahl im Coach ist eine Stil-Simulation, keine echte Nachbildung von Magnus Carlsen, Hikaru Nakamura oder Garry Kasparov.
- MultiPV ist architektonisch vorbereitet, aber die aktuelle Auswahl nutzt weiterhin Engine-Bestmove plus lokale Kandidaten-Heuristik.
- Varianten im Viewer sind temporär und werden noch nicht dauerhaft als eigener Baum gespeichert.
- Der Button „Als Training speichern“ markiert die aktuelle Stellung im UI, schreibt aber noch keine neue persistente Trainingssammlung.
- Taktikkategorien wie Fork, Pin und Skewer sind Näherungen aus Engine-Hinweisen und Zuggeometrie.
- Ohne echte Stockfish-WASM-Dateien ist die Bewertung nur eine Heuristik.
- PGN-Zeitdaten werden nur erkannt, wenn Clock-Kommentare im PGN vorhanden sind.
- Sehr große Chess.com Accounts können viele Monatsarchive haben; bei Rate-Limits bitte später erneut importieren.
- Supabase ist vorbereitet, aber lokaler Speicher bleibt der robuste Standardpfad.
