import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { api } from "../api";
import type { AppState, Task, TaskStep } from "../types";
import { TimerStrip } from "./TimerStrip";

export function DetailPage({ state, taskId }: { state: AppState; taskId: string }) {
  const original = state.tasks.find((task) => task.id === taskId);
  const [draft, setDraft] = useState<Task | null>(original ? structuredClone(original) : null);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const [focusStepId, setFocusStepId] = useState<string | null>(null);
  const stepInputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (original) setDraft(structuredClone(original));
  }, [original?.updatedAt]);

  useEffect(() => {
    return api.onDetailCloseRequested(async () => {
      if (draft) await api.updateTask({ ...draft, title: draft.title.trim() || original?.title || "新待办" });
      api.closeDetail();
    });
  }, [draft, original?.title]);

  useEffect(() => {
    if (!focusStepId) return;
    const input = stepInputs.current.get(focusStepId);
    if (!input) return;
    input.focus();
    input.select();
    setFocusStepId(null);
  }, [draft?.steps, focusStepId]);

  if (!draft) {
    return (
      <main className="detail-shell">
        <p>这条待办已经不存在。</p>
        <button className="primary-button" onClick={() => api.closeDetail()}>关闭</button>
      </main>
    );
  }

  const updateStep = (id: string, patch: Partial<TaskStep>) => {
    setDraft({ ...draft, steps: draft.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)) });
  };

  const addStepAfter = (index: number) => {
    const id = crypto.randomUUID();
    const steps = [...draft.steps];
    steps.splice(index + 1, 0, { id, title: "", completed: false });
    setDraft({ ...draft, steps });
    setFocusStepId(id);
  };

  const save = async () => {
    await api.updateTask({ ...draft, title: draft.title.trim() || original?.title || "新待办" });
    api.closeDetail();
  };

  return (
    <main className="detail-shell">
      <header className="detail-header">
        <button className="icon-button" aria-label="返回并保存" onClick={save}>
          <ArrowLeft size={18} />
        </button>
        <strong>待办详情</strong>
        <button
          className="icon-button"
          aria-label="删除"
          onClick={async () => {
            if (window.confirm("确定删除这条待办吗？")) {
              await api.deleteTask(draft.id);
              api.closeDetail();
            }
          }}
        >
          <Trash2 size={17} />
        </button>
      </header>

      <div className="detail-timer">
        <TimerStrip state={state} />
      </div>

      <section className={`detail-title color-${draft.color}`}>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      </section>

      <label className="field-label" htmlFor="details">详细计划</label>
      <textarea
        id="details"
        className="details-field"
        value={draft.details}
        placeholder="记录思路、目标或需要注意的事情…"
        onChange={(event) => setDraft({ ...draft, details: event.target.value })}
      />

      <div className="steps-heading">
        <span className="field-label">步骤</span>
        <small>{draft.steps.filter((step) => step.completed).length}/{draft.steps.length}</small>
      </div>
      <div className="steps-list">
        {draft.steps.map((step, index) => (
          <div
            className={`step-row ${draggedStepId === step.id ? "dragging" : ""} ${dragOverStepId === step.id ? "drag-over" : ""}`}
            key={step.id}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => {
              if (!draggedStepId || draggedStepId === step.id) return;
              setDragOverStepId(step.id);
              const from = draft.steps.findIndex((item) => item.id === draggedStepId);
              if (from < 0 || from === index) return;
              const steps = [...draft.steps];
              const [moved] = steps.splice(from, 1);
              steps.splice(index, 0, moved);
              setDraft({ ...draft, steps });
            }}
          >
            <span
              className="drag-handle"
              draggable
              title="拖动排序"
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", step.id);
                setDraggedStepId(step.id);
                setDragOverStepId(step.id);
              }}
              onDragEnd={() => {
                setDraggedStepId(null);
                setDragOverStepId(null);
              }}
            >
              <GripVertical size={15} />
            </span>
            <button
              className={`step-check ${step.completed ? "checked" : ""}`}
              onClick={() => updateStep(step.id, { completed: !step.completed })}
            >
              {step.completed && <Check size={12} />}
            </button>
            <input
              ref={(element) => {
                if (element) stepInputs.current.set(step.id, element);
                else stepInputs.current.delete(step.id);
              }}
              className={step.completed ? "done" : ""}
              placeholder="输入步骤"
              value={step.title}
              onChange={(event) => updateStep(step.id, { title: event.target.value })}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                addStepAfter(index);
              }}
            />
            <button
              className="mini-action"
              aria-label="删除步骤"
              onClick={() => setDraft({ ...draft, steps: draft.steps.filter((item) => item.id !== step.id) })}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          className="add-step"
          onClick={() => addStepAfter(draft.steps.length - 1)}
        >
          <Plus size={15} />
          添加步骤
        </button>
      </div>

      <footer className="detail-footer">
        <span>{new Date(draft.createdAt).toLocaleDateString("zh-CN")} 创建</span>
        <div className="detail-footer-actions">
          <button className="secondary-button" onClick={() => api.closeDetail()}>取消</button>
          <button className="primary-button" onClick={save}>保存</button>
        </div>
      </footer>
    </main>
  );
}
