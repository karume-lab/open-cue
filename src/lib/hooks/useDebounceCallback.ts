import { useCallback, useRef } from "react";

export const useDebounceCallback = <T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
};
