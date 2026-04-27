import { useEffect, useMemo, useRef, useState } from "react";
import "./SettingsPage.css";
import { DEFAULT_SETTINGS } from "../defaultSettings";
import {
  AlertTriangle,
  Brain,
  Bot,
  Check,
  ChevronDown,
  Database,
  HardDrive,
  Palette,
  Save,
  User,
} from "lucide-react";

const AGENT_ACTION_OPTIONS = [
  { id: "summarize", label: "Summarize" },
  { id: "study_notes", label: "Study Notes" },
  { id: "key_points", label: "Key Points" },
  { id: "faq", label: "FAQ" },
  { id: "action_items", label: "Action Items" },
];

const MODEL_OPTIONS = [
  { value: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B - Free (Fastest)" },
  { value: "google/gemma-3-27b-it:free", label: "Gemma 3 27B - Free (Best Quality)" },
  { value: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B - Free (Strong Reasoning)" },
  { value: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B - Free (Balanced)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B - Free (Largest)" },
  { value: "mistralai/mistral-7b-instruct-v0.2", label: "Mistral 7B v0.2 - Paid" },
];

const DEFAULT_ENABLED_ACTION_IDS = AGENT_ACTION_OPTIONS.map((opt) => opt.id);
const TOKENS_PER_MB = 250000;

function applyInterfacePreferences(theme, fontSize) {
  const selectedTheme = theme === "light" ? "light" : "dark";
  const selectedFontSize = fontSize || "medium";

  document.documentElement.setAttribute("data-theme", selectedTheme);
  document.documentElement.style.fontSize =
    selectedFontSize === "small" ? "14px" : selectedFontSize === "large" ? "18px" : "16px";
}

function ToggleCard({ checked, onChange, label, description = null }) {
  return (
    <div className="settings-toggle-card">
      <div className="settings-toggle-copy">
        <p className="settings-toggle-label">{label}</p>
        {description ? <p className="settings-toggle-description">{description}</p> : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`settings-switch ${checked ? "on" : "off"}`}
      >
        <span className="settings-switch-knob" />
      </button>
    </div>
  );
}

function SelectCard({ label, description, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) || options[0] || { label: "Select", value: "" };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="settings-select-card" ref={rootRef}>
      <label className="settings-select-label">{label}</label>
      {description ? <p className="settings-select-description">{description}</p> : null}

      <div className="settings-select-anchor">
        <button
          type="button"
          className={`settings-select-trigger ${open ? "open" : ""}`}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span>{selectedOption.label}</span>
          <ChevronDown size={16} />
        </button>

        {open ? (
          <div className="settings-select-menu" role="listbox">
            {options.map((opt) => {
              const active = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  className={`settings-select-option ${active ? "active" : ""}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {active ? <Check size={14} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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

function formatSize(bytes) {
  const safe = Number(bytes || 0);
  if (safe === 0) return "0 KB";
  if (safe < 1024) return `${safe} B`;
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(1)} KB`;
  return `${(safe / (1024 * 1024)).toFixed(2)} MB`;
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

      const users = JSON.parse(window.localStorage.getItem("users") || "[]");
      const account = users.find((u) => u.id === userId);
      let cacheProfile = {};
      try {
        cacheProfile = JSON.parse(
          window.sessionStorage.getItem("user_cache") || window.localStorage.getItem("user_cache") || "{}"
        );
      } catch {
        cacheProfile = {};
      }

      merged.profile = {
        ...(merged.profile || {}),
        name: account?.name || cacheProfile?.name || merged.profile?.name || "",
        email: account?.email || cacheProfile?.email || merged.profile?.email || "",
      };

      const validActionIds = new Set(AGENT_ACTION_OPTIONS.map((action) => action.id));
      const savedEnabledActions = Array.isArray(merged?.agent?.enabled_actions)
        ? merged.agent.enabled_actions.filter((id) => validActionIds.has(id))
        : [];

      merged.agent.enabled_actions =
        savedEnabledActions.length > 0 ? savedEnabledActions : [...DEFAULT_ENABLED_ACTION_IDS];

      if (![3, 5, 8].includes(Number(merged.agent.summary_length))) {
        merged.agent.summary_length = 5;
      }

      applyInterfacePreferences(merged?.interface?.theme, merged?.interface?.font_size);

      setSettings(merged);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, userId]);

  useEffect(() => {
    applyInterfacePreferences(settings?.interface?.theme, settings?.interface?.font_size);
  }, [settings?.interface?.theme, settings?.interface?.font_size]);

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
    const resetSettings = {
      ...deepClone(DEFAULT_SETTINGS),
      user_id: userId,
      profile: {
        name: settings?.profile?.name || "",
        email: settings?.profile?.email || "",
      },
      agent: {
        ...deepClone(DEFAULT_SETTINGS.agent),
        enabled_actions: [...DEFAULT_ENABLED_ACTION_IDS],
      },
    };
    setSettings(resetSettings);
    applyInterfacePreferences(resetSettings.interface.theme, resetSettings.interface.font_size);
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

  const history = useMemo(() => {
    try {
      return JSON.parse(window.localStorage.getItem(`history_${userId}`) || "[]");
    } catch {
      return [];
    }
  }, [userId]);

  const docsCount = docs.length;
  const docsBytes = docs.reduce((sum, d) => sum + (Number(d.size_bytes) || Number(d.size) || 0), 0);
  const docsSizeDisplay = formatSize(docsBytes);
  const tokenLimit = 50000;
  const usedTokens = Math.round(
    history.reduce((chatTotal, chat) => {
      const chatMessages = Array.isArray(chat?.messages) ? chat.messages : [];
      const chatTokens = chatMessages.reduce((msgTotal, msg) => {
        const text = String(msg?.content || msg?.text || "");
        return msgTotal + Math.ceil(text.length / 4);
      }, 0);
      return chatTotal + chatTokens;
    }, 0)
  );
  const usagePct = Math.min(100, (usedTokens / tokenLimit) * 100);
  const tokenMb = (usedTokens / TOKENS_PER_MB).toFixed(4);
  const storagePct = (docsBytes / (1024 * 1024 * 1024)) * 100;

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
                readOnly
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
                <div className="usage-pct">{usagePct.toFixed(1)}%</div>
              </div>
              <div className="usage-metric">{usedTokens.toLocaleString()} / {tokenLimit.toLocaleString()} tokens</div>
              <div className="usage-bar">
                <div className="usage-bar-fill" style={{ width: `${usagePct.toFixed(1)}%` }} />
              </div>
              <div className="usage-sub">{usedTokens.toLocaleString()} tokens = {tokenMb} MB</div>
              
              <div className="usage-sub">Documents Uploaded: {docsCount} PDFs • {docsSizeDisplay}</div>
            </div>
          </div>
        )}

        {activeTab === "llm" && (
          <div className="settings-section">
            <SelectCard
              label="Model"
              description="Uses a currently available OpenRouter model. If one disappears, the backend falls back automatically."
              value={settings.llm.model}
              onChange={(v) => updateSetting("llm.model", v)}
              options={MODEL_OPTIONS}
            />

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

            <SelectCard
              label="Max Tokens"
              value={settings.llm.max_tokens}
              onChange={(v) => updateSetting("llm.max_tokens", Number(v))}
              options={[
                { value: 256, label: "256" },
                { value: 512, label: "512" },
                { value: 1024, label: "1024" },
                { value: 2048, label: "2048" },
              ]}
            />

            <ToggleCard
              label="Streaming"
              description="Stream responses word-by-word for faster perceived speed"
              checked={settings.llm.streaming}
              onChange={(checked) => updateSetting("llm.streaming", checked)}
            />
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

            <SelectCard
              label="Chunk Size"
              value={settings.rag.chunk_size}
              onChange={(v) => updateSetting("rag.chunk_size", Number(v))}
              options={[
                { value: 256, label: "256 tokens - High precision" },
                { value: 500, label: "500 tokens - Balanced" },
                { value: 1000, label: "1000 tokens - More context" },
              ]}
            />

            <SelectCard
              label="Chunk Overlap"
              value={settings.rag.chunk_overlap}
              onChange={(v) => updateSetting("rag.chunk_overlap", Number(v))}
              options={[
                { value: 0, label: "0" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
              ]}
            />

            <SelectCard
              label="Top-K Retrieval"
              value={settings.rag.top_k}
              onChange={(v) => updateSetting("rag.top_k", Number(v))}
              options={[
                { value: 1, label: "1 chunk - Fast" },
                { value: 3, label: "3 chunks - Balanced" },
                { value: 5, label: "5 chunks - More context" },
              ]}
            />

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
                {AGENT_ACTION_OPTIONS.map((action) => {
                  const enabled = settings.agent.enabled_actions.includes(action.id);
                  return (
                    <label
                      key={action.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: "var(--text)",
                      }}
                    >
                      <input
                        className="settings-checkbox"
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next = checked
                            ? Array.from(new Set([...settings.agent.enabled_actions, action.id]))
                            : settings.agent.enabled_actions.filter((a) => a !== action.id);
                          updateSetting("agent.enabled_actions", next);
                        }}
                      />
                      {action.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <SelectCard
              label="Summary Length"
              description="Used by summarize-style actions."
              value={settings.agent.summary_length}
              onChange={(v) => updateSetting("agent.summary_length", Number(v))}
              options={[
                { value: 3, label: "3 bullets" },
                { value: 5, label: "5 bullets" },
                { value: 8, label: "8 bullets" },
              ]}
            />
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

            <ToggleCard
              label="Show Sources"
              description="Display page numbers and relevance scores with document answers"
              checked={settings.interface.show_sources}
              onChange={(checked) => updateSetting("interface.show_sources", checked)}
            />

            <SelectCard
              label="Font Size"
              value={settings.interface.font_size}
              onChange={(v) => updateSetting("interface.font_size", v)}
              options={[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
            />
          </div>
        )}

        {activeTab === "data" && (
          <div className="settings-section">
            <div className="field">
              <label>Storage Used</label>
              <div className="storage-card">
                <div className="storage-row">
                  <span>{docsSizeDisplay} / 1024 MB</span>
                  <span className="storage-pct">{Math.min(100, storagePct).toFixed(storagePct < 0.01 ? 4 : 1)}%</span>
                </div>
                <div className="usage-bar">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(100, storagePct).toFixed(4)}%` }}
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
