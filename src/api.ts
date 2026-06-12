import type { AppState, DesktopApi, Task, TaskColor } from "./types";

const colors: TaskColor[] = ["yellow", "green", "blue", "pink"];
const listeners = new Set<(state: AppState) => void>();

const initial: AppState = {
  tasks: [
    {
      id: "welcome-1",
      title: "整理今天的工作计划",
      details: "",
      steps: [],
      color: "yellow",
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null
    },
    {
      id: "welcome-2",
      title: "完成产品原型设计",
      details: "整理待办、专注和设置页面的交互与布局。",
      steps: [
        { id: "s1", title: "确定整体风格", completed: true },
        { id: "s2", title: "完成三个页面原型", completed: false }
      ],
      color: "green",
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null
    }
  ],
  timer: { phase: "focus", status: "idle", endAt: null, remainingSeconds: 1500 },
  sessions: [],
  settings: {
    focusMinutes: 25,
    breakMinutes: 5,
    notifications: true,
    launchAtStartup: false,
    closeToTray: true
  }
};

let browserState = initial;
const emit = () => listeners.forEach((listener) => listener(structuredClone(browserState)));
const mutate = (fn: (state: AppState) => void) => {
  fn(browserState);
  emit();
  return Promise.resolve(structuredClone(browserState));
};

const browserApi: DesktopApi = {
  getState: () => Promise.resolve(structuredClone(browserState)),
  addTask: (title) =>
    mutate((state) => {
      const now = Date.now();
      state.tasks.unshift({
        id: crypto.randomUUID(),
        title,
        details: "",
        steps: [],
        color: colors[state.tasks.length % colors.length],
        completed: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null
      });
    }),
  updateTask: (patch) =>
    mutate((state) => {
      const task = state.tasks.find((item) => item.id === patch.id);
      if (task) Object.assign(task, patch);
    }),
  reorderTasks: (ids) =>
    mutate((state) => {
      const activeById = new Map(state.tasks.filter((task) => !task.completed).map((task) => [task.id, task]));
      const ordered = ids.flatMap((id) => {
        const task = activeById.get(id);
        if (!task) return [];
        activeById.delete(id);
        return [task];
      });
      state.tasks = [...ordered, ...activeById.values(), ...state.tasks.filter((task) => task.completed)];
    }),
  deleteTask: (id) => mutate((state) => void (state.tasks = state.tasks.filter((task) => task.id !== id))),
  clearCompleted: () => mutate((state) => void (state.tasks = state.tasks.filter((task) => !task.completed))),
  updateSettings: (patch) => mutate((state) => void Object.assign(state.settings, patch)),
  timerAction: (action) =>
    mutate((state) => {
      if (action === "start") {
        state.timer.status = "running";
        state.timer.endAt = Date.now() + state.timer.remainingSeconds * 1000;
      }
      if (action === "pause") {
        state.timer.remainingSeconds = Math.max(
          0,
          Math.ceil(((state.timer.endAt ?? Date.now()) - Date.now()) / 1000)
        );
        state.timer.status = "paused";
        state.timer.endAt = null;
      }
      if (action === "reset") {
        state.timer.status = "idle";
        state.timer.endAt = null;
        state.timer.remainingSeconds =
          (state.timer.phase === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
      }
      if (action === "switch") {
        state.timer.phase = state.timer.phase === "focus" ? "break" : "focus";
        state.timer.status = "idle";
        state.timer.remainingSeconds =
          (state.timer.phase === "focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;
      }
    }),
  openDetail: (id) => {
    window.location.search = `?detail=${id}`;
    return Promise.resolve();
  },
  closeDetail: () => {
    window.location.search = "";
    return Promise.resolve();
  },
  onDetailCloseRequested: () => () => undefined,
  onStateChanged: (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
};

export const api = window.desktopApi ?? browserApi;
