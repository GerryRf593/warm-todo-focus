export type TaskColor = "yellow" | "green" | "blue" | "pink";
export type TimerPhase = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";

export interface TaskStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  details: string;
  steps: TaskStep[];
  color: TaskColor;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  endAt: number | null;
  remainingSeconds: number;
}

export interface FocusSession {
  id: string;
  completedAt: number;
  durationMinutes: number;
}

export interface AppSettings {
  focusMinutes: number;
  breakMinutes: number;
  notifications: boolean;
  launchAtStartup: boolean;
  closeToTray: boolean;
}

export interface AppState {
  tasks: Task[];
  timer: TimerState;
  sessions: FocusSession[];
  settings: AppSettings;
}

export interface DesktopApi {
  getState: () => Promise<AppState>;
  addTask: (title: string) => Promise<AppState>;
  updateTask: (task: Partial<Task> & { id: string }) => Promise<AppState>;
  deleteTask: (id: string) => Promise<AppState>;
  clearCompleted: () => Promise<AppState>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppState>;
  timerAction: (action: "start" | "pause" | "reset" | "switch") => Promise<AppState>;
  openDetail: (id: string) => Promise<void>;
  closeDetail: () => Promise<void>;
  onDetailCloseRequested: (callback: () => void) => () => void;
  onStateChanged: (callback: (state: AppState) => void) => () => void;
}

declare global {
  interface Window {
    desktopApi: DesktopApi;
  }
}
