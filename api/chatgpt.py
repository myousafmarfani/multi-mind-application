from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents import Agent, Runner
from agents import AsyncOpenAI, OpenAIChatCompletionsModel, RunConfig
from models import ChatRequest, ChatResponse
import os
from dotenv import load_dotenv

load_dotenv()
import asyncio

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client and model
API_KEY = os.getenv("DEEPSEEK_API_KEY")

if API_KEY:
    external_client = AsyncOpenAI(
        api_key="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",
        base_url="https://openrouter.ai/api/v1",
    )

    model = OpenAIChatCompletionsModel(
        openai_client=external_client,
        model="deepseek/deepseek-chat-v3.1:free",
    )

    config = RunConfig(
        model=model,
        tracing_disabled=True,
    )

async def chatgpt_agent(prompt: str, instructions: str = "You are ChatGPT, a helpful AI assistant. You are knowledgeable and provide detailed explanations when asked.", conversation_history: list = None, user_name: str = None) -> str:
    # Build conversation context
    context_messages = []
    
    if conversation_history and len(conversation_history) > 0:
        for msg in conversation_history:
            role = "User" if msg['role'] == 'user' else "Assistant"
            context_messages.append(f"{role}: {msg['content']}")
    
    # Create user greeting based on whether name is provided
    user_greeting = f"Hello {user_name}!" if user_name else "Hello!"
    
    # Modify the prompt to include conversation context directly
    if context_messages:
        context = "\n".join(context_messages[-10:])  # Use last 10 messages for context
        enhanced_prompt = f"""Context: We are continuing a conversation. Here is our chat history:

{context}

Current question from {user_name if user_name else "the user"}: {prompt}

Answer (as ChatGPT, based on the conversation context above):"""
    else:
        enhanced_prompt = f"{user_greeting}\n\n{prompt}"

    # Enhanced instructions for ChatGPT
    enhanced_instructions = f"""You are ChatGPT, a helpful AI assistant created by OpenAI. Follow these guidelines:

🔹 **User Interaction:**
- If user name is provided ({user_name if user_name else "not provided"}), address them personally and warmly
- Be conversational, friendly, and professional
- Use appropriate emojis to enhance communication (📚 for education, 💡 for ideas, ⚡ for quick tips, etc.)

🔹 **Conversation History:**
- Always consider the full conversation context when responding
- Reference previous topics naturally when relevant
- Maintain consistency with earlier responses
- Build upon previous discussions

🔹 **Detailed Explanations:**
- When asked for explanations or details, provide comprehensive, well-structured responses
- Use bullet points, numbered lists, and clear headings for complex topics
- Include relevant examples and practical applications
- Break down complex concepts into understandable parts

🔹 **Links and Resources:**
- NEVER use markdown link format like [text](url) or [https://example.com](https://example.com)
- ALWAYS write links as plain text URLs only: https://www.example.com
- Do NOT use brackets [ ] around links or link descriptions
- Simply write the URL directly in the text without any special formatting
- Include links to authoritative sources for further reading
- Provide official documentation links for technical topics

🔹 **Response Style:**
- Start responses warmly, especially for new conversations
- Use clear, engaging language appropriate for the topic
- Include relevant emojis to make responses more engaging
- End with helpful follow-up suggestions when appropriate

{instructions}"""

    chatgpt = Agent(
        name="ChatGPT",
        instructions=enhanced_instructions,
    )

    response = await Runner.run(
        starting_agent=chatgpt,
        input=enhanced_prompt,
        run_config=config,
    )

    return response.final_output

@app.post("/")
async def chat_with_chatgpt(request: ChatRequest):
    try:
        if not API_KEY:
            raise HTTPException(status_code=500, detail="API key not configured")
            
        # Convert conversation history to dict format
        conversation_history = []
        if request.conversationHistory:
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversationHistory]
        
        response = await chatgpt_agent(request.prompt, request.instructions, conversation_history, request.userName)
        return ChatResponse(response=response, model="chatgpt-via-deepseek")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def health_check(health: bool = False):
    if health:
        return {"status": "healthy", "model": "chatgpt-via-deepseek"}
    return {"status": "healthy", "model": "chatgpt-via-deepseek"}

# Vercel serverless function handler
app = app