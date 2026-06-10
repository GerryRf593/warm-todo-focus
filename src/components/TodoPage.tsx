import { useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Trash2, Undo2 } from "lucide-react";
import { api } from "../api";
import type { AppState, Task } from "../types";
import { TimerStrip } from "./TimerStrip";

export function TodoPage({ state, onOpenFocus }: { state: AppState; onOpenFocus: () => void }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const active = state.tasks.filter((task) => !task.completed);
  const completed = state.tasks.filter((task) => task.completed);

  const addTask = async () => {
    if (newTitle.trim()) await api.addTask(newTitle.trim());
    setNewTitle("");
    setAdding(false);
  };

  return (
    <section className="page todo-page">
      <TimerStrip state={state} onOpenFocus={onOpenFocus} />

      <header className="page-heading">
        <div>
          <h1>今日待办</h1>
          <p>{active.length} 条待办</p>
        </div>
        <button className="icon-button add-button" aria-label="添加待办" onClick={() => setAdding(true)}>
          <Plus size={20} />
        </button>
      </header>

      <div className="task-list active-list">
        {adding && (
          <div className="task-card color-yellow new-task">
            <span className="task-circle" />
            <input
              autoFocus
              value={newTitle}
              placeholder="输入新待办…"
              onChange={(event) => setNewTitle(event.target.value)}
              onBlur={addTask}
              onKeyDown={(event) => {
                if (event.key === "Enter") addTask();
                if (event.key === "Escape") setAdding(false);
              }}
            />
          </div>
        )}
        {active.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {!adding && active.length === 0 && (
          <button className="empty-state" onClick={() => setAdding(true)}>
            <Plus size={18} />
            添加今天的第一条待办
          </button>
        )}
      </div>

      {completed.length > 0 && (
        <section className="completed-section">
          <div className="completed-heading">
            <button onClick={() => setShowCompleted((value) => !value)}>
              {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              已完成 {completed.length}
            </button>
            <button className="text-button danger-text" onClick={() => api.clearCompleted()}>
              清空
            </button>
          </div>
          {showCompleted && (
            <div className="task-list completed-list">
              {completed.map((task) => (
                <div className="completed-card" key={task.id}>
                  <button
                    className="completed-check"
                    title="恢复待办"
                    onClick={() => api.updateTask({ id: task.id, completed: false })}
                  >
                    <Check size={13} />
                  </button>
                  <span>{task.title}</span>
                  <button className="mini-action" aria-label="恢复" onClick={() => api.updateTask({ id: task.id, completed: false })}>
                    <Undo2 size={14} />
                  </button>
                  <button className="mini-action" aria-label="删除" onClick={() => api.deleteTask(task.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const pointerStart = useRef<number | null>(null);
  const clickTimer = useRef<number | null>(null);

  const save = async () => {
    const value = title.trim();
    setEditing(false);
    if (value && value !== task.title) await api.updateTask({ id: task.id, title: value });
    else setTitle(task.title);
  };

  return (
    <article
      className={`task-card color-${task.color}`}
      onPointerDown={(event) => {
        if (editing) return;
        pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (!editing && pointerStart.current !== null && event.clientX - pointerStart.current < -70) {
          api.updateTask({ id: task.id, completed: true });
        }
        pointerStart.current = null;
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        if (clickTimer.current) window.clearTimeout(clickTimer.current);
        setEditing(false);
        api.openDetail(task.id);
      }}
    >
      <button
        className="task-circle"
        aria-label="完成待办"
        disabled={editing}
        onClick={(event) => {
          event.stopPropagation();
          if (editing) return;
          api.updateTask({ id: task.id, completed: true });
        }}
      />
      <div className="task-content">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={save}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            className="task-title"
            onClick={() => {
              if (clickTimer.current) window.clearTimeout(clickTimer.current);
              clickTimer.current = window.setTimeout(() => setEditing(true), 230);
            }}
          >
            {task.title}
          </button>
        )}
        {(task.details || task.steps.length > 0) && (
          <span className="detail-hint">{task.steps.length > 0 ? `${task.steps.length} 个步骤` : "有详细计划"}</span>
        )}
      </div>
    </article>
  );
}
