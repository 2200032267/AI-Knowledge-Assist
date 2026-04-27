export const DEFAULT_SETTINGS = {
  user_id: "",
  profile: { name: "", email: "" },
  llm: {
    provider: "openrouter",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    api_key: "",
    temperature: 0.1,
    max_tokens: 512,
    system_prompt:
      "You are an AI assistant for document Q&A.\nAnswer ONLY from the provided context below.\nIf the answer is not in the context, respond: \"I don't find this information in the document.\"\nDo not make up facts or use outside knowledge.\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer with citations like [Page 3]:\n",
    streaming: true,
  },
  rag: {
    chunk_size: 500,
    chunk_overlap: 50,
    top_k: 3,
    embedding_model: "sentence-transformers/all-MiniLM-L6-v2",
    similarity_threshold: 0.7,
    needs_reprocess: false,
  },
  agent: {
    enabled_actions: ["summarize", "study_notes", "key_points", "faq", "action_items"],
    summary_length: 5,
  },
  interface: {
    theme: "dark",
    show_sources: true,
    font_size: "medium",
  },
};
