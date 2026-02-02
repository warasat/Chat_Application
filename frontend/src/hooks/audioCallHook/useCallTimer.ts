import { useState, useRef, useCallback } from "react";

export const useCallTimer = () => {
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<any>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((p) => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setDuration(0);
  }, []);

  return { duration, startTimer, stopTimer };
};
