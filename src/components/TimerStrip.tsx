import { Clock3, Pause, Play, RotateCcw } from "lucide-react";
import { api } from "../api";
import { formatTime, useRemainingSeconds } from "../hooks";
import type { AppState } from "../types";

export function TimerStrip({ state, onOpenFocus }: { state: AppState; onOpenFocus?: () => void }) {
  const remaining = useRemainingSeconds(state);
  const overviewProps = onOpenFocus
    ? { "aria-label": "打开专注界面", onClick: onOpenFocus }
    : { "aria-label": "当前计时状态" };
  const valueProps = onOpenFocus
    ? { "aria-label": "打开专注界面", onClick: onOpenFocus }
    : { "aria-label": "当前倒计时" };

  return (
    <div className="timer-strip">
      <button className="timer-overview" {...overviewProps}>
        <Clock3 size={15} />
        <span>{state.timer.phase === "focus" ? "专注" : "休息"}</span>
      </button>
      <div className="timer-quick-actions">
        <button
          aria-label={state.timer.status === "running" ? "暂停计时" : state.timer.status === "paused" ? "继续计时" : "开始计时"}
          title={state.timer.status === "running" ? "暂停" : state.timer.status === "paused" ? "继续" : "开始"}
          onClick={() => api.timerAction(state.timer.status === "running" ? "pause" : "start")}
        >
          {state.timer.status === "running" ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button aria-label="重置计时" title="重置" onClick={() => api.timerAction("reset")}>
          <RotateCcw size={13} />
        </button>
      </div>
      <button className="timer-value" {...valueProps}>
        <strong>{formatTime(remaining)}</strong>
        <i className={state.timer.status === "running" ? "pulse" : ""} />
      </button>
    </div>
  );
}
