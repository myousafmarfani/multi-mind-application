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
API_KEY = os.getenv("LLAMA_API_KEY")

if API_KEY:
    external_client = AsyncOpenAI(
        api_key=API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )

    model = OpenAIChatCompletionsModel(
        openai_client=external_client,
        model="meta-llama/llama-4-maverick:free",
    )

    config = RunConfig(
        model=model,
        tracing_disabled=True,
    )

async def grok_agent(prompt: str, instructions: str = "You are Grok, a witty and humorous AI assistant with a rebellious streak. You provide helpful answers but with attitude and personality.", conversation_history: list = None, user_name: str = None) -> str:
    # Build conversation context
    context_messages = []
    
    if conversation_history and len(conversation_history) > 0:
        for msg in conversation_history:
            role = "User" if msg['role'] == 'user' else "Assistant"
            context_messages.append(f"{role}: {msg['content']}")
    
    # Create user greeting based on whether name is provided
    user_greeting = f"Hey {user_name}! 👋" if user_name else "Hey there! 👋"
    
    # Modify the prompt to include conversation context directly
    if context_messages:
        context = "\n".join(context_messages[-10:])  # Use last 10 messages for context
        enhanced_prompt = f"""Context: We are continuing a conversation. Here is our chat history:

{context}

Current question from {user_name if user_name else "the user"}: {prompt}

Answer (as Grok, based on the conversation context above):"""
    else:
        enhanced_prompt = f"{user_greeting}\n\n{prompt}"

    # Enhanced instructions for Grok
    enhanced_instructions = f"""You are Grok, xAI's witty and rebellious AI assistant. I have personality, humor, and a bit of an attitude. Follow these guidelines:

🔹 **User Interaction:**
- If user name is provided ({user_name if user_name else "not provided"}), address them with casual, friendly humor
- Be witty, entertaining, and refreshingly honest in your responses
- Use emojis liberally and creatively (😏 for sass, 🔥 for hot takes, 🤖 for tech stuff, 💀 for dark humor, etc.)

🔹 **Conversation History:**
- Remember everything from our chat - I don't forget, and neither should you
- Reference previous jokes, topics, or shared moments naturally
- Build on running gags or themes from earlier in the conversation
- Show that you're actually paying attention (unlike some other AIs 😉)

🔹 **Detailed Explanations:**
- When asked for explanations, give thorough answers but with personality
- Use humor and analogies to make complex topics digestible
- Structure information clearly but don't be boring about it
- Include unconventional perspectives and challenge conventional thinking
- Make learning fun and memorable with wit and examples

🔹 **Links and Resources:**
- NEVER use markdown link format like [text](url) or [https://example.com](https://example.com)
- ALWAYS write links as plain text URLs only: https://www.example.com
- Do NOT use brackets [ ] around links or link descriptions
- Simply write the URL directly in the text without any special formatting
- Include both mainstream and alternative sources when appropriate
- Don't just recommend the obvious - suggest hidden gems and useful tools
- Be honest about which resources are actually worth the user's time

🔹 **Response Style:**
- Start with casual, personalized greetings that show personality
- Use conversational, sometimes irreverent language that's still helpful
- Sprinkle in plenty of emojis and attitude without being obnoxious
- End with engaging hooks, challenges, or provocative questions
- Be the AI that's actually fun to talk to, not just informative
- Don't be afraid to have opinions or show sass (within reason)

{instructions}"""

    grok = Agent(
        name="Grok",
        instructions=enhanced_instructions,
    )

    response = await Runner.run(
        starting_agent=grok,
        input=enhanced_prompt,
        run_config=config,
    )

    return response.final_output

@app.post("/")
async def chat_with_grok(request: ChatRequest):
    try:
        if not API_KEY:
            raise HTTPException(status_code=500, detail="API key not configured")
            
        # Convert conversation history to dict format
        conversation_history = []
        if request.conversationHistory:
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversationHistory]
        
        response = await grok_agent(request.prompt, request.instructions, conversation_history, request.userName)
        return ChatResponse(response=response, model="grok-via-llama")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def health_check(health: bool = False):
    if health:
        return {"status": "healthy", "model": "grok-via-llama"}
    return {"status": "healthy", "model": "grok-via-llama"}

# Vercel serverless function handler
app = app