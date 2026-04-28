### 📚 AI Knowledge Assistant – Full-Stack RAG Application

## 🚀 Project Overview

A responsive and feature-rich Full-Stack AI Knowledge Assistant built using React + FastAPI. It includes PDF document upload, Retrieval-Augmented Generation with dual storage, chat with documents, agent mode for summaries/notes, tunable RAG settings, and LLM integration via OpenRouter API.

---

## 🔗 Project Links

- 🔗 **Live Site (Vercel + Render)**: [click here](https://ai-knowledge-assist.vercel.app/)

---

## 📰 Introduction

This AI Knowledge Assistant is a full-stack application that allows users to upload PDF documents and ask questions grounded in their content. Built with React, FastAPI, and OpenRouter LLMs, it implements RAG using two independent systems: backend in-memory Counter vectors and frontend 384-dim embeddings in browser storage. The architecture demonstrates custom RAG mechanics, dual persistence patterns, and deployment on free-tier cloud services while handling Render sleep cycles and browser storage limits.

---

## ✨ Features

- 🔐 User Session Management via localStorage
- 📄 PDF Upload, Text Extraction with PyMuPDF
- 🧠 Dual RAG System: Backend RAM + Frontend localStorage
- 💬 Chat with Documents + General Chat Mode
- 🤖 Agent Mode: Summarize, Notes, Explain via Keywords
- 📊 Tunable RAG Settings: chunk_size, chunk_overlap, top_k
- 🔄 Reprocess Endpoint: Rebuild vectors for existing PDFs
- 📱 Fully Responsive UI Design
- 🌐 CORS-Secured API Communication
- ⚡ OpenRouter LLM Integration: Llama-3.2, Gemma-3, Qwen

---

## ⚙️ Functionalities

| Feature                  | Description                                                  |
|--------------------------|--------------------------------------------------------------|
| PDF Upload               | Drag-drop PDFs. Saved to backend/data/uploads/ on disk. |
| Backend RAG             | /ask endpoint uses _VECTOR_STORE RAM with Counter vectors + cosine similarity.        |
| Frontend RAG           | Document mode uses browser localStorage with 384-dim embeddings for offline Q&A.     |
| Agent Mode          | Detects "summarize", "notes", "explain" keywords to prepend instructions to LLM.           |
| Chat History           | Per-chat JSON files in backend/data/history/ synced to browser localStorage.                   |
| Reprocess           | POST /rag/reprocess loads PDF from disk and rebuilds RAM vectors after restart.        |
| Settings           | Tune chunk_size, chunk_overlap, top_k via /settings endpoint.                   |
| Responsive UI           | Built with React + Tailwind CSS for seamless mobile and desktop experience.       |

---

## 🧰 Tech Stack & Services Used
## 🖥️ Frontend
- React.js 18.2.0
- Vite 5.1.0 – Build Tool
- Tailwind CSS 3.4.1 – UI Styling
- React Router 6.22.0 – Client Routing
- Axios – API Communication
- PDF.js – Client-side PDF parsing

## ⚙️ Backend
- Python 3.11 + FastAPI 0.109.2 – REST API Framework
- Uvicorn 0.27.1 – ASGI Server
- PyMuPDF 1.23.26 – Server-side PDF text extraction
- Python Counter – Token-frequency embeddings
- RESTful APIs – Modular endpoints

## 🤖 LLM Integration
- OpenRouter API – LLM gateway for free models
- Models: meta-llama/llama-3.2-3b-instruct:free primary
- Auth: Bearer token + HTTP-Referer header

## ☁️ Deployment
- Vercel – Frontend React app hosting
- Render Free Tier – Backend FastAPI hosting: 512MB RAM, 1GB disk

---

## 🏗️ Architecture & How It Works

## Dual Storage Architecture

Backend Storage
- PDFs: backend/data/uploads/ – Persists on disk
- Vectors: _VECTOR_STORE = [] in RAM – Lost every 15min on Render sleep
- History: backend/data/history/chat_*.json – Persists on disk

## Frontend Storage
- Docs metadata: localStorage["docs_userId"]
- Chunks + embeddings: localStorage["chunks_docId"] – 384-dim vectors
- Chat cache: localStorage["history_userId"]
- Persists until browser storage cleared

---

## RAG Processing Flow

## Upload Flow:
- User uploads PDF → POST /upload
- Backend: Save to disk → PyMuPDF extract → Chunk 900 chars → Counter vectors → RAM
- Frontend: Parse PDF → 384-dim embeddings → localStorage

## Backend Query Flow /ask:
- Question → _embed() → Counter vector
- Cosine similarity vs all chunks in _VECTOR_STORE
- Top 3 chunks → Build prompt → OpenRouter LLM → Answer

## Frontend Query Flow Document Mode:
- Question → createLocalEmbedding() → 384-dim vector
- Cosine similarity vs localStorage chunks
- Top K chunks → Build prompt → POST /chat → LLM only

---

## 📸 Screenshots

**Final Outputs**
[Click Here] (View Outputs/)

---

## 👤 Author

**NEDULLA VIGHNESH**  
- GitHub: [2200032267](https://github.com/2200032267)  
- LinkedIn: [N VIGHNESH](https://www.linkedin.com/in/n-vighnesh-5b74aa24a)  
- Email:vighneshnv2@gmail.com
---
## ⭐ Star This Repository

If you find this project useful or interesting, please ⭐ star this repository to support and encourage further development!  
Your support means a lot! 🙏

---

