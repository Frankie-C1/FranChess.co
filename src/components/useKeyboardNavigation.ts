import { useEffect } from "react";

export function useKeyboardNavigation({
  enabled,
  current,
  max,
  onChange
}: {
  enabled: boolean;
  current: number;
  max: number;
  onChange: (next: number) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      let next: number | null = null;
      if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
      if (event.key === "ArrowRight") next = Math.min(max, current + 1);
      if (event.key === "Home" || event.key === "ArrowUp") next = 0;
      if (event.key === "End" || event.key === "ArrowDown") next = max;

      if (next === null) return;
      event.preventDefault();
      onChange(next);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, enabled, max, onChange]);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}
