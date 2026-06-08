import { Brain, Target } from "lucide-react";
import { ActionButton } from "../components/ActionButton";
import { EmptyState } from "../components/EmptyState";
import type { StoredGame, TrainingTask } from "../types";

export function TrainingPage({
  games,
  onSelectGame,
  onUpload
}: {
  games: StoredGame[];
  onSelectGame: (id: string) => void;
  onUpload: () => void;
}) {
  const tasks = buildTasks(games);
  const focus = tasks[0]?.category;

  if (games.length === 0) return <EmptyState onUpload={onUpload} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-md border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-[#eef6ea] text-[#5f8f45] dark:bg-[#1f3320]">
          <Brain size={24} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Training</h1>
        <p className="mt-3 text-stone-600 dark:text-stone-300">
          {focus
            ? `Heute: 10 Aufgaben zu ${focus}.`
            : "Analysiere zuerst Partien, dann erstellt FranChess.co Aufgaben aus deinen eigenen Fehlern."}
        </p>
        <p className="mt-3 rounded-md bg-stone-100 p-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          Lichess Puzzle Database Import ist vorbereitet als nächster Datenpfad; V1 nutzt bewusst eigene kritische Stellungen.
        </p>
      </section>

      <section className="rounded-md border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-semibold">Aufgaben aus deinen Partien</h2>
        <div className="mt-4 grid gap-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-md border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    <Target size={13} />
                    {task.category}
                  </div>
                  <p className="mt-3 text-sm text-stone-700 dark:text-stone-200">{task.prompt}</p>
                  <p className="mt-2 text-xs text-stone-500">Besserer Zug: {task.bestMove ?? "Engine-Zug nicht verfügbar"}</p>
                </div>
                <ActionButton variant="quiet" onClick={() => onSelectGame(task.gameId)}>
                  Ansehen
                </ActionButton>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-stone-500">Noch keine Trainingsaufgaben. Starte im Viewer eine Analyse.</p>}
        </div>
      </section>
    </div>
  );
}

function buildTasks(games: StoredGame[]): TrainingTask[] {
  return games
    .flatMap((game) =>
      game.analysis
        .filter((move) => move.categories.length > 0)
        .map((move) => ({
          id: move.id,
          gameId: game.id,
          fen: move.fenBefore,
          moveNumber: move.moveNumber,
          category: move.categories[0],
          prompt: promptFor(move.categories[0], move.moveNumber),
          bestMove: move.bestMove
        }))
    )
    .slice(0, 10);
}

function promptFor(category: string, moveNumber: number): string {
  if (category === "hanging_piece") return `Du verlierst oft Material durch ungedeckte Figuren. Finde in Zug ${moveNumber} eine stabilere Fortsetzung.`;
  if (category === "king_safety") return `Prüfe in Zug ${moveNumber}, wie du den König sicherer stellst.`;
  if (category === "opening_principle") return `Finde in Zug ${moveNumber} einen natürlichen Entwicklungszug.`;
  return `Kritische Stellung aus Zug ${moveNumber}: finde den besseren Kandidatenzug.`;
}
