import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "mistralai/mistral-7b-instruct"


def call_llm(prompt: str, system_message: str = None) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        return "OPENROUTER_API_KEY not set. Please configure it in your .env file."

    messages = []
    if system_message:
        messages.append({"role": "system", "content": system_message})
    messages.append({"role": "user", "content": prompt})

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEFAULT_MODEL,
                "messages": messages,
            },
            timeout=60,
        )

        result = response.json()

        if "choices" in result:
            return result["choices"][0]["message"]["content"]

        if "error" in result:
            return f"LLM API error: {result['error'].get('message', 'Unknown error')}"

        return "Unexpected response format from LLM API."

    except requests.exceptions.Timeout:
        return "Request timed out. Please try again."
    except requests.exceptions.ConnectionError:
        return "Could not connect to LLM API. Check your internet connection."
    except Exception as e:
        return f"Error calling LLM: {str(e)}"
