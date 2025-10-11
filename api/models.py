from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ConversationMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    prompt: str
    instructions: Optional[str] = "You are a helpful assistant. Understand the user message context. If user is asking for explanations, provide detailed answers."
    conversationHistory: Optional[List[ConversationMessage]] = []
    userName: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model: str