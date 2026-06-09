import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "../types";

const apiMock = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  clearCompleted: vi.fn(),
  addTask: vi.fn(),
  timerAction: vi.fn(),
  openDetail: vi.fn(),
  closeDetail: vi.fn()
}));

vi.mock("../api", () => ({ api: apiMock }));

import { DetailPage } from "./DetailPage";
import { SettingsPage } from "./SettingsPage";
import { TodoPage } from "./TodoPage";

const state: AppState = {
  tasks: [
    {
      id: "task-1",
      title: "编写测试",
      details: "",
      steps: [{ id: "step-1", title: "选择这段文字", completed: false }],
      color: "yellow",
      completed: false,
      createdAt: 1,
      updatedAt: 1,
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

describe("interaction safeguards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("accepts a keyboard-entered focus duration", () => {
    render(<SettingsPage state={state} />);
    const input = screen.getByLabelText("专注时长（分钟）");

    fireEvent.change(input, { target: { value: "45" } });
    fireEvent.blur(input);

    expect(apiMock.updateSettings).toHaveBeenCalledWith({ focusMinutes: 45 });
  });

  it("disables completion while a task title is being edited", () => {
    const { container } = render(<TodoPage state={state} onOpenFocus={() => undefined} />);
    fireEvent.click(screen.getByText("编写测试"));
    act(() => vi.advanceTimersByTime(230));

    const completeButton = screen.getByLabelText("完成待办");
    const card = container.querySelector(".task-card")!;
    expect(completeButton).toBeDisabled();

    fireEvent.pointerDown(card, { clientX: 150 });
    fireEvent.pointerUp(card, { clientX: 20 });
    fireEvent.click(completeButton);

    expect(apiMock.updateTask).not.toHaveBeenCalled();
  });

  it("keeps step text selectable by making only the handle draggable", () => {
    const { container } = render(<DetailPage state={state} taskId="task-1" />);

    expect(container.querySelector(".step-row")).not.toHaveAttribute("draggable", "true");
    expect(container.querySelector(".drag-handle")).toHaveAttribute("draggable", "true");
    expect(screen.getByDisplayValue("选择这段文字")).toBeInstanceOf(HTMLInputElement);
  });

  it("controls the timer from the todo page without opening the focus page", () => {
    const openFocus = vi.fn();
    render(<TodoPage state={state} onOpenFocus={openFocus} />);

    fireEvent.click(screen.getByLabelText("开始计时"));
    fireEvent.click(screen.getByLabelText("重置计时"));

    expect(apiMock.timerAction).toHaveBeenNthCalledWith(1, "start");
    expect(apiMock.timerAction).toHaveBeenNthCalledWith(2, "reset");
    expect(openFocus).not.toHaveBeenCalled();
  });
});
