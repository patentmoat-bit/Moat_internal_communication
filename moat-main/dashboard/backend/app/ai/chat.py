import openai
from app.config import settings

openai.api_key = settings.OPENAI_API_KEY

async def generate_chat_response(patent_text: str, messages: list) -> str:
    system_prompt = (
        "You are an expert Patent AI Copilot. "
        "You are assisting a patent analyst with the following patent text context: \n\n"
        f"{patent_text[:15000]}\n\n"
        "Answer the user's questions strictly based on this patent text. "
        "Be concise, analytical, and professional."
    )
    
    openai_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        openai_messages.append({"role": msg.role, "content": msg.content})

    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=openai_messages,
            max_tokens=800,
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"I'm sorry, I encountered an error analyzing this patent: {str(e)}"
