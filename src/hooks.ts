import { useEffect, useState } from "react";
import { api } from "./api";
import type { AppState } from "./types";

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    api.getState().then(setState);
    return api.onStateChanged(setState);
  }, []);

  return state;
}

export function useRemainingSeconds(state: AppState | null) {
  const [, rerender] = useState(0);

  useEffect(() => {
    if (state?.timer.status !== "running") return;
    const interval = window.setInterval(() => rerender((value) => value + 1), 250);
    return () => window.clearInterval(interval);
  }, [state?.timer.status, state?.timer.endAt]);

  if (!state) return 0;
  if (state.timer.status === "running" && state.timer.endAt) {
    return Math.max(0, Math.ceil((state.timer.endAt - Date.now()) / 1000));
  }
  return state.timer.remainingSeconds;
}

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
