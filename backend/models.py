from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    prompt: str
    instructions: Optional[str] = "You are a helpful assistant.  understand the user message context. if user is asking for explanations, provide detailed answers."

class ChatResponse(BaseModel):
    response: str
    model: str