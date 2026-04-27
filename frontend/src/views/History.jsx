import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, Globe, MessageSquare, Trash2 } from "lucide-react";
import "./History.css";

function normalizeHistoryItem(item) {
  if (!item || typeof item !== "object") return null;

  const rawMode = String(item.mode || "").toLowerCase();
  const docName = item.docName || item.doc_name || null;
  const inferredMode = rawMode === "document" || item.docId || item.doc_id || docName ? "document" : "general";

  return {
    id: item.id,
    userId: item.userId || item.user_id || "",
    docId: item.docId || item.doc_id || "",
    docName,
    mode: inferredMode,
    title: item.title || "Untitled conversation",
    createdAt: item.createdAt || item.created_at || item.updatedAt || item.updated_at,
    updatedAt: item.updatedAt || item.updated_at || item.createdAt || item.created_at,
    messages: Array.isArray(item.messages) ? item.messages : [],
  };
}

function formatDate(isoString) {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function History({ onOpenChat, onToast }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const userId = window.sessionStorage.getItem("session");
    if (!userId) {
      setHistory([]);
      return;
    }

    try {
      const raw = JSON.parse(window.localStorage.getItem(`history_${userId}`) || "[]");
      const normalized = raw.map(normalizeHistoryItem).filter(Boolean);
      normalized.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setHistory(normalized);
    } catch {
      setHistory([]);
    }
  }, []);

  const hasItems = useMemo(() => history.length > 0, [history.length]);

  const handleDeleteChat = (chatId) => {
    if (!window.confirm("Delete this conversation?")) return;

    const userId = window.sessionStorage.getItem("session");
    if (!userId) return;

    const updated = history.filter((h) => h.id !== chatId);
    window.localStorage.setItem(`history_${userId}`, JSON.stringify(updated));
    setHistory(updated);
    onToast?.("success", "Chat deleted");
  };

  const handleClearAll = () => {
    if (!window.confirm("Clear all chat history? This cannot be undone.")) return;

    const userId = window.sessionStorage.getItem("session");
    if (!userId) return;

    window.localStorage.removeItem(`history_${userId}`);
    setHistory([]);
    onToast?.("success", "History cleared");
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Chat History</h1>
        {hasItems ? (
          <button className="history-clear-all" onClick={handleClearAll}>
            Clear All
          </button>
        ) : null}
      </div>

      {!hasItems ? (
        <div className="history-empty">
          <MessageSquare size={48} />
          <h3>No chat history yet</h3>
          <p>Start a conversation to see it here.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((chat) => (
            <button
              key={chat.id}
              className="history-item"
              onClick={() => onOpenChat?.(chat)}
            >
              <div className="history-item-icon-wrap">
                <MessageSquare size={20} />
              </div>

              <div className="history-item-meta">
                <h3>{chat.title}</h3>
                <div className="history-item-subline">
                  <span>
                    {chat.mode === "document" && chat.docName ? (
                      <>
                        <FileText size={12} />
                        {chat.docName}
                      </>
                    ) : (
                      <>
                        <Globe size={12} />
                        General Chat
                      </>
                    )}
                  </span>
                  <span>•</span>
                  <span>
                    <Clock size={12} />
                    {formatDate(chat.updatedAt)}
                  </span>
                  <span>•</span>
                  <span>{chat.messages.length} messages</span>
                </div>
              </div>

              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }
                }}
                className="history-item-delete"
                title="Delete chat"
              >
                <Trash2 size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
