import { useState, useCallback, useRef } from "react";
import { pickRandomItem } from "./pick-random-item";

type SpinState = "idle" | "spinning" | "result";

interface UseSpinnerOptions {
  duration?: number;
  randomFn?: () => number;
  minSpins?: number;
}

export function useSpinner<T>(items: T[], options: UseSpinnerOptions = {}) {
  const { duration = 4000, randomFn = Math.random, minSpins = 5 } = options;
  const [state, setState] = useState<SpinState>("idle");
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [targetRotation, setTargetRotation] = useState(0);
  const cumulativeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spin = useCallback(() => {
    if (state === "spinning" || items.length === 0) return;

    const picked = pickRandomItem(items, randomFn);
    const selectedIndex = items.indexOf(picked);

    // Calculate target angle so pointer (top, 0°) lands on selected segment center
    const segmentAngle = 360 / items.length;
    const targetSegmentCenter = selectedIndex * segmentAngle + segmentAngle / 2;
    const baseAngle = 360 - targetSegmentCenter;
    const extraSpins = minSpins + Math.floor(randomFn() * 3);
    const totalRotation = cumulativeRef.current + baseAngle + 360 * extraSpins;

    setSelectedItem(picked);
    setTargetRotation(totalRotation);
    cumulativeRef.current = totalRotation;
    setState("spinning");

    // Fallback timer in case transitionEnd doesn't fire
    timerRef.current = setTimeout(() => {
      setState((s) => (s === "spinning" ? "result" : s));
    }, duration);
  }, [state, items, duration, randomFn, minSpins]);

  const onSpinEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("result");
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("idle");
    setSelectedItem(null);
  }, []);

  return { state, selectedItem, targetRotation, spin, reset, onSpinEnd };
}
