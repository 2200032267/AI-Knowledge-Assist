import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Search, Trash2, Upload } from "lucide-react";
import "./SavedDocs.css";

function normalizeDoc(doc) {
  if (!doc || typeof doc !== "object") return null;

  const name = doc.name || doc.original_name || doc.filename || "Untitled.pdf";
  const size = Number(doc.size || doc.size_bytes || 0);
  const uploadedAt = doc.uploadedAt || doc.uploaded_at || new Date().toISOString();
  const chunkCount = Number(doc.chunkCount || doc.chunks || 0);

  return {
    id: doc.id || `d_${name}_${uploadedAt}`,
    name,
    size,
    uploadedAt,
    chunkCount,
    pageCount: Number(doc.pageCount || 1),
    fileRef: doc.fileRef || "",
    filename: doc.filename || name,
  };
}

function formatSize(bytes) {
  const safe = Number(bytes || 0);
  if (safe < 1024) return `${safe} B`;
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(1)} KB`;
  return `${(safe / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hours ago`;
  if (hours < 48) return "Yesterday";
  return date.toLocaleDateString();
}

export default function SavedDocs({ onOpenDoc, onUploadClick, onToast, onDocumentDeleted }) {
  const [docs, setDocs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const getUserId = () => window.sessionStorage.getItem("session");

  useEffect(() => {
    const loadDocs = () => {
      const userId = getUserId();
      if (!userId) {
        onToast?.("error", "Please log in to view documents");
        setDocs([]);
        setIsLoading(false);
        return;
      }

      try {
        const raw = JSON.parse(window.localStorage.getItem(`docs_${userId}`) || "[]");
        const normalized = raw.map(normalizeDoc).filter(Boolean);
        setDocs(normalized);
      } catch {
        setDocs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocs();
  }, [onToast]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((doc) => doc.name.toLowerCase().includes(q));
  }, [docs, searchQuery]);

  const totalMbUsed = useMemo(() => {
    const bytes = docs.reduce((sum, d) => sum + Number(d.size || 0), 0);
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [docs]);

  const handleDelete = (docId) => {
    if (!window.confirm("Delete this document? This will remove all chunks and chat history.")) return;

    const userId = getUserId();
    if (!userId) return;

    const deletedDoc = docs.find((d) => d.id === docId);
    const updatedDocs = docs.filter((d) => d.id !== docId);

    window.localStorage.setItem(`docs_${userId}`, JSON.stringify(updatedDocs));
    setDocs(updatedDocs);

    if (deletedDoc?.id) {
      window.localStorage.removeItem(`chunks_${deletedDoc.id}`);
    }

    onDocumentDeleted?.(deletedDoc);
    onToast?.("success", "Document deleted");
  };

  const handleDownload = () => {
    onToast?.("success", "Download coming soon");
  };

  const handleOpen = (doc) => {
    onOpenDoc?.(doc);
    onToast?.("success", `Opened ${doc.name}`);
  };

  if (isLoading) {
    return (
      <div className="saved-docs-page">
        <div className="saved-docs-skeleton">
          <div className="saved-docs-skeleton-line short" />
          <div className="saved-docs-skeleton-line" />
        </div>
      </div>
    );
  }

  return (
    <div className="saved-docs-page">
      <div className="saved-docs-header">
        <h1>Saved Documents</h1>
        <button className="saved-docs-upload-btn" onClick={onUploadClick}>
          <Upload size={18} />
          Upload PDF
        </button>
      </div>

      {docs.length > 0 ? (
        <div className="saved-docs-search-wrap">
          <Search size={18} className="saved-docs-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="saved-docs-search-input"
          />
        </div>
      ) : null}

      {filteredDocs.length === 0 ? (
        <div className="saved-docs-empty">
          <FileText size={48} />
          <h3>{searchQuery ? "No documents found" : "No documents yet"}</h3>
          <p>{searchQuery ? "Try a different search term" : "Upload your first PDF to start"}</p>
          {!searchQuery ? (
            <button className="saved-docs-upload-empty" onClick={onUploadClick}>
              Upload PDF
            </button>
          ) : null}
        </div>
      ) : (
        <div className="saved-docs-list">
          {filteredDocs.map((doc) => (
            <div className="saved-doc-item" key={doc.id}>
              <div className="saved-doc-main">
                <div className="saved-doc-icon-wrap">
                  <FileText size={20} />
                </div>

                <div className="saved-doc-meta">
                  <h3>{doc.name}</h3>
                  <div className="saved-doc-subline">
                    <span>{formatSize(doc.size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                    <span>•</span>
                    <span>{doc.chunkCount} chunks</span>
                  </div>
                </div>
              </div>

              <div className="saved-doc-actions">
                <button onClick={() => handleOpen(doc)} title="Open in Chat">
                  <Eye size={18} />
                </button>
                <button onClick={handleDownload} title="Download">
                  <Download size={18} />
                </button>
                <button onClick={() => handleDelete(doc.id)} title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 ? (
        <div className="saved-docs-footer">
          Total: {docs.length} document{docs.length !== 1 ? "s" : ""} • {totalMbUsed} MB used
        </div>
      ) : null}
    </div>
  );
}
