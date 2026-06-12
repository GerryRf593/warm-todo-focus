import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "../types";

const apiMock = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  updateTask: vi.fn(),
  reorderTasks: vi.fn(),
  deleteTask: vi.fn(),
  clearCompleted: vi.fn(),
  addTask: vi.fn(),
  timerAction: vi.fn(),
  openDetail: vi.fn(),
  closeDetail: vi.fn(),
  onDetailCloseRequested: vi.fn<(callback: () => void) => () => void>(() => () => undefined)
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

  it("reorders active tasks while dragging and saves the new order", () => {
    const twoTaskState: AppState = {
      ...state,
      tasks: [
        state.tasks[0],
        { ...state.tasks[0], id: "task-2", title: "第二条待办" }
      ]
    };
    const { container } = render(<TodoPage state={twoTaskState} onOpenFocus={() => undefined} />);
    const handles = container.querySelectorAll(".task-drag-handle");
    const dataTransfer = { effectAllowed: "", setData: vi.fn() };

    fireEvent.dragStart(handles[0], { dataTransfer });
    expect(container.querySelector(".task-card.dragging")).toBeInTheDocument();
    fireEvent.dragOver(container.querySelectorAll(".task-card")[1], { dataTransfer });

    expect(container.querySelectorAll(".task-title")[0]).toHaveTextContent("第二条待办");
    fireEvent.dragEnd(container.querySelector(".task-card.dragging .task-drag-handle")!, { dataTransfer });
    expect(apiMock.reorderTasks).toHaveBeenCalledWith(["task-2", "task-1"]);
  });

  it("reorders steps as soon as the dragged handle enters another row", () => {
    const twoStepState: AppState = {
      ...state,
      tasks: [{
        ...state.tasks[0],
        steps: [
          state.tasks[0].steps[0],
          { id: "step-2", title: "第二个步骤", completed: false }
        ]
      }]
    };
    const { container } = render(<DetailPage state={twoStepState} taskId="task-1" />);
    const handles = container.querySelectorAll(".drag-handle");
    const rows = container.querySelectorAll(".step-row");
    const dataTransfer = { effectAllowed: "", setData: vi.fn() };

    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragEnter(rows[1]);

    expect(container.querySelectorAll(".step-row input")[0]).toHaveValue("第二个步骤");
    expect(container.querySelector(".step-row.dragging")).toBeInTheDocument();
    expect(container.querySelector(".step-row.drag-over")).toBeInTheDocument();
  });

  it("creates and focuses the next step when Enter is pressed", () => {
    render(<DetailPage state={state} taskId="task-1" />);
    const currentStep = screen.getByDisplayValue("选择这段文字");

    fireEvent.keyDown(currentStep, { key: "Enter" });

    const newStep = document.activeElement as HTMLInputElement;
    expect(screen.getAllByPlaceholderText("输入步骤")).toHaveLength(2);
    expect(newStep).toHaveValue("");
    expect(newStep).toHaveFocus();
  });

  it("controls the timer from the detail page", () => {
    render(<DetailPage state={state} taskId="task-1" />);

    expect(screen.getByLabelText("当前计时状态")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("开始计时"));
    fireEvent.click(screen.getByLabelText("重置计时"));

    expect(apiMock.timerAction).toHaveBeenNthCalledWith(1, "start");
    expect(apiMock.timerAction).toHaveBeenNthCalledWith(2, "reset");
  });

  it("saves on back and save, while cancel discards the draft", async () => {
    render(<DetailPage state={state} taskId="task-1" />);
    fireEvent.change(screen.getByDisplayValue("编写测试"), { target: { value: "修改后的标题" } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("返回并保存"));
      await Promise.resolve();
    });

    expect(apiMock.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: "task-1", title: "修改后的标题" }));
    expect(apiMock.closeDetail).toHaveBeenCalled();

    vi.clearAllMocks();
    cleanup();
    render(<DetailPage state={state} taskId="task-1" />);
    fireEvent.change(screen.getByDisplayValue("编写测试"), { target: { value: "不保存的标题" } });
    fireEvent.click(screen.getByText("取消"));

    expect(apiMock.updateTask).not.toHaveBeenCalled();
    expect(apiMock.closeDetail).toHaveBeenCalled();
  });

  it("saves before a system detail-window close request", async () => {
    let requestClose: (() => void) | undefined;
    apiMock.onDetailCloseRequested.mockImplementation((callback) => {
      requestClose = callback;
      return () => undefined;
    });
    render(<DetailPage state={state} taskId="task-1" />);
    fireEvent.change(screen.getByDisplayValue("编写测试"), { target: { value: "关闭窗口时保存" } });

    await act(async () => {
      requestClose?.();
      await Promise.resolve();
    });

    expect(apiMock.updateTask).toHaveBeenCalledWith(expect.objectContaining({ title: "关闭窗口时保存" }));
    expect(apiMock.closeDetail).toHaveBeenCalled();
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
