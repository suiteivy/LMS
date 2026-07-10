import { useEffect, useRef, useState } from "react";

interface DelayedLoadingOptions {
  showAfter?: number;
  minVisible?: number;
}

/**
 * Prevent skeleton flash on very fast loads while avoiding flicker once shown.
 */
export function useDelayedLoading(
  isLoading: boolean,
  { showAfter = 200, minVisible = 300 }: DelayedLoadingOptions = {}
) {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isLoading) {
      showTimerRef.current = setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, showAfter);
      return;
    }

    if (!visible) return;

    const shownAt = shownAtRef.current || Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minVisible - elapsed);

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      shownAtRef.current = null;
    }, remaining);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isLoading, minVisible, showAfter, visible]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return visible;
}

export default useDelayedLoading;
