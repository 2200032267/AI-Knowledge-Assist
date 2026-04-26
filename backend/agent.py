from llm import call_llm

ACTION_HINTS = {
    "summarize": "Summarize the key ideas in the following context as concise bullet points.",
    "notes": "Generate well-structured study notes from the following context with headings and key points.",
    "explain": "Explain the following context in simple, easy-to-understand terms.",
}


def agent_action(user_input: str, context: str):
    user_input_lower = user_input.lower()

    for key, instruction in ACTION_HINTS.items():
        if key in user_input_lower:
            prompt = (
                f"{instruction}\n\n"
                f"Context:\n{context}\n\n"
                f"User request: {user_input}"
            )
            return call_llm(prompt)

    return None
