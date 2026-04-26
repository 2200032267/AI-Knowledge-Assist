import os
from pathlib import Path

import requests
from dotenv import load_dotenv


def main() -> None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise SystemExit("OPENROUTER_API_KEY not set in backend/.env")

    r = requests.get(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {key}"},
        timeout=30,
    )
    print("status", r.status_code)
    data = r.json()
    items = data.get("data", []) if isinstance(data, dict) else []
    print("models", len(items))

    wanted = ("free", "mini", "mistral", "llama", "gemma")
    ids = []
    for m in items:
        mid = (m or {}).get("id")
        if not isinstance(mid, str):
            continue
        if any(w in mid.lower() for w in wanted):
            ids.append(mid)

    for mid in ids[:60]:
        print(mid)


if __name__ == "__main__":
    main()
