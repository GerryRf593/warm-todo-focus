import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, AppState, DesktopApi, Task } from "../src/types";

const api: DesktopApi = {
  getState: () => ipcRenderer.invoke("state:get"),
  addTask: (title: string) => ipcRenderer.invoke("task:add", title),
  updateTask: (task: Partial<Task> & { id: string }) => ipcRenderer.invoke("task:update", task),
  deleteTask: (id: string) => ipcRenderer.invoke("task:delete", id),
  clearCompleted: () => ipcRenderer.invoke("task:clear-completed"),
  updateSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke("settings:update", settings),
  timerAction: (action) => ipcRenderer.invoke("timer:action", action),
  openDetail: (id: string) => ipcRenderer.invoke("detail:open", id),
  closeDetail: () => ipcRenderer.invoke("detail:close"),
  onStateChanged: (callback: (state: AppState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: AppState) => callback(state);
    ipcRenderer.on("state:changed", listener);
    return () => ipcRenderer.removeListener("state:changed", listener);
  }
};

contextBridge.exposeInMainWorld("desktopApi", api);
