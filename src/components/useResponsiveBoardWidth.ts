import { useCallback, useEffect, useState } from "react";

export function useResponsiveBoardWidth(maxWidth = 392) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(maxWidth);
  const ref = useCallback((node: HTMLElement | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const contentWidth = rect.width - horizontalPadding;
      const viewportWidth = window.innerWidth - 24;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const heightReserve = window.innerWidth >= 1180 ? 126 : window.innerWidth >= 768 ? 170 : 118;
      const viewportHeightLimit = viewportHeight - heightReserve;
      setWidth(Math.max(240, Math.min(maxWidth, Math.floor(contentWidth), viewportWidth, viewportHeightLimit)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [element, maxWidth]);

  return { ref, width };
}
