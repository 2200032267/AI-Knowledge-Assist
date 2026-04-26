import { useState, useRef, useEffect } from "react";
import { Upload, Send, FileText, MessageSquare, Bot, Sparkles, Loader as Loader2, X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Trash2, Plus, BookOpen, Zap } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./App.css";

const API = "http://127.0.0.1:8000";

const MODES = [
  { id: "document", label: "Document Q&A", icon: FileText, description: "Ask questions about your uploaded PDF" },
  { id: "general", label: "General Chat", icon: MessageSquare, description: "Chat with the AI assistant" },
  { id: "agent", label: "Smart Actions", icon: Zap, description: "Summarize, generate notes, or explain" },
];

const AGENT_HINTS = ["summarize", "notes", "explain"];

export default function App() {
  const [mode, setMode] = useState("document");
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
    checkDocumentStatus();
  }, []);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setSessions(data);
  };

  const loadMessages = async (sessionId) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const checkDocumentStatus = async () => {
    try {
      const res = await fetch(`${API}/health`);
      const data = await res.json();
      setDocLoaded(data.documents_loaded);
    } catch {
      setDocLoaded(false);
    }
  };

  const createSession = async (newMode) => {
    const { data } = await supabase
      .from("chat_sessions")
      .insert({ mode: newMode, title: "New Chat" })
      .select()
      .single();
    if (data) {
      setSessions((prev) => [data, ...prev]);
      setActiveSession(data);
      setMessages([]);
      return data;
    }
    return null;
  };

  const deleteSession = async (sessionId) => {
    await supabase.from("chat_messages").delete().eq("session_id", sessionId);
    await supabase.from("chat_sessions").delete().eq("id", sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
      setMessages([]);
    }
  };

  const selectSession = (session) => {
    setActiveSession(session);
    setMode(session.mode);
    loadMessages(session.id);
  };

  const saveMessage = async (sessionId, role, content) => {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role,
      content,
    });
  };

  const updateSessionTitle = async (sessionId, title) => {
    await supabase
      .from("chat_sessions")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ type: "loading", message: "Uploading and processing PDF..." });

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok) {
        setUploadStatus({ type: "success", message: `Uploaded "${file.name}" — ${data.chunks} chunks processed` });
        setDocLoaded(true);

        await supabase.from("uploaded_documents").insert({
          filename: file.name,
          chunk_count: data.chunks,
        });
      } else {
        setUploadStatus({ type: "error", message: data.detail || "Upload failed" });
      }
    } catch {
      setUploadStatus({ type: "error", message: "Could not connect to server" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 5000);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    let session = activeSession;
    if (!session) {
      session = await createSession(mode);
      if (!session) return;
    }

    const userMsg = { id: Date.now(), session_id: session.id, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    saveMessage(session.id, "user", text);

    if (messages.length === 0) {
      const title = text.length > 40 ? text.slice(0, 40) + "..." : text;
      updateSessionTitle(session.id, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, title } : s))
      );
    }

    try {
      let res;
      if (mode === "document") {
        res = await fetch(`${API}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
      } else if (mode === "general") {
        res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
      } else {
        res = await fetch(`${API}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
      }

      const data = await res.json();
      const assistantContent = data.answer || "No response received.";

      const assistantMsg = {
        id: Date.now() + 1,
        session_id: session.id,
        role: "assistant",
        content: assistantContent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      saveMessage(session.id, "assistant", assistantContent);
    } catch {
      const errorMsg = {
        id: Date.now() + 1,
        session_id: session.id,
        role: "assistant",
        content: "Could not connect to the server. Make sure the backend is running.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setActiveSession(null);
    setMessages([]);
  };

  const currentModeConfig = MODES.find((m) => m.id === mode);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Bot size={22} />
            <span>Knowledge AI</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <button
          className="new-chat-btn"
          onClick={() => {
            setActiveSession(null);
            setMessages([]);
          }}
        >
          <Plus size={18} />
          New Chat
        </button>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Chat History</h3>
          <div className="session-list">
            {sessions.length === 0 && (
              <p className="no-sessions">No conversations yet</p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${activeSession?.id === session.id ? "active" : ""}`}
                onClick={() => selectSession(session)}
              >
                <div className="session-item-content">
                  <span className="session-mode-badge">{session.mode}</span>
                  <span className="session-title">{session.title}</span>
                </div>
                <button
                  className="session-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <button
            className="sidebar-open-btn"
            onClick={() => setSidebarOpen(true)}
            style={{ display: sidebarOpen ? "none" : "flex" }}
          >
            <BookOpen size={18} />
          </button>

          <div className="mode-switcher">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  className={`mode-btn ${mode === m.id ? "active" : ""}`}
                  onClick={() => switchMode(m.id)}
                >
                  <Icon size={16} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              className="file-input-hidden"
            />
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              <span>Upload PDF</span>
            </button>
            {docLoaded && (
              <span className="doc-status loaded">
                <CheckCircle size={14} />
                Doc loaded
              </span>
            )}
          </div>
        </header>

        {/* Upload Status Toast */}
        {uploadStatus && (
          <div className={`toast toast-${uploadStatus.type}`}>
            {uploadStatus.type === "loading" && <Loader2 size={16} className="spin" />}
            {uploadStatus.type === "success" && <CheckCircle size={16} />}
            {uploadStatus.type === "error" && <AlertCircle size={16} />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Chat Area */}
        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {mode === "document" && <FileText size={40} />}
                {mode === "general" && <MessageSquare size={40} />}
                {mode === "agent" && <Sparkles size={40} />}
              </div>
              <h2 className="empty-title">{currentModeConfig?.label}</h2>
              <p className="empty-description">{currentModeConfig?.description}</p>

              {mode === "document" && !docLoaded && (
                <div className="empty-action">
                  <button
                    className="action-btn primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={18} />
                    Upload a PDF to get started
                  </button>
                </div>
              )}

              {mode === "agent" && (
                <div className="agent-hints">
                  {AGENT_HINTS.map((hint) => (
                    <button
                      key={hint}
                      className="hint-chip"
                      onClick={() => setInput(`${hint} `)}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}

              {mode === "document" && docLoaded && (
                <div className="agent-hints">
                  {["What is this document about?", "Summarize the key points", "Explain the main concepts"].map(
                    (hint) => (
                      <button
                        key={hint}
                        className="hint-chip"
                        onClick={() => setInput(hint)}
                      >
                        {hint}
                      </button>
                    )
                  )}
                </div>
              )}

              {mode === "general" && (
                <div className="agent-hints">
                  {["Tell me about RAG systems", "Explain vector embeddings", "How does retrieval-augmented generation work?"].map(
                    (hint) => (
                      <button
                        key={hint}
                        className="hint-chip"
                        onClick={() => setInput(hint)}
                      >
                        {hint}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === "user" ? (
                      <div className="avatar user-avatar">U</div>
                    ) : (
                      <div className="avatar ai-avatar">
                        <Bot size={16} />
                      </div>
                    )}
                  </div>
                  <div className="message-body">
                    <div className="message-role">{msg.role === "user" ? "You" : "AI Assistant"}</div>
                    <div className="message-content">
                      {msg.content.split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < msg.content.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message message-assistant">
                  <div className="message-avatar">
                    <div className="avatar ai-avatar">
                      <Bot size={16} />
                    </div>
                  </div>
                  <div className="message-body">
                    <div className="message-role">AI Assistant</div>
                    <div className="message-content typing">
                      <Loader2 size={16} className="spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "document"
                  ? "Ask a question about your document..."
                  : mode === "general"
                  ? "Ask me anything..."
                  : "Try: summarize, notes, or explain..."
              }
              rows={1}
              className="chat-input"
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="input-hint">
            {mode === "document" && !docLoaded && "Upload a PDF first to enable document Q&A"}
            {mode === "document" && docLoaded && "Answers are based on your uploaded document context"}
            {mode === "general" && "General chat mode — no document context needed"}
            {mode === "agent" && "Use keywords: summarize, notes, or explain for smart actions"}
          </p>
        </div>
      </main>
    </div>
  );
}
