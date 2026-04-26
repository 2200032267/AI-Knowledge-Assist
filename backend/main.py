from pathlib import Path
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag import process_pdf, retrieve_context, build_prompt, has_documents
from llm import call_llm
from agent import agent_action
from utils import ensure_dir

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("data/uploads")
ensure_dir(UPLOAD_DIR)

class Question(BaseModel):
    question: str

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    file_path = UPLOAD_DIR / file.filename
    file_path.write_bytes(await file.read())
    chunks = process_pdf(file_path)
    return {"message": "Uploaded", "chunks": chunks}

@app.post("/ask")
async def ask(q: Question):
    if not has_documents():
        return {"answer": "Upload a document first"}

    context = retrieve_context(q.question)

    agent_resp = agent_action(q.question, context)
    if agent_resp:
        return {"answer": agent_resp}

    prompt = build_prompt(context, q.question)
    return {"answer": call_llm(prompt)}

@app.post("/chat")
async def chat(q: Question):
    return {"answer": call_llm(q.question)}