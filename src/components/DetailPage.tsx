import { useEffect, useState } from "react";
import { ArrowLeft, Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { api } from "../api";
import type { AppState, Task, TaskStep } from "../types";

export function DetailPage({ state, taskId }: { state: AppState; taskId: string }) {
  const original = state.tasks.find((task) => task.id === taskId);
  const [draft, setDraft] = useState<Task | null>(original ? structuredClone(original) : null);
  const [dragged, setDragged] = useState<number | null>(null);

  useEffect(() => {
    if (original) setDraft(structuredClone(original));
  }, [original?.updatedAt]);

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

  const save = async () => {
    await api.updateTask(draft);
    api.closeDetail();
  };

  return (
    <main className="detail-shell">
      <header className="detail-header">
        <button className="icon-button" aria-label="返回" onClick={() => api.closeDetail()}>
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
            className="step-row"
            key={step.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragged === null || dragged === index) return;
              const steps = [...draft.steps];
              const [moved] = steps.splice(dragged, 1);
              steps.splice(index, 0, moved);
              setDraft({ ...draft, steps });
              setDragged(null);
            }}
          >
            <span
              className="drag-handle"
              draggable
              title="拖动排序"
              onDragStart={() => setDragged(index)}
              onDragEnd={() => setDragged(null)}
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
              className={step.completed ? "done" : ""}
              value={step.title}
              onChange={(event) => updateStep(step.id, { title: event.target.value })}
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
          onClick={() =>
            setDraft({
              ...draft,
              steps: [...draft.steps, { id: crypto.randomUUID(), title: "新步骤", completed: false }]
            })
          }
        >
          <Plus size={15} />
          添加步骤
        </button>
      </div>

      <footer className="detail-footer">
        <span>{new Date(draft.createdAt).toLocaleDateString("zh-CN")} 创建</span>
        <button className="primary-button" disabled={!draft.title.trim()} onClick={save}>保存</button>
      </footer>
    </main>
  );
}
