import { useRef, useState } from "react";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createLocalEmbedding } from "../localEmbedding";
import "./UploadModal.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

function getUserSettings() {
  const userId = window.sessionStorage.getItem("session");
  return JSON.parse(window.localStorage.getItem(`settings_${userId}`) || "{}");
}

function chunkText(pageTexts, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let globalWordIndex = 0;

  pageTexts.forEach(({ pageNum, text }) => {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkWords = words.slice(start, end);

      chunks.push({
        id: `chunk_${Date.now()}_${chunks.length}`,
        text: chunkWords.join(" "),
        pageNum,
        startWord: globalWordIndex + start,
        endWord: globalWordIndex + end,
        wordCount: chunkWords.length,
      });

      if (end >= words.length) break;
      start = Math.max(0, end - overlap);
    }

    globalWordIndex += words.length;
  });

  return chunks;
}

async function parsePDF(file, onProgress, onStatus) {
  onStatus?.("Reading PDF...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pageTexts.push({ pageNum: i, text: pageText });
    onProgress?.(Math.round((i / pdf.numPages) * 40));
  }

  return { pageTexts, pageCount: pdf.numPages };
}

async function generateEmbeddings(chunks, onProgress, onStatus) {
  onStatus?.("Generating embeddings...");
  onProgress?.(50);

  const total = Math.max(chunks.length, 1);
  return chunks.map((chunk, idx) => {
    onProgress?.(50 + Math.round((idx / total) * 40));
    return {
      ...chunk,
      // Deterministic local embedding so query/chunk similarity is meaningful offline.
      embedding: createLocalEmbedding(chunk.text),
    };
  });
}

function saveDocumentToStorage(file, chunksWithEmbeddings, pageCount, filenameOverride) {
  const userId = window.sessionStorage.getItem("session");
  if (!userId) throw new Error("No user session");

  const docId = `d${Date.now()}`;
  const docName = filenameOverride || file.name;
  const uploadedAt = new Date().toISOString();

  const newDoc = {
    id: docId,
    name: docName,
    filename: docName,
    original_name: file.name,
    size: file.size,
    size_bytes: file.size,
    uploadedAt,
    uploaded_at: uploadedAt,
    chunkCount: chunksWithEmbeddings.length,
    pageCount,
    fileRef: `server://${docName}`,
    userId,
  };

  const key = `docs_${userId}`;
  const existingDocs = JSON.parse(window.localStorage.getItem(key) || "[]");
  const nextDocs = [newDoc, ...existingDocs.filter((d) => (d.filename || d.name) !== docName)].slice(0, 50);

  window.localStorage.setItem(key, JSON.stringify(nextDocs));
  window.localStorage.setItem(`chunks_${docId}`, JSON.stringify(chunksWithEmbeddings));

  return newDoc;
}

function rollbackSavedDoc(savedDoc) {
  if (!savedDoc?.id) return;
  const userId = window.sessionStorage.getItem("session");
  if (!userId) return;

  const key = `docs_${userId}`;
  const existingDocs = JSON.parse(window.localStorage.getItem(key) || "[]");
  window.localStorage.setItem(key, JSON.stringify(existingDocs.filter((d) => d.id !== savedDoc.id)));
  window.localStorage.removeItem(`chunks_${savedDoc.id}`);
}

export default function UploadModal({ onClose, onBackendUpload, onUploadComplete, onToast }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      onToast?.("error", "Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onToast?.("error", "File too large. Max 10MB");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusText("");

    let savedDoc = null;

    try {
      const settings = getUserSettings();
      const chunkSize = settings?.rag?.chunk_size || 500;
      const overlap = settings?.rag?.chunk_overlap || 50;

      const { pageTexts, pageCount } = await parsePDF(file, setProgress, setStatusText);
      if (pageTexts.every((p) => String(p.text || "").trim().length === 0)) {
        throw new Error("PDF appears to be scanned images. OCR is not supported yet.");
      }

      setStatusText("Chunking text...");
      const chunks = chunkText(pageTexts, chunkSize, overlap);
      if (chunks.length === 0) {
        throw new Error("No text found in PDF");
      }

      const chunksWithEmbeddings = await generateEmbeddings(chunks, setProgress, setStatusText);

      setStatusText("Uploading to RAG backend...");
      const uploadResult = await onBackendUpload?.(file);
      if (!uploadResult?.ok) {
        throw new Error(uploadResult?.error || "Backend upload failed");
      }

      setStatusText("Saving document...");
      setProgress(95);
      savedDoc = saveDocumentToStorage(file, chunksWithEmbeddings, pageCount, uploadResult.filename);

      setProgress(100);
      onToast?.("success", `Uploaded ${savedDoc.name} • ${chunks.length} chunks created`);
      onUploadComplete?.(savedDoc);
      onClose?.();
    } catch (err) {
      rollbackSavedDoc(savedDoc);
      onToast?.("error", `Upload failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatusText("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <div className="upload-modal-overlay" role="dialog" aria-modal="true">
      <div className="upload-modal-card">
        <div className="upload-modal-header">
          <h2>Upload PDF</h2>
          <button onClick={onClose} className="upload-modal-close" disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="upload-dropzone"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") fileInputRef.current?.click();
          }}
        >
          <Upload size={40} />
          <p>{file ? file.name : "Click to upload or drag and drop"}</p>
          <small>PDF up to 10MB {file ? `• ${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}</small>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden-input"
          />
        </div>

        {file && !isProcessing ? (
          <div className="upload-file-info">
            <span className="upload-file-name">{file.name}</span>
            <button
              className="upload-file-clear"
              onClick={() => setFile(null)}
              aria-label="Remove selected file"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        {isProcessing ? (
          <div className="upload-progress-wrap">
            <div className="upload-progress-top">
              <span>{statusText || "Processing..."}</span>
              <span>{progress}%</span>
            </div>
            <div className="upload-progress-track">
              <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="upload-warning">
          <AlertCircle size={14} />
          <p>Files are processed locally. Chunking uses your RAG settings for chunk size and overlap.</p>
        </div>

        <div className="upload-modal-actions">
          <button onClick={onClose} disabled={isProcessing} className="upload-btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="upload-btn-primary"
          >
            {isProcessing ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
            {isProcessing ? "Processing" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
