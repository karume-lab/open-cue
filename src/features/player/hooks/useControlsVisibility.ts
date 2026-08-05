import { useCallback, useEffect, useRef, useState } from "react";

// Show/hide the control chrome with a 3s auto-hide timeout. All interactions
// (taps, seeks, sheet opens) refresh the timer through interactControls.
export const useControlsVisibility = () => {
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const interactControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (!prev) {
        controlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    interactControls();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [interactControls]);

  return { showControls, setShowControls, interactControls, toggleControls };
};
