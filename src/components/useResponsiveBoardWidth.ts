import { useCallback, useEffect, useState } from "react";

export function useResponsiveBoardWidth(maxWidth = 392) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(maxWidth);
  const ref = useCallback((node: HTMLElement | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setWidth(Math.max(240, Math.min(maxWidth, Math.floor(rect.width))));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("orientationchange", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", update);
    };
  }, [element, maxWidth]);

  return { ref, width };
}
