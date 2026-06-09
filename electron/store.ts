import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AppState, TaskColor, TimerPhase } from "../src/types";

const colors: TaskColor[] = ["yellow", "green", "blue", "pink"];

export function phaseSeconds(state: AppState, phase: TimerPhase) {
  return (phase === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
}

function initialState(): AppState {
  return {
    tasks: [],
    timer: {
      phase: "focus",
      status: "idle",
      endAt: null,
      remainingSeconds: 25 * 60
    },
    sessions: [],
    settings: {
      focusMinutes: 25,
      breakMinutes: 5,
      notifications: true,
      launchAtStartup: false,
      closeToTray: true
    }
  };
}

export class JsonStore {
  private filePath = path.join(app.getPath("userData"), "data.json");
  private state: AppState;

  constructor() {
    this.state = this.read();
  }

  get() {
    return structuredClone(this.state);
  }

  update(mutator: (state: AppState) => void) {
    mutator(this.state);
    this.write();
    return this.get();
  }

  nextColor(): TaskColor {
    return colors[this.state.tasks.length % colors.length];
  }

  private read(): AppState {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as AppState;
      const defaults = initialState();
      return {
        ...defaults,
        ...parsed,
        settings: { ...defaults.settings, ...parsed.settings },
        timer: { ...defaults.timer, ...parsed.timer },
        tasks: parsed.tasks ?? [],
        sessions: parsed.sessions ?? []
      };
    } catch {
      return initialState();
    }
  }

  private write() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }
}
