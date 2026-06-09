import { Pause, Play, RotateCcw, SwitchCamera } from "lucide-react";
import { api } from "../api";
import { formatTime, useRemainingSeconds } from "../hooks";
import type { AppState } from "../types";

export function FocusPage({ state }: { state: AppState }) {
  const remaining = useRemainingSeconds(state);
  const total =
    (state.timer.phase === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
  const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const today = new Date().toDateString();
  const sessions = state.sessions.filter((session) => new Date(session.completedAt).toDateString() === today);
  const minutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);

  return (
    <section className="page focus-page">
      <header className="page-heading simple-heading">
        <div>
          <h1>{state.timer.phase === "focus" ? "专注" : "休息"}</h1>
          <p>{state.timer.status === "running" ? "保持节奏，慢慢完成" : "准备好时再开始"}</p>
        </div>
      </header>

      <div className="focus-panel">
        <span className="phase-pill">{state.timer.phase === "focus" ? "专注时间" : "休息时间"}</span>
        <strong className="focus-time">{formatTime(remaining)}</strong>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="focus-actions">
          <button
            className="primary-button"
            onClick={() => api.timerAction(state.timer.status === "running" ? "pause" : "start")}
          >
            {state.timer.status === "running" ? <Pause size={17} /> : <Play size={17} />}
            {state.timer.status === "running" ? "暂停" : state.timer.status === "paused" ? "继续" : "开始"}
          </button>
          <button className="secondary-button" onClick={() => api.timerAction("reset")}>
            <RotateCcw size={16} />
            重置
          </button>
          <button className="icon-button switch-button" aria-label="切换阶段" onClick={() => api.timerAction("switch")}>
            <SwitchCamera size={17} />
          </button>
        </div>
      </div>

      <div className="duration-grid">
        <div className="duration-card color-yellow">
          <span>专注</span>
          <strong>{state.settings.focusMinutes}</strong>
          <small>分钟</small>
        </div>
        <div className="duration-card color-green">
          <span>休息</span>
          <strong>{state.settings.breakMinutes}</strong>
          <small>分钟</small>
        </div>
      </div>

      <div className="today-summary">
        <div>
          <span>今日专注</span>
          <strong>{sessions.length} 次 · {minutes} 分钟</strong>
        </div>
        <div className="summary-bars">
          {[0, 1, 2, 3, 4].map((item) => <i className={item < sessions.length ? "filled" : ""} key={item} />)}
        </div>
      </div>
    </section>
  );
}
