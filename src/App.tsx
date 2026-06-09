import { useState } from "react";
import { CheckSquare, Clock3, Settings } from "lucide-react";
import { useAppState } from "./hooks";
import { DetailPage } from "./components/DetailPage";
import { FocusPage } from "./components/FocusPage";
import { SettingsPage } from "./components/SettingsPage";
import { TodoPage } from "./components/TodoPage";

type Page = "todo" | "focus" | "settings";

export function App() {
  const state = useAppState();
  const [page, setPage] = useState<Page>("todo");
  const detailId = new URLSearchParams(window.location.search).get("detail");

  if (!state) return <div className="loading">正在准备你的待办…</div>;
  if (detailId) return <DetailPage state={state} taskId={detailId} />;

  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="主导航">
        <div className="nav-group">
          <NavButton label="待办" active={page === "todo"} onClick={() => setPage("todo")}>
            <CheckSquare size={18} />
          </NavButton>
          <NavButton label="专注" active={page === "focus"} onClick={() => setPage("focus")}>
            <Clock3 size={18} />
          </NavButton>
          <NavButton label="设置" active={page === "settings"} onClick={() => setPage("settings")}>
            <Settings size={18} />
          </NavButton>
        </div>
        <span className="brand-dot" title="暖暖待办" />
      </nav>
      {page === "todo" && <TodoPage state={state} onOpenFocus={() => setPage("focus")} />}
      {page === "focus" && <FocusPage state={state} />}
      {page === "settings" && <SettingsPage state={state} />}
    </main>
  );
}

function NavButton({
  children,
  label,
  active,
  onClick
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`icon-button nav-button ${active ? "active" : ""}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
