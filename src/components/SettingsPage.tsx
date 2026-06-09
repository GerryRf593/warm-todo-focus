import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { api } from "../api";
import type { AppSettings, AppState } from "../types";

export function SettingsPage({ state }: { state: AppState }) {
  const updateNumber = (key: "focusMinutes" | "breakMinutes", value: number) => {
    api.updateSettings({ [key]: Math.max(1, Math.min(180, value)) });
  };

  return (
    <section className="page settings-page">
      <header className="page-heading simple-heading">
        <div>
          <h1>设置</h1>
          <p>让工作节奏更适合你</p>
        </div>
      </header>

      <SettingsGroup title="计时">
        <NumberRow
          label="专注时长"
          value={state.settings.focusMinutes}
          onChange={(value) => updateNumber("focusMinutes", value)}
        />
        <NumberRow
          label="休息时长"
          value={state.settings.breakMinutes}
          onChange={(value) => updateNumber("breakMinutes", value)}
        />
      </SettingsGroup>

      <SettingsGroup title="应用">
        <ToggleRow label="系统通知" setting="notifications" settings={state.settings} />
        <ToggleRow label="开机启动" setting="launchAtStartup" settings={state.settings} />
        <ToggleRow label="关闭到托盘" setting="closeToTray" settings={state.settings} />
      </SettingsGroup>

      <button
        className="reset-settings"
        onClick={() =>
          api.updateSettings({
            focusMinutes: 25,
            breakMinutes: 5,
            notifications: true,
            launchAtStartup: false,
            closeToTray: true
          })
        }
      >
        <RotateCcw size={15} />
        恢复默认设置
      </button>
    </section>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-group">
      <h2>{title}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= 1) onChange(Math.round(parsed));
    else setDraft(String(value));
  };

  return (
    <div className="setting-row">
      <span>{label}</span>
      <div className="number-control">
        <button onClick={() => onChange(value - 1)}>−</button>
        <label>
          <input
            aria-label={`${label}（分钟）`}
            inputMode="numeric"
            min="1"
            max="180"
            type="number"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraft(String(value));
                event.currentTarget.blur();
              }
            }}
          />
          <span>分钟</span>
        </label>
        <button onClick={() => onChange(value + 1)}>＋</button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  setting,
  settings
}: {
  label: string;
  setting: keyof Pick<AppSettings, "notifications" | "launchAtStartup" | "closeToTray">;
  settings: AppSettings;
}) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <button
        className={`toggle ${settings[setting] ? "on" : ""}`}
        role="switch"
        aria-checked={settings[setting]}
        onClick={() => api.updateSettings({ [setting]: !settings[setting] })}
      >
        <i />
      </button>
    </div>
  );
}
