import { useEffect, useMemo, useState } from "react";
import "./SettingsPage.css";
import { DEFAULT_SETTINGS } from "../defaultSettings";
import {
  AlertTriangle,
  Brain,
  Bot,
  Database,
  HardDrive,
  Palette,
  Save,
  User,
} from "lucide-react";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  if (!isPlainObject(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function setPathValue(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function SettingsPage({
  apiBase,
  userId,
  uploadedDocName,
  onClose,
  onToast,
  onProfileChanged,
}) {
  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const tabs = useMemo(
    () => [
      { id: "profile", label: "Profile", icon: <User size={18} /> },
      { id: "llm", label: "LLM", icon: <Brain size={18} /> },
      { id: "rag", label: "RAG Pipeline", icon: <Database size={18} /> },
      { id: "agent", label: "Agent", icon: <Bot size={18} /> },
      { id: "interface", label: "Interface", icon: <Palette size={18} /> },
      { id: "data", label: "Data", icon: <HardDrive size={18} /> },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const localKey = `settings_${userId}`;

      let parsedLocal = null;
      try {
        const saved = window.localStorage.getItem(localKey);
        if (saved) parsedLocal = JSON.parse(saved);
      } catch {
        parsedLocal = null;
      }

      let runtimeDefaults = null;
      try {
        const res = await fetch(`${apiBase}/settings?user_id=${encodeURIComponent(userId)}`);
        const data = await safeJson(res);
        if (res.ok && data) runtimeDefaults = data;
      } catch {
        runtimeDefaults = null;
      }

      if (cancelled) return;

      const merged = deepClone(DEFAULT_SETTINGS);
      if (runtimeDefaults) deepMerge(merged, runtimeDefaults);
      if (parsedLocal) deepMerge(merged, parsedLocal);
      merged.user_id = userId;

      setSettings(merged);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, userId]);

  const updateSetting = (path, value) => {
    setSettings((prev) => {
      const next = deepClone(prev);
      setPathValue(next, path, value);
      if (path.startsWith("rag.") && path !== "rag.needs_reprocess") {
        next.rag.needs_reprocess = true;
      }
      return next;
    });
    setUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const localKey = `settings_${userId}`;
      window.localStorage.setItem(localKey, JSON.stringify(settings));

      const res = await fetch(`${apiBase}/settings?user_id=${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        onToast?.("error", data?.detail || "Failed to save settings");
      } else {
        onToast?.("success", "Settings saved");
        setUnsavedChanges(false);
        onProfileChanged?.(settings.profile);
      }

      // Apply theme immediately (MVP: dark/light)
      document.documentElement.setAttribute("data-theme", settings.interface.theme);

      if (settings.rag.needs_reprocess) {
        onToast?.("error", "Re-process documents to apply RAG changes");
      }
    } catch {
      onToast?.("error", "Failed to save settings");
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    if (!window.confirm("Reset all settings to defaults? This cannot be undone.")) return;
    setSettings({ ...deepClone(DEFAULT_SETTINGS), user_id: userId });
    setUnsavedChanges(true);
    onToast?.("success", "Settings reset to defaults");
  };

  const handleReprocess = async () => {
    const filename = uploadedDocName || docs?.[0]?.filename || null;
    if (!filename) {
      onToast?.("error", "Upload a PDF first to re-process");
      return;
    }

    setIsReprocessing(true);
    try {
      const res = await fetch(`${apiBase}/rag/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          filename,
          chunk_size: settings.rag.chunk_size,
          chunk_overlap: settings.rag.chunk_overlap,
          top_k: settings.rag.top_k,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        onToast?.("error", data?.detail || "Re-process failed");
      } else {
        onToast?.("success", `Re-processed ${data?.filename || "document"}`);
        setSettings((prev) => ({ ...prev, rag: { ...prev.rag, needs_reprocess: false } }));
        setUnsavedChanges(true);
      }
    } catch {
      onToast?.("error", "Re-process failed");
    }
    setIsReprocessing(false);
  };

  const handleClearAllData = () => {
    const confirmText = window.prompt('Type DELETE to clear all your data permanently:');
    if (confirmText !== "DELETE") return;

    window.localStorage.removeItem(`docs_${userId}`);
    window.localStorage.removeItem(`history_${userId}`);
    window.localStorage.removeItem(`settings_${userId}`);
    onToast?.("success", "All data cleared");
    window.location.reload();
  };

  // Lightweight stats (MVP)
  const docs = useMemo(() => {
    try {
      return JSON.parse(window.localStorage.getItem(`docs_${userId}`) || "[]");
    } catch {
      return [];
    }
  }, [userId]);

  const docsCount = docs.length;
  const docsBytes = docs.reduce((sum, d) => sum + (Number(d.size_bytes) || 0), 0);
  const docsMb = (docsBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="settings-page">
      <div className="settings-top">
        <div className="settings-title-row">
          <h1 className="settings-title">Settings</h1>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            Back
          </button>
        </div>

        <div className="settings-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-body">
        {activeTab === "profile" && (
          <div className="settings-section">
            <div className="field">
              <label>Display Name</label>
              <input
                type="text"
                value={settings.profile.name}
                onChange={(e) => updateSetting("profile.name", e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input type="email" value={settings.profile.email} disabled placeholder="you@email.com" />
            </div>

            <div className="settings-divider" />

            <div className="usage-block">
              <div className="usage-header">
                <div className="usage-title">API Usage This Month</div>
                <div className="usage-pct">24.7%</div>
              </div>
              <div className="usage-metric">12,340 / 50,000 tokens</div>
              <div className="usage-bar">
                <div className="usage-bar-fill" style={{ width: "24.7%" }} />
              </div>
              <div className="usage-sub">Documents Uploaded: {docsCount} PDFs • {docsMb} MB</div>
            </div>
          </div>
        )}

        {activeTab === "llm" && (
          <div className="settings-section">
            <div className="field">
              <label>Model</label>
              <div className="readonly-card">
                {settings.llm.model}
                <span className="readonly-badge">via OpenRouter</span>
              </div>
            </div>

            <div className="field">
              <label>API Endpoint</label>
              <div className="readonly-card">https://openrouter.ai/api/v1</div>
            </div>

            <div className="field">
              <label>OpenRouter API Key</label>
              <input
                type="password"
                value={settings.llm.api_key}
                onChange={(e) => updateSetting("llm.api_key", e.target.value)}
                placeholder="sk-or-v1-..."
              />
              <div className="helper">Get a key at openrouter.ai</div>
            </div>

            <div className="field">
              <label>Temperature: {settings.llm.temperature.toFixed(1)}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={settings.llm.temperature}
                onChange={(e) => updateSetting("llm.temperature", Number(e.target.value))}
              />
              <div className="helper">0.0 = factual, 1.0 = creative. Use 0.1 for RAG.</div>
            </div>

            <div className="field">
              <label>Max Tokens</label>
              <select
                value={settings.llm.max_tokens}
                onChange={(e) => updateSetting("llm.max_tokens", Number(e.target.value))}
              >
                <option value={256}>256</option>
                <option value={512}>512</option>
                <option value={1024}>1024</option>
              </select>
            </div>

            <div className="field">
              <label>System Prompt - Guardrail</label>
              <textarea
                rows={6}
                value={settings.llm.system_prompt}
                onChange={(e) => updateSetting("llm.system_prompt", e.target.value)}
              />
              <div className="helper">Use {"{context}"} and {"{question}"} placeholders.</div>
            </div>

            <div className="field row">
              <label>Streaming</label>
              <button
                className={`toggle ${settings.llm.streaming ? "on" : "off"}`}
                onClick={() => updateSetting("llm.streaming", !settings.llm.streaming)}
                type="button"
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "rag" && (
          <div className="settings-section">
            {settings.rag.needs_reprocess && (
              <div className="warning-banner">
                <AlertTriangle size={20} />
                <div className="warning-text">
                  <div className="warning-title">RAG settings changed</div>
                  <div className="warning-sub">Re-process documents for changes to take effect</div>
                  <button className="warning-action" onClick={handleReprocess} disabled={isReprocessing}>
                    {isReprocessing ? "Re-processing..." : `Re-process ${docsCount || 1} documents now`}
                  </button>
                </div>
              </div>
            )}

            <div className="field">
              <label>Chunk Size</label>
              <select
                value={settings.rag.chunk_size}
                onChange={(e) => updateSetting("rag.chunk_size", Number(e.target.value))}
              >
                <option value={256}>256 tokens - High precision</option>
                <option value={500}>500 tokens - Balanced</option>
                <option value={1000}>1000 tokens - More context</option>
              </select>
            </div>

            <div className="field">
              <label>Chunk Overlap</label>
              <select
                value={settings.rag.chunk_overlap}
                onChange={(e) => updateSetting("rag.chunk_overlap", Number(e.target.value))}
              >
                <option value={0}>0</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="field">
              <label>Top-K Retrieval</label>
              <select value={settings.rag.top_k} onChange={(e) => updateSetting("rag.top_k", Number(e.target.value))}>
                <option value={1}>1 chunk - Fast</option>
                <option value={3}>3 chunks - Balanced</option>
                <option value={5}>5 chunks - More context</option>
              </select>
            </div>

            <div className="field">
              <label>Embedding Model</label>
              <div className="readonly-card muted">{settings.rag.embedding_model} (Local)</div>
            </div>

            <div className="field">
              <label>Similarity Threshold: {settings.rag.similarity_threshold.toFixed(2)}</label>
              <input
                type="range"
                min={0.5}
                max={0.9}
                step={0.05}
                value={settings.rag.similarity_threshold}
                onChange={(e) => updateSetting("rag.similarity_threshold", Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {activeTab === "agent" && (
          <div className="settings-section">
            <div className="field">
              <label>Enabled Actions</label>
              <div className="helper">Controls which quick agent skills are allowed.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {["summarize", "notes", "faq"].map((action) => {
                  const enabled = settings.agent.enabled_actions.includes(action);
                  return (
                    <label
                      key={action}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "var(--text)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next = checked
                            ? [...settings.agent.enabled_actions, action]
                            : settings.agent.enabled_actions.filter((a) => a !== action);
                          updateSetting("agent.enabled_actions", next);
                        }}
                      />
                      {action}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label>Summary Length</label>
              <select
                value={settings.agent.summary_length}
                onChange={(e) => updateSetting("agent.summary_length", Number(e.target.value))}
              >
                <option value={3}>3 bullets</option>
                <option value={5}>5 bullets</option>
                <option value={8}>8 bullets</option>
              </select>
              <div className="helper">Used by summarize-style actions.</div>
            </div>
          </div>
        )}

        {activeTab === "interface" && (
          <div className="settings-section">
            <div className="field">
              <label>Theme</label>
              <div className="segmented">
                <button
                  className={settings.interface.theme === "dark" ? "active" : ""}
                  onClick={() => updateSetting("interface.theme", "dark")}
                  type="button"
                >
                  Dark
                </button>
                <button
                  className={settings.interface.theme === "light" ? "active" : ""}
                  onClick={() => updateSetting("interface.theme", "light")}
                  type="button"
                >
                  Light
                </button>
              </div>
            </div>

            <div className="field row">
              <label>Show Sources</label>
              <button
                className={`toggle ${settings.interface.show_sources ? "on" : "off"}`}
                onClick={() => updateSetting("interface.show_sources", !settings.interface.show_sources)}
                type="button"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="field">
              <label>Font Size</label>
              <select
                value={settings.interface.font_size}
                onChange={(e) => updateSetting("interface.font_size", e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="settings-section">
            <div className="field">
              <label>Storage Used</label>
              <div className="storage-card">
                <div className="storage-row">
                  <span>{docsMb} MB / 1024 MB</span>
                  <span className="storage-pct">{Math.min(100, (docsBytes / (1024 * 1024 * 1024)) * 100).toFixed(1)}%</span>
                </div>
                <div className="usage-bar">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(100, (docsBytes / (1024 * 1024 * 1024)) * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="danger-zone">
              <button className="danger-btn" onClick={handleClearAllData}>
                Clear All Data
              </button>
              <div className="helper">Deletes PDFs, chats, and settings for this user.</div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="link-btn" onClick={handleReset} type="button">
          Reset to Defaults
        </button>

        <button
          className={`save-btn ${unsavedChanges ? "active" : ""}`}
          onClick={handleSave}
          disabled={!unsavedChanges || isSaving}
          type="button"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Changes"}
          {unsavedChanges ? <span className="unsaved-dot" /> : null}
        </button>
      </div>
    </div>
  );
}
