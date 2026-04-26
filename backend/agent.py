from llm import call_llm

ACTION_HINTS = {
    "summarize": "Summarize the key ideas in bullet points.",
    "notes": "Generate structured notes.",
    "explain": "Explain in simple terms."
}

def agent_action(user_input: str, context: str):
    user_input_lower = user_input.lower()

    for key, instruction in ACTION_HINTS.items():
        if key in user_input_lower:
            prompt = f"{instruction}\n\nContext:\n{context}"
            return call_llm(prompt)

    return None