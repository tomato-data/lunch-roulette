import { useState, useCallback, useRef } from "react";
import { pickRandomItem } from "./pick-random-item";

type SpinState = "idle" | "spinning" | "result";

interface UseSpinnerOptions {
  duration?: number;
  randomFn?: () => number;
}

export function useSpinner<T>(items: T[], options: UseSpinnerOptions = {}) {
  const { duration = 3000, randomFn = Math.random } = options;
  const [state, setState] = useState<SpinState>("idle");
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spin = useCallback(() => {
    if (state === "spinning" || items.length === 0) return;

    const picked = pickRandomItem(items, randomFn);
    setSelectedItem(picked);
    setState("spinning");

    timerRef.current = setTimeout(() => {
      setState("result");
    }, duration);
  }, [state, items, duration, randomFn]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("idle");
    setSelectedItem(null);
  }, []);

  return { state, selectedItem, spin, reset };
}
