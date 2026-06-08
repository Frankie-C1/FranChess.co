import { Upload } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-stone-300 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
        <Upload size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Noch keine Partien</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500 dark:text-stone-400">
        Lade eine oder mehrere PGN-Dateien hoch. FranChess.co speichert sie lokal und kann danach Zug für Zug analysieren.
      </p>
      <ActionButton className="mt-5" onClick={onUpload} icon={<Upload size={17} />}>
        Partie hochladen
      </ActionButton>
    </div>
  );
}
