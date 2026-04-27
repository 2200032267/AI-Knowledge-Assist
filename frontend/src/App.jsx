import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import NewChatButton from "./components/NewChatButton";
import UserProfileSection from "./components/UserProfileSection";
import UploadModal from "./components/UploadModal";
import MessageRenderer from "./components/MessageRenderer";
import StreamingText from "./components/StreamingText";
import SettingsPage from "./views/SettingsPage";
import LandingPage from "./views/LandingPage";
import SavedDocs from "./views/SavedDocs";
import ChatWithDoc from "./views/ChatWithDoc";
import History from "./views/History";
import AgentActionsInfo from "./views/AgentActionsInfo";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import {
  getSession,
  getCurrentUserFromSession,
  logoutUserSession,
} from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { id: "general", label: "General Mode", mode: "general" },
  { id: "document", label: "Document Mode", mode: "document" },
  { id: "agent", label: "Agent Actions" },
  { id: "saved", label: "Saved Docs" },
  { id: "history", label: "History" },
];

const EXAMPLE_CARDS = [
  {
    title: "Examples",
    cards: [
      { prompt: "Upload research.pdf and ask: What is this about?", text: '"Upload research.pdf and ask: What is this about?"' },
      { prompt: "Summarize this document in 5 bullet points", text: '"Summarize this document in 5 bullet points"' },
      { prompt: "Generate study notes from chapter 3", text: '"Generate study notes from chapter 3"' },
    ],
  },
  {
    title: "Capabilities",
    cards: [
      { prompt: "Explain RAG-powered answers from my PDFs", text: '"RAG-powered answers from your PDFs"' },
      { prompt: "How do you prevent hallucinations?", text: '"Zero hallucination with guardrail prompts"' },
      { prompt: "What agent actions can you perform?", text: '"Rule-based agent: summarize, notes, key points"' },
    ],
  },
  {
    title: "RAG Features",
    cards: [
      { prompt: "Explain text chunking and vector embeddings", text: '"Text chunking + vector embeddings"' },
      { prompt: "What are the API endpoints?", text: '"FastAPI backend with /upload /ask /chat /agent"' },
      { prompt: "Switch to Document Chat mode", text: '"Switch between Document Chat & General Chat"' },
    ],
  },
];

const QUICK_ACTIONS = [
  { id: "summarize", label: "Summarize", prompt: "Summarize this document in 5 bullet points" },
  { id: "notes", label: "Generate Notes", prompt: "Generate study notes from this document" },
  { id: "keypoints", label: "Key Points", prompt: "Extract the key points from this document" },
];


function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <line x1="10" y1="9" x2="8" y2="9"></line>
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
      <path d="M2 17l10 5 10-5"></path>
      <path d="M2 12l10 5 10-5"></path>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}


function navIconById(id) {
  switch (id) {
    case "chat":
      return <IconChat />;
    case "saved":
      return <IconBookmark />;
    case "document":
      return <IconFileText />;
    case "general":
      return <IconGlobe />;
    case "agent":
      return <IconBolt />;
    case "history":
      return <IconClock />;
    default:
      return <IconChat />;
  }
}


async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState("chat");
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [activeView, setActiveView] = useState("chat");
  const [toast, setToast] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeHistoryChat, setActiveHistoryChat] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const userId = currentUser?.id || null;

  const userCache = useMemo(() => {
    try {
      const sessionCache = window.sessionStorage.getItem("user_cache");
      const localCache = window.localStorage.getItem("user_cache");
      return JSON.parse(sessionCache || localCache || "{}");
    } catch {
      return {};
    }
  }, [currentUser]);

  const userName = userCache?.name || currentUser?.name || "Your Name";
  const userEmail = userCache?.email || currentUser?.email || "your.email@example.com";

  const userInitials = useMemo(() => {
    const raw = String(userName || "").trim();
    if (!raw) return "U";
    const parts = raw.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
    return `${a}${b || ""}`.toUpperCase();
  }, [userName]);

  const showDocContextChat = activeView === "chat" && currentMode === "document" && Boolean(activeDoc?.id);
  const showEmptyState = activeView === "chat" && messages.length === 0 && !showDocContextChat;
  const showChat = activeView === "chat" && messages.length > 0 && !showDocContextChat;
  const hasUnsavedMessages = messages.length > 0;

  const navModeLabel = useMemo(() => {
    if (activeView === "settings") return "Settings";
    if (activeView === "saved") return "Saved Docs";
    if (activeView === "agent") return "Agent Actions";
    if (activeView === "history") return "History";
    const item = NAV_ITEMS.find((i) => i.mode === currentMode);
    return item?.label || "Chat";
  }, [currentMode, activeView]);

  const inputPlaceholder = useMemo(() => {
    if (currentMode === "document") {
      return uploadedDoc ? `Ask a question about ${uploadedDoc}` : "Upload a PDF to start";
    }
    if (currentMode === "general") return "Ask me anything...";
    if (currentMode === "agent") return "Ask an agent action about your document...";
    return "Ask about your document or start general chat...";
  }, [currentMode, uploadedDoc]);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleLogout = (reason) => {
    logoutUserSession();
    setCurrentUser(null);
    setShowLogin(true);
    setSidebarOpen(false);
    setActiveDoc(null);
    setActiveHistoryChat(null);
    setActiveView("chat");
    setMessages([]);
    setUploadedDoc(null);
    setCurrentMode("chat");
    setInput("");
    if (reason) showToast("error", reason);
  };

  const requireValidSession = () => {
    const s = getSession();
    if (!s) {
      handleLogout("Session expired. Please log in again.");
      return null;
    }
    return s;
  };

  // Check session on mount.
  useEffect(() => {
    const user = getCurrentUserFromSession();
    if (user) {
      setCurrentUser(user);
      setShowLogin(false);
      return;
    }

    logoutUserSession();
    // No session -> show landing. (Modal opens from landing CTA)
    setCurrentUser(null);
    setShowLogin(true);
  }, []);

  // Restore per-user mode + doc when user logs in.
  useEffect(() => {
    if (!userId) return;

    const savedDocName =
      window.localStorage.getItem(`uploadedDocName_${userId}`) ||
      window.localStorage.getItem("uploadedDocName");

    if (savedDocName) setUploadedDoc(savedDocName);

    const savedMode =
      window.localStorage.getItem(`currentMode_${userId}`) ||
      window.localStorage.getItem("currentMode");

    if (savedMode) {
      if (savedMode === "document" && !savedDocName) {
        setCurrentMode("general");
      } else {
        setCurrentMode(savedMode);
      }
    }
  }, [userId]);

  // Persist mode
  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(`currentMode_${userId}`, currentMode);
  }, [currentMode, userId]);

  // Enforce mode consistency: General mode must not carry document context state.
  useEffect(() => {
    if (currentMode !== "general") return;
    if (!activeDoc && !uploadedDoc) return;

    setActiveDoc(null);
    setUploadedDoc(null);
    window.sessionStorage.removeItem("activeChunks");
    if (userId) {
      window.localStorage.removeItem(`uploadedDocName_${userId}`);
    }
  }, [currentMode, activeDoc, uploadedDoc, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const scrollChatToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const focusInputIfMessagesExist = () => {
    if (messages.length === 0) return;
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleChatNavClick = () => {
    // Spec: navigation only, no reset, no API.
    if (activeView === "chat") {
      scrollChatToBottom();
      focusInputIfMessagesExist();
      return;
    }

    setActiveView("chat");
    closeSidebar();
    scrollChatToBottom();
    focusInputIfMessagesExist();
  };

  const handleSettingsNavClick = () => {
    if (activeView === "settings") {
      closeSidebar();
      return;
    }
    setActiveView("settings");
    closeSidebar();
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const addMessage = (role, text, options = {}) => {
    const now = Date.now();
    const nextMessage = {
      id: options.id || `msg_${now}_${role}`,
      role,
      text,
      isStreaming: Boolean(options.isStreaming),
      timestamp: options.timestamp || new Date().toISOString(),
    };

    setMessages((prev) => [...prev, nextMessage]);
  };

  const buildHistoryMode = (mode) => (mode === "document" ? "document" : "general");

  const saveConversationToHistory = (nextMessages, { forceNew = false, mode = currentMode } = {}) => {
    const sessionUserId = window.sessionStorage.getItem("session");
    if (!sessionUserId || !Array.isArray(nextMessages) || nextMessages.length === 0) return;

    const normalizedMode = buildHistoryMode(mode);
    const docName =
      normalizedMode === "document"
        ? uploadedDoc || activeDoc?.name || activeDoc?.filename || null
        : null;
    const docId = normalizedMode === "document" ? activeDoc?.id || null : null;

    const key = `history_${sessionUserId}`;
    const now = new Date().toISOString();
    const history = JSON.parse(window.localStorage.getItem(key) || "[]");

    let nextChatId = forceNew ? null : currentChatId;
    let existingIndex = nextChatId ? history.findIndex((h) => h.id === nextChatId) : -1;

    const mappedMessages = nextMessages.map((m, idx) => ({
      id: m.id || `msg_${Date.now()}_${idx}`,
      role: m.role,
      content: m.text,
      timestamp: m.timestamp || now,
    }));

    if (existingIndex === -1) {
      nextChatId = `chat_${Date.now()}`;
      setCurrentChatId(nextChatId);

      const firstUserMessage = nextMessages.find((m) => m.role === "user")?.text || "New Chat";
      const title =
        firstUserMessage.length > 50 ? `${firstUserMessage.slice(0, 50)}...` : firstUserMessage;

      history.unshift({
        id: nextChatId,
        userId: sessionUserId,
        mode: normalizedMode,
        docId,
        docName,
        title,
        createdAt: now,
        updatedAt: now,
        messages: mappedMessages,
      });
    } else {
      const existing = history[existingIndex];
      existing.mode = normalizedMode;
      existing.docId = docId;
      existing.docName = docName;
      existing.updatedAt = now;
      existing.messages = mappedMessages;

      const updated = history.splice(existingIndex, 1)[0];
      history.unshift(updated);
    }

    window.localStorage.setItem(key, JSON.stringify(history.slice(0, 100)));
  };

  const handleNewChat = async () => {
    if (!requireValidSession()) return;
    // Start a truly fresh chat session across modes.
    // Best-effort: save chat history if there were messages.
    const hadMessages = messages.length > 0;

    if (hadMessages) {
      try {
        const title = (messages.find((m) => m.role === "user")?.text || messages[0]?.text || "")
          .slice(0, 40);

        const historyEntry = {
          id: `chat_${Date.now()}`,
          title,
          mode: currentMode,
          doc_name: uploadedDoc || null,
          messages: messages.map((m) => ({ role: m.role, content: m.text })),
          updated_at: new Date().toISOString(),
        };

        try {
          const key = `history_${userId}`;
          const existing = JSON.parse(window.localStorage.getItem(key) || "[]");
          window.localStorage.setItem(key, JSON.stringify([historyEntry, ...existing].slice(0, 50)));
        } catch {
          // ignore local persistence errors
        }

        await fetch(`${API_BASE}/history/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            mode: currentMode,
            doc_id: null,
            doc_name: uploadedDoc || null,
            messages: messages.map((m) => ({ role: m.role, content: m.text })),
          }),
        });
      } catch {
        // Still reset chat if saving fails (spec)
      }
    }

    setMessages([]);
    setCurrentChatId(null);
    setAgentState(null);
    setActiveDoc(null);
    setActiveHistoryChat(null);
    setUploadedDoc(null);
    if (userId) window.localStorage.removeItem(`uploadedDocName_${userId}`);
    window.sessionStorage.removeItem("activeChunks");
    setCurrentMode("general");
    setActiveView("chat");
    closeSidebar();
    setInput("");
    showToast("success", "New chat started");

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    });
  };

  const setMode = (mode) => {
    // Mode switcher. Does not clear chat.
    if (mode === "document") {
      if (currentMode === "document") return;
      if (!uploadedDoc) {
        setShowUploadModal(true);
        return;
      }
      setCurrentMode("document");
      setActiveView("chat");
      closeSidebar();
      showToast("success", `Document Mode: Using ${uploadedDoc}`);
      return;
    }

    if (mode === "general") {
      setCurrentMode("general");
      setActiveDoc(null);
      setUploadedDoc(null);
      setActiveHistoryChat(null);
      setMessages([]);
      setInput("");
      window.sessionStorage.removeItem("activeChunks");
      if (userId) {
        window.localStorage.removeItem(`uploadedDocName_${userId}`);
      }
      setActiveView("chat");
      closeSidebar();
      showToast("success", "General Mode activated");
      return;
    }

    if (mode === "agent") {
      if (!uploadedDoc) {
        showToast("error", "Upload a PDF first to use Agent Actions");
        return;
      }
      // Agent actions are document-backed and run inside Document Mode chat.
      setCurrentMode("document");
      setActiveView("chat");
      closeSidebar();
      showToast("success", "Agent Actions ready");
      return;
    }

    setCurrentMode(mode);
    closeSidebar();
    setActiveView("chat");

    if (messages.length > 0) {
      const modeText = {
        document: "Document Chat mode activated. Upload a document to get started.",
        general: "General Chat mode activated. Ask me anything!",
        chat: "Chat mode activated.",
        agent: "Agent Actions mode activated. Try: summarize, notes, or explain.",
      };
      addMessage("assistant", modeText[mode] || modeText.chat);
    }
  };

  const onCardClick = (prompt) => {
    sendMessage(prompt);
  };

  const uploadDocument = async (file, options = {}) => {
    const { skipLocalPersist = false } = options;
    if (!requireValidSession()) return { ok: false, error: "Session expired" };
    if (!file) return { ok: false, error: "No file selected" };
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      addMessage("assistant", "Only PDF files are supported right now.");
      return { ok: false, error: "Only PDF files are supported" };
    }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
      const data = await safeJson(res);
      if (!res.ok) {
        addMessage("assistant", data?.detail || "Upload failed.");
        return { ok: false, error: data?.detail || "Upload failed" };
      }

      const name = data?.filename || file.name;
      setUploadedDoc(name);
      window.localStorage.setItem(`uploadedDocName_${userId}`, name);

      if (!skipLocalPersist) {
        // Fallback path for direct uploads without modal pipeline.
        try {
          const key = `docs_${userId}`;
          const existing = JSON.parse(window.localStorage.getItem(key) || "[]");
          const createdAt = new Date().toISOString();
          const docId = `d${Date.now()}`;
          const entry = {
            id: docId,
            name,
            filename: name,
            original_name: file.name,
            size: file.size,
            size_bytes: file.size,
            uploadedAt: createdAt,
            uploaded_at: createdAt,
            chunkCount: Number(data?.chunks || 0),
            pageCount: 1,
            fileRef: `server://${name}`,
          };
          const next = [entry, ...existing.filter((d) => (d.filename || d.name) !== name)].slice(0, 50);
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore localStorage failures
        }
      }

      setCurrentMode("document");
      addMessage(
        "assistant",
        `Document "${name}" uploaded successfully. You can now ask questions about it or use the quick actions above.`
      );
      return { ok: true, filename: name };
    } catch {
      addMessage("assistant", "Upload failed (server error).");
      return { ok: false, error: "Upload failed (server error)" };
    } finally {
      setSending(false);
    }
  };

  const removeDocument = () => {
    setUploadedDoc(null);
    setActiveDoc(null);
    if (userId) window.localStorage.removeItem(`uploadedDocName_${userId}`);
    if (currentMode === "document" || currentMode === "agent") {
      setCurrentMode("general");
      showToast("error", "Document removed, switched to General Mode");
    }
    addMessage("assistant", "Document removed. You can upload a new document to chat about it.");
  };

  const sendMessage = async (overrideText) => {
    if (!requireValidSession()) return;
    const text = String(overrideText ?? input).trim();
    if (!text || sending) return;

    addMessage("user", text);
    if (overrideText == null) {
      setInput("");
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setSending(true);
    try {
      let endpoint = "chat";
      let payload = { question: text };

      if (currentMode === "document") {
        endpoint = "ask";
      } else if (currentMode === "agent") {
        endpoint = "agent";
        payload = { question: text, context: "" };
      } else {
        endpoint = "chat";
      }

      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        const assistantError = {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          text: data?.detail || "Request failed.",
          isStreaming: false,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => {
          const next = [...prev, assistantError];
          saveConversationToHistory(next);
          return next;
        });
        return;
      }

      const assistantMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        text: data?.answer || "I don't know",
        isStreaming: true,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        saveConversationToHistory(next);
        return next;
      });
    } catch {
      const assistantError = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        text: "Server error.",
        isStreaming: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, assistantError];
        saveConversationToHistory(next);
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      {!currentUser ? (
        <LandingPage
          apiBase={API_BASE}
          defaultSettings={DEFAULT_SETTINGS}
          showLogin={showLogin}
          setShowLogin={setShowLogin}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setShowLogin(false);
            showToast("success", `Welcome, ${user.name}`);
          }}
          onToast={showToast}
        />
      ) : (
        <div className="app-container">
          <aside className={`sidebar ${sidebarOpen ? "active" : ""}`} id="sidebar">
            <div className="sidebar-header">
              <NewChatButton
                onClick={handleNewChat}
              />
            </div>

            <nav className="sidebar-nav">
              {NAV_ITEMS.map((item) => {
                const active = item.mode
                    ? item.mode === currentMode && activeView === "chat"
                    : activeView === item.id;
                const isDocumentMode = item.id === "document";
                const title = isDocumentMode && !uploadedDoc ? "Upload a PDF to enter Document Mode" : "";

                return (
                  <button
                    key={item.id}
                    className={`nav-item ${active ? "active" : ""}`}
                    title={title}
                    onClick={() => {
                      if (item.mode) {
                        if (item.id === "document" && !uploadedDoc) {
                          setShowUploadModal(true);
                          closeSidebar();
                          return;
                        }
                        setMode(item.mode);
                        return;
                      }

                      if (item.id === "saved") {
                        setActiveView("saved");
                        closeSidebar();
                        return;
                      }

                      if (item.id === "agent") {
                        setActiveView("agent");
                        closeSidebar();
                        return;
                      }

                      if (item.id === "history") {
                        setActiveView("history");
                        closeSidebar();
                      }
                    }}
                  >
                    {navIconById(item.id)}
                    {item.label}
                    {item.id === "general" && hasUnsavedMessages && activeView !== "chat" ? (
                      <div className="nav-badge-dot" aria-label="unsaved messages" />
                    ) : null}

                    {isDocumentMode && currentMode === "document" && uploadedDoc ? (
                      <span className="nav-pill" title={uploadedDoc}>
                        {uploadedDoc}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <div className="nav-divider"></div>
            </nav>

            <UserProfileSection
              currentUser={currentUser}
              userName={userName}
              userEmail={userEmail}
              userInitials={userInitials}
              onOpenSettings={() => {
                handleSettingsNavClick();
                setSidebarOpen(false);
              }}
              onLogout={() => {
                handleLogout();
              }}
              onToast={showToast}
            />
          </aside>

          <div
            className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
            onClick={closeSidebar}
            id="overlay"
          />

          <main className="main-content">
            <div className="mobile-header">
              <button
                className="hamburger"
                onClick={() => setSidebarOpen((v) => !v)}
                id="hamburger"
                aria-label="Open menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
              <div className="mobile-title">{navModeLabel}</div>
            </div>

            <div className="content-area">
              {activeView === "settings" && (
                <SettingsPage
                  apiBase={API_BASE}
                  userId={userId}
                  uploadedDocName={uploadedDoc}
                  onClose={() => {
                    setActiveView("chat");
                    scrollChatToBottom();
                    focusInputIfMessagesExist();
                  }}
                  onToast={(type, message) => showToast(type, message)}
                  onProfileChanged={(profile) => {
                    try {
                      const next = { name: profile?.name || userName, email: userEmail };
                      window.sessionStorage.setItem("user_cache", JSON.stringify(next));
                    } catch {
                      // ignore
                    }
                    setCurrentUser((prev) => (prev ? { ...prev, name: profile?.name || prev.name } : prev));
                  }}
                />
              )}

              {activeView === "saved" && (
                <SavedDocs
                  onToast={showToast}
                  onUploadClick={() => {
                    setShowUploadModal(true);
                  }}
                  onOpenDoc={(doc) => {
                    const nextName = doc?.filename || doc?.name;
                    if (!nextName) return;
                    setActiveHistoryChat(null);
                    setActiveDoc(doc);
                    setUploadedDoc(nextName);
                    setCurrentMode("document");
                    if (userId) window.localStorage.setItem(`uploadedDocName_${userId}`, nextName);
                    setActiveView("chat");
                    closeSidebar();
                  }}
                  onDocumentDeleted={(doc) => {
                    const deletedName = doc?.filename || doc?.name;
                    if (deletedName && uploadedDoc === deletedName) {
                      setUploadedDoc(null);
                      if (currentMode === "document" || currentMode === "agent") {
                        setCurrentMode("general");
                      }
                    }
                    if (doc?.id && activeDoc?.id === doc.id) {
                      setActiveDoc(null);
                    }
                  }}
                />
              )}

              {activeView === "history" && (
                <History
                  onToast={showToast}
                  onOpenChat={(chatHistory) => {
                    const mode = chatHistory?.mode === "document" ? "document" : "general";

                    setCurrentChatId(chatHistory?.id || null);

                    if (mode === "document") {
                      const doc = {
                        id: chatHistory.docId,
                        name: chatHistory.docName,
                        filename: chatHistory.docName,
                      };

                      if (doc.id) setActiveDoc(doc);
                      setActiveHistoryChat(chatHistory);
                      setUploadedDoc(chatHistory.docName || null);
                      setCurrentMode("document");
                      setMessages([]);
                    } else {
                      setActiveDoc(null);
                      setActiveHistoryChat(null);
                      setUploadedDoc(null);
                      setCurrentMode("general");
                      setMessages(
                        (chatHistory?.messages || []).map((m, idx) => ({
                          id: m.id || `msg_${chatHistory?.id || "history"}_${idx}`,
                          role: m.role,
                          text: m.content || m.text || "",
                          isStreaming: false,
                          timestamp: m.timestamp || new Date().toISOString(),
                        }))
                      );
                    }

                    setActiveView("chat");
                    closeSidebar();
                  }}
                />
              )}

              {activeView === "agent" && (
                <AgentActionsInfo activeDoc={activeDoc} />
              )}

              {showDocContextChat && (
                <ChatWithDoc
                  activeDoc={activeDoc}
                  activeChat={activeHistoryChat}
                  currentMode={currentMode}
                  onToast={showToast}
                />
              )}

              {showEmptyState && (
                <div className="empty-state" id="emptyState">
                  <div className="logo-section">
                    <div className="logo-icon">
                      <IconLayers />
                    </div>
                    <h1 className="welcome-title">Welcome to AI Knowledge Assistant</h1>
                    <p className="welcome-subtitle">Upload files, ask questions, get answers from your documents</p>
                  </div>

                  <div className="cards-grid">
                    {EXAMPLE_CARDS.map((col) => (
                      <div className="card-column" key={col.title}>
                        <div className="card-title">{col.title}</div>
                        {col.cards.map((c) => (
                          <div
                            key={c.text}
                            className="card"
                            onClick={() => onCardClick(c.prompt)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onCardClick(c.prompt);
                            }}
                          >
                            {c.text}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showChat && (
                <div className="chat-container active" id="chatContainer">
                  {messages.map((m, idx) => (
                    <div
                      key={m.id || `${m.role}-${idx}`}
                      className={`message ${m.role === "user" ? "user-message" : "assistant-message"}`}
                    >
                      <div className="message-avatar">{m.role === "user" ? userInitials : "AI"}</div>
                      <div className="message-content">
                        {m.role === "assistant" && m.isStreaming ? (
                          <StreamingText
                            text={m.text}
                            onComplete={() => {
                              setMessages((prev) =>
                                prev.map((item) =>
                                  item.id === m.id ? { ...item, isStreaming: false } : item
                                )
                              );
                            }}
                          />
                        ) : (
                          <MessageRenderer content={m.text} isUser={m.role === "user"} />
                        )}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="message assistant-message">
                      <div className="message-avatar">AI</div>
                      <div className="message-content">Thinking…</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="input-area" style={{ display: activeView === "chat" && !showDocContextChat ? "block" : "none" }}>
              <div className="input-wrapper">
                <div className="doc-chips" id="docChips">
                  {currentMode === "document" && uploadedDoc && (
                    <div className="doc-chip">
                      <IconFile />
                      <span>{uploadedDoc}</span>
                      <button className="doc-chip-close" onClick={removeDocument} title="Remove document">
                        <IconClose />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className="quick-actions"
                  id="quickActions"
                  style={{ display: currentMode === "document" && uploadedDoc ? "flex" : "none" }}
                >
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.id}
                      className="quick-pill"
                      onClick={() => {
                        setInput(a.prompt);
                        requestAnimationFrame(() => {
                          textareaRef.current?.focus();
                          autoResize();
                        });
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                <div className="input-container">
                  <div className="input-actions">
                    <button
                      className="icon-btn"
                      title="Upload document"
                      onClick={() => setShowUploadModal(true)}
                      disabled={sending}
                    >
                      <IconUpload />
                    </button>
                    <button
                      className="icon-btn"
                      title="Voice input"
                      onClick={() => {
                        window.alert("Voice input coming soon! This would use the Web Speech API.");
                      }}
                    >
                      <IconMic />
                    </button>
                  </div>

                  <textarea
                    className="chat-input"
                    id="chatInput"
                    placeholder={inputPlaceholder}
                    rows={1}
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                    }}
                    onInput={autoResize}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />

                  <button
                    className="send-btn"
                    id="sendBtn"
                    disabled={!input.trim() || sending}
                    onClick={sendMessage}
                    title="Send"
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
            </div>

            {showUploadModal && (
              <UploadModal
                onClose={() => setShowUploadModal(false)}
                onToast={showToast}
                onBackendUpload={async (file) => {
                  const result = await uploadDocument(file, { skipLocalPersist: true });
                  if (result?.ok) {
                    setActiveView("chat");
                    closeSidebar();
                  }
                  return result;
                }}
                onUploadComplete={(savedDoc) => {
                  if (!savedDoc) return;
                  setActiveHistoryChat(null);
                  setActiveDoc(savedDoc);
                  setCurrentMode("document");
                  setUploadedDoc(savedDoc.filename || savedDoc.name || null);
                  setActiveView("chat");
                }}
              />
            )}
          </main>
        </div>
      )}
    </>
  );
}