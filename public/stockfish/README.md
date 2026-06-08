# Stockfish-Dateien

Lege hier eine browserfähige Stockfish/WASM-Distribution ab:

- `public/stockfish/stockfish.js`
- optional daneben benötigte `.wasm`-, `.worker.js`- oder NNUE-Dateien derselben Distribution

FranChess.co versucht beim Start, `/stockfish/stockfish.js` als WebWorker zu laden. Wenn die Datei fehlt oder im Browser nicht läuft, nutzt die App automatisch eine lokale Material/Mobilitäts-Heuristik als Fallback. Der Fallback ist nur für Demo und UI-Tests gedacht; für echte Analyse sollte Stockfish eingebunden werden.
