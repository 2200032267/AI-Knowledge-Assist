from pathlib import Path

import json
import time

from fastapi import Body, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .agent import agent_action
    from .llm import apply_llm_settings, call_llm, get_rag_prompt_template
    from .rag import build_prompt, get_rag_config, has_documents, process_pdf, retrieve_context, set_rag_config
    from .utils import ensure_dir
except ImportError:  # Allows running from inside backend/: `uvicorn main:app --reload`
    from agent import agent_action
    from llm import apply_llm_settings, call_llm, get_rag_prompt_template
    from rag import build_prompt, get_rag_config, has_documents, process_pdf, retrieve_context, set_rag_config
    from utils import ensure_dir

app = FastAPI(title="AI Knowledge Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent / "data" / "uploads"
ensure_dir(UPLOAD_DIR)

HISTORY_DIR = Path(__file__).resolve().parent / "data" / "history"
ensure_dir(HISTORY_DIR)


class Question(BaseModel):
    question: str


class AgentRequest(BaseModel):
    question: str
    context: str = ""


class HistoryMessage(BaseModel):
    role: str
    content: str


class HistorySaveRequest(BaseModel):
    title: str = ""
    mode: str = "chat"
    doc_id: str | None = None
    doc_name: str | None = None
    messages: list[HistoryMessage] = []


class RagReprocessRequest(BaseModel):
    user_id: str | None = None
    filename: str | None = None
    chunk_size: int = 900
    chunk_overlap: int = 120
    top_k: int = 3


class AuthRequest(BaseModel):
    name: str | None = None
    email: str
    password: str


@app.get("/health")
async def health():
    return {"status": "ok", "documents_loaded": has_documents()}


@app.get("/")
async def root():
    return {
        "name": "AI Knowledge Assistant",
        "status": "ok",
        "docs": "/docs",
        "documents_loaded": has_documents(),
    }


@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    safe_name = Path(file.filename).name
    file_path = UPLOAD_DIR / safe_name
    file_path.write_bytes(await file.read())
    chunks = process_pdf(file_path)
    return {"message": "Uploaded successfully", "filename": safe_name, "chunks": chunks}


@app.post("/ask")
async def ask(q: Question):
    if not has_documents():
        return {"answer": "Please upload a PDF document first before asking questions."}

    context = retrieve_context(q.question)

    agent_resp = agent_action(q.question, context)
    if agent_resp:
        return {"answer": agent_resp, "source": "agent"}

    prompt_template = get_rag_prompt_template()
    prompt = build_prompt(context, q.question, template=prompt_template)
    return {"answer": call_llm(prompt), "source": "rag"}


@app.post("/chat")
async def chat(q: Question):
    return {"answer": call_llm(q.question), "source": "general"}


@app.post("/auth/signup")
async def auth_signup(req: AuthRequest):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    return {
        "status": "ok",
        "message": "Signup request received",
        "user": {
            "name": (req.name or "").strip(),
            "email": email,
        },
    }


@app.post("/auth/login")
async def auth_login(req: AuthRequest):
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    return {
        "status": "ok",
        "message": "Login request received",
        "user": {
            "email": email,
        },
    }


@app.post("/agent")
async def agent(req: AgentRequest):
    context = req.context if req.context else ""
    if has_documents() and not context:
        context = retrieve_context(req.question)

    result = agent_action(req.question, context)
    if result:
        return {"answer": result, "source": "agent"}

    return {"answer": "No matching agent action found. Try: summarize, notes, or explain.", "source": "agent"}


@app.post("/history/save")
async def save_history(req: HistorySaveRequest):
    # Only save if there were messages
    if not req.messages:
        return {"status": "skipped"}

    chat_id = f"chat_{int(time.time())}"
    payload = {
        "id": chat_id,
        "title": req.title,
        "mode": req.mode,
        "doc_id": req.doc_id,
        "doc_name": req.doc_name,
        "messages": [m.model_dump() for m in req.messages],
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    (HISTORY_DIR / f"{chat_id}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"status": "saved", "id": chat_id}


@app.get("/settings")
async def get_settings(user_id: str):
    # Web storage is the source of truth (localStorage acts as the "DB").
    # This endpoint only returns runtime defaults so the UI can populate selects.
    return {
        "user_id": user_id,
        "rag": get_rag_config(),
        "llm": {"system_prompt": get_rag_prompt_template()},
    }


@app.patch("/settings")
async def patch_settings(user_id: str, payload: dict = Body(...)):
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid settings payload")

    payload["user_id"] = user_id

    # Apply runtime settings that affect behavior.
    rag = payload.get("rag")
    if isinstance(rag, dict):
        set_rag_config(
            chunk_size=rag.get("chunk_size"),
            chunk_overlap=rag.get("chunk_overlap"),
            top_k=rag.get("top_k"),
        )

    llm = payload.get("llm")
    if isinstance(llm, dict):
        apply_llm_settings(llm)

    # Do NOT persist user settings on the server (web-storage-only demo).
    return {"status": "applied", "rag": get_rag_config()}


@app.post("/rag/reprocess")
async def rag_reprocess(req: RagReprocessRequest):
    if not req.filename:
        raise HTTPException(status_code=400, detail="filename is required")

    file_path = UPLOAD_DIR / Path(req.filename).name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Document not found on server")

    set_rag_config(chunk_size=req.chunk_size, chunk_overlap=req.chunk_overlap, top_k=req.top_k)
    chunks = process_pdf(file_path, chunk_size=req.chunk_size, chunk_overlap=req.chunk_overlap)
    return {"status": "reprocessed", "filename": Path(req.filename).name, "chunks": chunks, "rag": get_rag_config()}
