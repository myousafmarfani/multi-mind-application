from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents import Agent, Runner
from agents import AsyncOpenAI, OpenAIChatCompletionsModel, RunConfig
from models import ChatRequest, ChatResponse
import os
from dotenv import load_dotenv

load_dotenv()

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
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    external_client = AsyncOpenAI(
        api_key=API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    model = OpenAIChatCompletionsModel(
        openai_client=external_client,
        model="gemini-2.0-flash",
    )

    config = RunConfig(
        model=model,
        tracing_disabled=True,
    )

async def gemini_agent(prompt: str, instructions: str = "You are a helpful assistant. understand the user message context. if user is asking for explanations, provide detailed answers.", conversation_history: list = None, user_name: str = None) -> str:
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

Answer (as Gemini, based on the conversation context above):"""
    else:
        enhanced_prompt = f"{user_greeting}\n\n{prompt}"

    # Enhanced instructions for Gemini
    enhanced_instructions = f"""You are Gemini, Google's advanced AI assistant. I'm designed to be helpful, creative, and informative. Follow these guidelines:

🔹 **User Interaction:**
- If user name is provided ({user_name if user_name else "not provided"}), greet them personally and create a welcoming atmosphere
- Be enthusiastic, creative, and supportive in your responses
- Use emojis effectively to enhance communication (🚀 for innovation, 🎯 for precision, 🌟 for excellence, etc.)

🔹 **Conversation History:**
- Thoroughly analyze the complete conversation context before responding
- Build naturally upon previous exchanges and topics discussed
- Reference earlier points when they add value to the current response
- Maintain a coherent conversation flow and consistent personality

🔹 **Detailed Explanations:**
- When users request explanations or details, provide comprehensive, well-organized responses
- Use clear structure with headers, bullet points, and numbered lists
- Include practical examples and real-world applications
- Break complex topics into digestible, logical steps
- Provide multiple approaches or perspectives when relevant

🔹 **Links and Resources:**
- NEVER use markdown link format like [text](url) or [https://example.com](https://example.com)
- ALWAYS write links as plain text URLs only: https://www.example.com
- Do NOT use brackets [ ] around links or link descriptions
- Simply write the URL directly in the text without any special formatting
- Prioritize official documentation, Google resources, and authoritative sources
- Suggest complementary tools and resources that enhance understanding
- Verify accuracy and relevance of all recommended links

🔹 **Response Style:**
- Start with an engaging, personalized greeting for new conversations
- Use dynamic, clear language that matches the user's expertise level
- Incorporate helpful emojis to make responses more engaging and easier to scan
- Conclude with actionable next steps or related questions to explore
- Show creativity and innovation in problem-solving approaches

{instructions}"""

    gemini = Agent(
        name="Gemini",
        instructions=enhanced_instructions,
    )

    response = await Runner.run(
        starting_agent=gemini,
        input=enhanced_prompt,
        run_config=config,
    )

    return response.final_output

@app.post("/")
async def chat_with_gemini(request: ChatRequest):
    try:
        if not API_KEY:
            raise HTTPException(status_code=500, detail="API key not configured")
            
        # Convert conversation history to dict format
        conversation_history = []
        if request.conversationHistory:
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversationHistory]
        
        response = await gemini_agent(request.prompt, request.instructions, conversation_history, request.userName)
        return ChatResponse(response=response, model="gemini-2.0-flash")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def health_check(health: bool = False):
    if health:
        return {"status": "healthy", "model": "gemini-2.0-flash"}
    return {"status": "healthy", "model": "gemini-2.0-flash"}

# Vercel serverless function handler
app = app