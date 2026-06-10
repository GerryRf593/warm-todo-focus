import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  Tray
} from "electron";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { AppSettings, AppState, Task } from "../src/types";
import { JsonStore, phaseSeconds } from "./store";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let detailWindow: BrowserWindow | null = null;
let closingDetailWindow = false;
let tray: Tray | null = null;
let store: JsonStore;
let quitting = false;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

function rendererUrl(query = "") {
  if (isDev) return `http://127.0.0.1:5173/${query}`;
  return `${pathToFileURL(path.join(__dirname, "../../dist/index.html")).href}${query}`;
}

function broadcast(state = store.get()) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("state:changed", state);
  }
  refreshTray();
}

function iconPath(fileName: string) {
  return isDev
    ? path.join(app.getAppPath(), "assets", "icons", fileName)
    : path.join(process.resourcesPath, "icons", fileName);
}

function showMain() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function quitApp() {
  if (quitting) return;
  quitting = true;
  tray?.destroy();
  tray = null;
  app.quit();
}

function refreshTray() {
  if (!tray) return;
  const timer = store.get().timer;
  const timerLabel = timer.status === "running" ? "暂停计时" : timer.status === "paused" ? "继续计时" : "开始计时";
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示暖暖待办", click: showMain },
      { type: "separator" },
      {
        label: timerLabel,
        click: () => timerAction(timer.status === "running" ? "pause" : "start")
      },
      { label: "重置计时", click: () => timerAction("reset") },
      { type: "separator" },
      {
        label: "退出",
        click: quitApp
      }
    ])
  );
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 430,
    height: 680,
    minWidth: 360,
    minHeight: 520,
    backgroundColor: "#faf8f2",
    autoHideMenuBar: true,
    icon: iconPath("todo-desktop.ico"),
    title: "暖暖待办",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadURL(rendererUrl());
  mainWindow.on("close", (event) => {
    if (quitting) return;
    if (store.get().settings.closeToTray) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }
    quitApp();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createDetailWindow(taskId: string) {
  if (detailWindow) {
    detailWindow.loadURL(rendererUrl(`?detail=${encodeURIComponent(taskId)}`));
    detailWindow.show();
    detailWindow.focus();
    return;
  }
  detailWindow = new BrowserWindow({
    width: 470,
    height: 690,
    minWidth: 420,
    minHeight: 560,
    parent: mainWindow ?? undefined,
    modal: false,
    backgroundColor: "#faf8f2",
    autoHideMenuBar: true,
    icon: iconPath("todo-desktop.ico"),
    title: "待办详情",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  detailWindow.loadURL(rendererUrl(`?detail=${encodeURIComponent(taskId)}`));
  detailWindow.on("close", (event) => {
    if (closingDetailWindow || quitting) return;
    event.preventDefault();
    detailWindow?.webContents.send("detail:close-requested");
  });
  detailWindow.on("closed", () => {
    detailWindow = null;
    closingDetailWindow = false;
  });
}

function timerAction(action: "start" | "pause" | "reset" | "switch") {
  const state = store.update((draft) => {
    const now = Date.now();
    if (action === "start") {
      if (draft.timer.status === "running") return;
      if (draft.timer.remainingSeconds <= 0) {
        draft.timer.remainingSeconds = phaseSeconds(draft, draft.timer.phase);
      }
      draft.timer.status = "running";
      draft.timer.endAt = now + draft.timer.remainingSeconds * 1000;
    }
    if (action === "pause" && draft.timer.status === "running") {
      draft.timer.remainingSeconds = Math.max(0, Math.ceil(((draft.timer.endAt ?? now) - now) / 1000));
      draft.timer.status = "paused";
      draft.timer.endAt = null;
    }
    if (action === "reset") {
      draft.timer.status = "idle";
      draft.timer.endAt = null;
      draft.timer.remainingSeconds = phaseSeconds(draft, draft.timer.phase);
    }
    if (action === "switch") {
      draft.timer.phase = draft.timer.phase === "focus" ? "break" : "focus";
      draft.timer.status = "idle";
      draft.timer.endAt = null;
      draft.timer.remainingSeconds = phaseSeconds(draft, draft.timer.phase);
    }
  });
  broadcast(state);
  return state;
}

function finishTimer() {
  const previous = store.get().timer.phase;
  const state = store.update((draft) => {
    if (previous === "focus") {
      draft.sessions.push({
        id: randomUUID(),
        completedAt: Date.now(),
        durationMinutes: draft.settings.focusMinutes
      });
    }
    draft.timer.phase = previous === "focus" ? "break" : "focus";
    draft.timer.status = "idle";
    draft.timer.endAt = null;
    draft.timer.remainingSeconds = phaseSeconds(draft, draft.timer.phase);
  });
  if (state.settings.notifications && Notification.isSupported()) {
    new Notification({
      title: previous === "focus" ? "专注完成" : "休息结束",
      body: previous === "focus" ? "辛苦了，休息一下吧。" : "准备好后，开始下一轮专注。"
    }).show();
  }
  broadcast(state);
}

function registerIpc() {
  ipcMain.handle("state:get", () => store.get());
  ipcMain.handle("task:add", (_event, title: string) => {
    const state = store.update((draft) => {
      const now = Date.now();
      draft.tasks.unshift({
        id: randomUUID(),
        title: title.trim() || "新待办",
        details: "",
        steps: [],
        color: store.nextColor(),
        completed: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null
      });
    });
    broadcast(state);
    return state;
  });
  ipcMain.handle("task:update", (_event, patch: Partial<Task> & { id: string }) => {
    const state = store.update((draft) => {
      const task = draft.tasks.find((item) => item.id === patch.id);
      if (!task) return;
      const wasCompleted = task.completed;
      Object.assign(task, patch, { id: task.id, updatedAt: Date.now() });
      if (patch.completed !== undefined && patch.completed !== wasCompleted) {
        task.completedAt = patch.completed ? Date.now() : null;
      }
    });
    broadcast(state);
    return state;
  });
  ipcMain.handle("task:delete", (_event, id: string) => {
    const state = store.update((draft) => {
      draft.tasks = draft.tasks.filter((task) => task.id !== id);
    });
    broadcast(state);
    return state;
  });
  ipcMain.handle("task:clear-completed", () => {
    const state = store.update((draft) => {
      draft.tasks = draft.tasks.filter((task) => !task.completed);
    });
    broadcast(state);
    return state;
  });
  ipcMain.handle("settings:update", (_event, patch: Partial<AppSettings>) => {
    const state = store.update((draft) => {
      const oldFocus = draft.settings.focusMinutes;
      const oldBreak = draft.settings.breakMinutes;
      Object.assign(draft.settings, patch);
      if (draft.timer.status === "idle") {
        if (draft.timer.phase === "focus" && patch.focusMinutes && patch.focusMinutes !== oldFocus) {
          draft.timer.remainingSeconds = patch.focusMinutes * 60;
        }
        if (draft.timer.phase === "break" && patch.breakMinutes && patch.breakMinutes !== oldBreak) {
          draft.timer.remainingSeconds = patch.breakMinutes * 60;
        }
      }
    });
    if (patch.launchAtStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: patch.launchAtStartup });
    }
    broadcast(state);
    return state;
  });
  ipcMain.handle("timer:action", (_event, action) => timerAction(action));
  ipcMain.handle("detail:open", (_event, id: string) => createDetailWindow(id));
  ipcMain.handle("detail:close", () => {
    closingDetailWindow = true;
    detailWindow?.close();
  });
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", showMain);

  app.whenReady().then(() => {
    store = new JsonStore();
    registerIpc();
    createMainWindow();
    tray = new Tray(iconPath("todo-tray.ico"));
    tray.setToolTip("暖暖待办");
    tray.on("double-click", showMain);
    refreshTray();
    setInterval(() => {
      const timer = store.get().timer;
      if (timer.status === "running" && timer.endAt !== null && timer.endAt <= Date.now()) finishTimer();
    }, 500);
  });

  app.on("before-quit", () => {
    quitting = true;
    tray?.destroy();
    tray = null;
  });
}
