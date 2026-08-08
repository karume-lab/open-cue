import { useCallback, useEffect, useRef, useState } from "react";
import type { GestureHudSide } from "@/features/player/components/GestureHud";

// Small delay before the brightness/volume HUD fades after the swipe ends.
const HIDE_DELAY_MS = 2500;

// Drives the GestureHud from GestureLayer's pan callbacks. The value updates on
// every pan frame while the pill lingers briefly after the finger lifts.
export const useGestureHud = () => {
  const [side, setSide] = useState<GestureHudSide>("brightness");
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const show = useCallback((nextSide: GestureHudSide) => {
    setSide(nextSide);
    setPercent(0);
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const update = useCallback((nextPercent: number) => {
    setPercent(nextPercent);
  }, []);

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
  }, []);

  const awake = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }, []);

  return { side, percent, visible, show, update, hide, awake };
};
