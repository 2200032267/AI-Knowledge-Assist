from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import process_pdf, retrieve_context, build_prompt, has_documents
from llm import call_llm
from agent import agent_action
from utils import ensure_dir

app = FastAPI(title="AI Knowledge Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/uploads")
ensure_dir(UPLOAD_DIR)


class Question(BaseModel):
    question: str


class AgentRequest(BaseModel):
    question: str
    context: str = ""


@app.get("/health")
async def health():
    return {"status": "ok", "documents_loaded": has_documents()}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_path = UPLOAD_DIR / file.filename
    file_path.write_bytes(await file.read())
    chunks = process_pdf(file_path)
    return {"message": "Uploaded successfully", "filename": file.filename, "chunks": chunks}


@app.post("/ask")
async def ask(q: Question):
    if not has_documents():
        return {"answer": "Please upload a PDF document first before asking questions."}

    context = retrieve_context(q.question)

    agent_resp = agent_action(q.question, context)
    if agent_resp:
        return {"answer": agent_resp, "source": "agent"}

    prompt = build_prompt(context, q.question)
    return {"answer": call_llm(prompt), "source": "rag"}


@app.post("/chat")
async def chat(q: Question):
    return {"answer": call_llm(q.question), "source": "general"}


@app.post("/agent")
async def agent(req: AgentRequest):
    context = req.context if req.context else ""
    if has_documents() and not context:
        context = retrieve_context(req.question)

    result = agent_action(req.question, context)
    if result:
        return {"answer": result, "source": "agent"}

    return {"answer": "No matching agent action found. Try: summarize, notes, or explain.", "source": "agent"}
