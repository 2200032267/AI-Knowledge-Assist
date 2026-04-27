import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Send } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { createLocalEmbedding } from "../localEmbedding";
import AgentActionsBar from "../components/AgentActionsBar";
import MessageRenderer from "../components/MessageRenderer";
import StreamingText from "../components/StreamingText";
import "./ChatWithDoc.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function cosineSimilarity(vecA, vecB) {
  const len = Math.min(vecA?.length || 0, vecB?.length || 0);
  if (!len) return -1;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    const a = Number(vecA[i] || 0);
    const b = Number(vecB[i] || 0);
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (!normA || !normB) return -1;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedQuery(queryText) {
  const text = String(queryText || "").trim();
  if (!text) return [];
  return createLocalEmbedding(text);
}

function retrieveTopK(queryEmbedding, chunks, k = 3, threshold = 0.7) {
  const scored = chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding || createLocalEmbedding(chunk.text || "")),
    }))
    .filter((chunk) => Number.isFinite(chunk.score))
    .sort((a, b) => b.score - a.score);

  const thresholded = scored
    .filter((chunk) => Number.isFinite(chunk.score) && chunk.score >= threshold)
    .slice(0, k);

  // Fallback for older random embeddings or strict thresholds: return best matches anyway.
  if (thresholded.length === 0) {
    return scored.slice(0, k);
  }

  return thresholded;
}

function buildRagPrompt(query, retrievedChunks, template) {
  const fallbackTemplate =
    "Context:\n{context}\n\nQuestion: {question}\n\nInstructions: Answer using only the context. If missing, say the document does not contain it.";

  const context = retrievedChunks
    .map((chunk, idx) => `[Source ${idx + 1}, Page ${chunk.pageNum || 1}]: ${chunk.text}`)
    .join("\n\n");

  if (!template || !template.includes("{context}") || !template.includes("{question}")) {
    return fallbackTemplate.replace("{context}", context).replace("{question}", query);
  }

  return template.replace("{context}", context).replace("{question}", query);
}

async function callDocumentLlm(prompt) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: prompt }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.detail || "LLM request failed");
  }

  return String(data?.answer || "").trim();
}

export default function ChatWithDoc({ activeDoc, activeChat, currentMode, onToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chunks, setChunks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showAgentBar, setShowAgentBar] = useState(false);

  useEffect(() => {
    if (!activeDoc?.id) {
      setChunks([]);
      return;
    }

    try {
      const loaded = JSON.parse(window.localStorage.getItem(`chunks_${activeDoc.id}`) || "[]");
      setChunks(Array.isArray(loaded) ? loaded : []);
    } catch {
      setChunks([]);
    }

    setMessages([]);
    setShowAgentBar(false);
  }, [activeDoc]);

  useEffect(() => {
    if (!activeChat || !Array.isArray(activeChat.messages)) return;
    setMessages(activeChat.messages.map((m) => ({ ...m, isStreaming: false })));
  }, [activeChat]);

  const chunkCountText = useMemo(() => {
    return `${chunks.length} chunks loaded`;
  }, [chunks.length]);

  const isDocumentMode = currentMode === "document" && Boolean(activeDoc);

  const saveToHistory = (doc, newMessages) => {
    const userId = window.sessionStorage.getItem("session");
    if (!userId || !doc?.id || !newMessages?.length) return;

    const key = `history_${userId}`;
    const history = JSON.parse(window.localStorage.getItem(key) || "[]");
    const chatId = `chat_${doc.id}`;
    const chatIndex = history.findIndex((h) => h.id === chatId);
    const now = new Date().toISOString();

    if (chatIndex === -1) {
      const firstQuestion = newMessages.find((m) => m.role === "user")?.content || "New conversation";
      const title = firstQuestion.length > 50 ? `${firstQuestion.slice(0, 50)}...` : firstQuestion;

      const newChat = {
        id: chatId,
        userId,
        docId: doc.id,
        docName: doc.name || doc.filename || "Document",
        title,
        createdAt: now,
        updatedAt: now,
        messages: newMessages.map((m, idx) => ({
          id: m.id || `msg_${Date.now()}_${idx}`,
          role: m.role,
          content: m.content,
          sources: m.sources || [],
          isStreaming: false,
          timestamp: m.timestamp || now,
        })),
      };

      history.unshift(newChat);
    } else {
      const existing = history[chatIndex];
      existing.messages = newMessages.map((m, idx) => ({
        id: m.id || `msg_${Date.now()}_${idx}`,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        isStreaming: false,
        timestamp: m.timestamp || now,
      }));
      existing.updatedAt = now;

      const updated = history.splice(chatIndex, 1)[0];
      history.unshift(updated);
    }

    window.localStorage.setItem(key, JSON.stringify(history.slice(0, 100)));
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isLoading || isStreaming) return;

    if (!chunks.length) {
      onToast?.("error", "No document chunks found for this file");
      return;
    }

    const userId = window.sessionStorage.getItem("session");
    const settings = JSON.parse(window.localStorage.getItem(`settings_${userId}`) || "{}");
    const topK = settings?.rag?.top_k || 3;
    const threshold = settings?.rag?.similarity_threshold ?? 0.7;

    const userMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const queryEmbedding = await embedQuery(query);
      const relevantChunks = retrieveTopK(queryEmbedding, chunks, topK, threshold);

      if (!relevantChunks.length) {
        const assistantMessage = {
          id: `msg_${Date.now()}_a`,
          role: "assistant",
          content: "I do not find this information in the selected document.",
          sources: [],
          isStreaming: true,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => {
          const next = [...prev, assistantMessage];
          saveToHistory(activeDoc, next);
          return next;
        });
        return;
      }

      const prompt = buildRagPrompt(query, relevantChunks, settings?.llm?.system_prompt);
      const llmAnswer = await callDocumentLlm(prompt);
      const answer = llmAnswer || "I could not generate a response from the model.";

      const assistantMessage = {
        id: `msg_${Date.now()}_a`,
        role: "assistant",
        content: answer,
        prompt,
        isStreaming: true,
        sources: relevantChunks.map((chunk) => ({
          page: chunk.pageNum || 1,
          score: Number(chunk.score || 0).toFixed(2),
          text: `${String(chunk.text || "").slice(0, 100)}...`,
        })),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        saveToHistory(activeDoc, next);
        return next;
      });
    } catch {
      onToast?.("error", "Failed to get answer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="doc-chat-wrap">
      <div className="doc-chat-header">
        <div className="doc-chat-header-content">
          <div className="doc-chat-title-wrap">
            <FileText size={18} />
            <div>
              <p className="doc-chat-title">{activeDoc?.name || "Document"}</p>
              <p className="doc-chat-subtitle">{chunkCountText}</p>
            </div>
          </div>

          {isDocumentMode ? (
            <button
              onClick={() => setShowAgentBar((prev) => !prev)}
              className={`doc-chat-toggle ${showAgentBar ? "on" : "off"}`}
            >
              <Sparkles size={14} />
              {showAgentBar ? "Agent Actions On" : "Agent Actions Off"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="doc-chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={msg.id || `${msg.role}-${idx}`}
            className={`doc-chat-message-row ${msg.role === "user" ? "user" : "assistant"}`}
          >
            <div className={`doc-chat-message-bubble ${msg.role === "user" ? "user" : "assistant"}`}>
              {msg.isAgent ? <div className="doc-chat-agent-tag">Agent Action</div> : null}
              {msg.role === "assistant" && msg.isStreaming ? (
                <StreamingText
                  text={msg.content}
                  onComplete={() => {
                    setMessages((prev) =>
                      prev.map((m) => (m.id === msg.id ? { ...m, isStreaming: false } : m))
                    );
                  }}
                />
              ) : (
                <MessageRenderer content={msg.content} isUser={msg.role === "user"} />
              )}
              {msg.sources ? (
                <div className="doc-chat-sources">
                  Sources: {msg.sources.map((s) => `Page ${s.page} (${s.score})`).join(", ")}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {isLoading || isStreaming ? (
          <div className="doc-chat-loading">
            <Loader2 size={20} className="spin" />
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {isDocumentMode && showAgentBar ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <AgentActionsBar
              activeDoc={activeDoc}
              currentMode={currentMode}
              onToast={onToast}
              onRunAgent={async (action) => {
                if (!activeDoc?.id) {
                  onToast?.("error", "No active document selected");
                  return;
                }

                const loadedChunks = JSON.parse(window.localStorage.getItem(`chunks_${activeDoc.id}`) || "[]");
                const fullText = loadedChunks.map((c) => c.text).join("\n\n").trim();

                if (!fullText) {
                  onToast?.("error", "No text found in document");
                  return;
                }

                setIsStreaming(true);
                const now = new Date().toISOString();
                const userMsg = {
                  id: `msg_${Date.now()}_agent_u`,
                  role: "user",
                  content: `Run: ${action.label}`,
                  isAgent: true,
                  timestamp: now,
                };

                setMessages((prev) => [...prev, userMsg]);

                try {
                  const prompt = String(action.prompt || "").replace("{text}", fullText.slice(0, 8000));
                  const answer = await callDocumentLlm(prompt);

                  const assistantMsg = {
                    id: `msg_${Date.now()}_agent_a`,
                    role: "assistant",
                    content: answer || `No response generated for ${action.label}.`,
                    isAgent: true,
                    actionId: action.id,
                    isStreaming: true,
                    timestamp: new Date().toISOString(),
                  };

                  setMessages((prev) => {
                    const next = [...prev, assistantMsg];
                    saveToHistory(activeDoc, next);
                    return next;
                  });
                } catch {
                  onToast?.("error", "Agent failed");
                } finally {
                  setIsStreaming(false);
                }
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="doc-chat-input-wrap">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask about this document..."
          className="doc-chat-input"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || isStreaming || !input.trim()}
          className="doc-chat-send-btn"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
