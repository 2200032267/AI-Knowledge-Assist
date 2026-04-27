import os
import re
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv


def _load_env() -> None:
    env_path = Path(__file__).with_name(".env")
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
WORKING_OPENROUTER_MODELS = [
    "meta-llama/llama-3.2-3b-instruct:free",
    "google/gemma-3-27b-it:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "openai/gpt-oss-20b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
]

# Runtime overrides set via the Settings API.
_RUNTIME_OPENROUTER_API_KEY: str | None = None
_RUNTIME_OPENROUTER_MODEL: str | None = None
_RUNTIME_TEMPERATURE: float | None = None
_RUNTIME_MAX_TOKENS: int | None = None

# This is a *prompt template* for the RAG pipeline (not a system message).
_RUNTIME_RAG_PROMPT_TEMPLATE: str | None = None


def apply_llm_settings(llm_settings: dict) -> None:
    """Apply runtime LLM settings coming from the frontend Settings page."""
    global _RUNTIME_OPENROUTER_API_KEY, _RUNTIME_OPENROUTER_MODEL
    global _RUNTIME_TEMPERATURE, _RUNTIME_MAX_TOKENS, _RUNTIME_RAG_PROMPT_TEMPLATE

    if not isinstance(llm_settings, dict):
        return

    api_key = llm_settings.get("api_key")
    if isinstance(api_key, str):
        # Allow clearing by sending empty string.
        _RUNTIME_OPENROUTER_API_KEY = api_key.strip() or None

    model = llm_settings.get("model")
    if isinstance(model, str) and model.strip():
        _RUNTIME_OPENROUTER_MODEL = model.strip()

    temp = llm_settings.get("temperature")
    try:
        if temp is not None:
            _RUNTIME_TEMPERATURE = float(temp)
    except Exception:
        pass

    mt = llm_settings.get("max_tokens")
    try:
        if mt is not None:
            _RUNTIME_MAX_TOKENS = int(mt)
    except Exception:
        pass

    tpl = llm_settings.get("system_prompt")
    if isinstance(tpl, str) and tpl.strip():
        _RUNTIME_RAG_PROMPT_TEMPLATE = tpl


def get_rag_prompt_template() -> str | None:
    return _RUNTIME_RAG_PROMPT_TEMPLATE


def _hf_api_url_for_model(model_id: str) -> str:
    return f"https://api-inference.huggingface.co/models/{model_id}"


def _try_openrouter(prompt: str, system_message: Optional[str]) -> Optional[str]:
    _load_env()
    api_key = _RUNTIME_OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None

    selected_model = _RUNTIME_OPENROUTER_MODEL or os.getenv("OPENROUTER_MODEL") or WORKING_OPENROUTER_MODELS[0]

    model_candidates = [selected_model]
    for fallback_model in WORKING_OPENROUTER_MODELS:
        if fallback_model not in model_candidates:
            model_candidates.append(fallback_model)

    messages = []
    if system_message:
        messages.append({"role": "system", "content": system_message})
    messages.append({"role": "user", "content": prompt})

    last_error: str | None = None

    for model in model_candidates:
        try:
            body = {
                "model": model,
                "messages": messages,
            }

            if _RUNTIME_TEMPERATURE is not None:
                body["temperature"] = max(0.0, min(2.0, float(_RUNTIME_TEMPERATURE)))
            if _RUNTIME_MAX_TOKENS is not None:
                body["max_tokens"] = max(1, int(_RUNTIME_MAX_TOKENS))

            response = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "http://localhost:5173"),
                    "X-Title": os.getenv("OPENROUTER_TITLE", "AI Knowledge Assistant"),
                },
                json=body,
                timeout=60,
            )

            try:
                result = response.json()
            except Exception:
                last_error = f"OpenRouter error (HTTP {response.status_code}): {response.text[:500]}"
                continue

            if isinstance(result, dict) and "choices" in result and result["choices"]:
                return result["choices"][0]["message"]["content"]

            if isinstance(result, dict) and "error" in result:
                msg = result["error"].get("message") if isinstance(result["error"], dict) else str(result["error"])
                error_text = msg or "Unknown error"
                last_error = f"OpenRouter API error: {error_text}"

                # Common free-tier failure: try the next model.
                if "No endpoints found" in error_text or "model" in error_text.lower() or response.status_code in {400, 404, 422, 429}:
                    continue
                return last_error

            last_error = "Unexpected response format from OpenRouter."
        except requests.exceptions.Timeout:
            last_error = "OpenRouter request timed out."
        except requests.exceptions.ConnectionError:
            last_error = "Could not connect to OpenRouter. Check your internet connection."
        except Exception as e:
            last_error = f"Error calling OpenRouter: {str(e)}"

    return last_error or "OpenRouter request failed."


def _extract_hf_generated_text(payload) -> Optional[str]:
    if isinstance(payload, list) and payload and isinstance(payload[0], dict):
        return payload[0].get("generated_text")
    if isinstance(payload, dict):
        if "generated_text" in payload:
            return payload.get("generated_text")
        # Some endpoints return errors as: {"error": "..."}
        if "error" in payload:
            return f"Hugging Face error: {payload.get('error')}"
    return None


def _try_huggingface(prompt: str, system_message: Optional[str]) -> Optional[str]:
    _load_env()
    token = os.getenv("HF_TOKEN")
    if not token:
        return None

    model_id = os.getenv("HF_MODEL_ID") or "google/flan-t5-base"
    api_url = os.getenv("HF_API_URL") or _hf_api_url_for_model(model_id)

    # For simple text-generation models, system_message can be prepended.
    full_prompt = prompt
    if system_message:
        full_prompt = f"{system_message}\n\n{prompt}"

    try:
        response = requests.post(
            api_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={"inputs": full_prompt},
            timeout=60,
        )

        try:
            payload = response.json()
        except Exception:
            return f"Hugging Face error (HTTP {response.status_code}): {response.text[:500]}"

        extracted = _extract_hf_generated_text(payload)
        if extracted:
            return extracted

        return f"Hugging Face returned an unexpected response (HTTP {response.status_code})."
    except requests.exceptions.Timeout:
        return "Hugging Face request timed out. Please try again."
    except requests.exceptions.ConnectionError:
        return "Could not connect to Hugging Face. Check your internet connection."
    except Exception as e:
        return f"Error calling Hugging Face: {str(e)}"


def _fallback_answer(prompt: str) -> str:
    # Best-effort parse of our RAG prompt format.
    m_ctx = re.search(r"\bContext:\s*(.*?)\n\s*Question:\s*", prompt, flags=re.DOTALL | re.IGNORECASE)
    m_q = re.search(r"\bQuestion:\s*(.*)\s*$", prompt, flags=re.DOTALL | re.IGNORECASE)
    context = (m_ctx.group(1).strip() if m_ctx else "").strip()
    question = (m_q.group(1).strip() if m_q else "").strip()

    if not context:
        return (
            "LLM is not configured. Set OPENROUTER_API_KEY (recommended) or HF_TOKEN in backend/.env."
        )

    if not question:
        question = prompt.strip()

    q_tokens = set(re.findall(r"[a-zA-Z0-9]+", question.lower()))
    if not q_tokens:
        return "I don't know"

    # Split context into simple sentences/lines and score by token overlap.
    candidates = [s.strip() for s in re.split(r"(?:\n+|(?<=[.!?])\s+)", context) if s.strip()]
    if not candidates:
        return "I don't know"

    scored = []
    for s in candidates:
        s_tokens = set(re.findall(r"[a-zA-Z0-9]+", s.lower()))
        score = len(q_tokens & s_tokens)
        scored.append((score, s))

    scored.sort(key=lambda x: x[0], reverse=True)
    best = [s for score, s in scored[:2] if score > 0]
    return " ".join(best) if best else "I don't know"


def call_llm(prompt: str, system_message: str = None) -> str:
    _load_env()
    # Prefer OpenRouter if configured.
    resp = _try_openrouter(prompt, system_message)
    if resp is not None:
        return resp

    # Then Hugging Face, if configured.
    resp = _try_huggingface(prompt, system_message)
    if resp is not None:
        return resp

    # Final fallback: do something useful without external keys.
    return _fallback_answer(prompt)
