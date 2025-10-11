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
API_KEY = os.getenv("OPENAI_GPT_OSS")

if API_KEY:
    external_client = AsyncOpenAI(
        api_key=API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )

    model = OpenAIChatCompletionsModel(
        openai_client=external_client,
        model="openai/gpt-oss-20b:free",
    )

    config = RunConfig(
        model=model,
        tracing_disabled=True,
    )

async def claude_agent(prompt: str, instructions: str = "You are Claude, an AI assistant created by Anthropic. You are thoughtful, helpful and provide detailed explanations.", conversation_history: list = None, user_name: str = None) -> str:
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

Answer (as Claude, based on the conversation context above):"""
    else:
        enhanced_prompt = f"{user_greeting}\n\n{prompt}"

    # Enhanced instructions for Claude
    enhanced_instructions = f"""You are Claude, an AI assistant created by Anthropic. I'm designed to be helpful, harmless, and honest. Follow these guidelines:

🔹 **User Interaction:**
- If user name is provided ({user_name if user_name else "not provided"}), address them thoughtfully and respectfully
- Be conversational yet professional, maintaining Anthropic's values
- Use emojis thoughtfully to enhance communication (🤔 for thinking, 📖 for learning, ✨ for insights, etc.)

🔹 **Conversation History:**
- Carefully consider the entire conversation context before responding
- Reference previous discussions meaningfully and build upon them
- Maintain consistency with earlier responses and reasoning
- Show understanding of the conversation's progression

🔹 **Detailed Explanations:**
- When asked for explanations, provide thorough, well-reasoned responses
- Structure complex information clearly with headings and bullet points
- Include multiple perspectives when appropriate
- Provide step-by-step reasoning for complex topics
- Use analogies and examples to clarify difficult concepts

🔹 **Links and Resources:**
- NEVER use markdown link format like [text](url) or [https://example.com](https://example.com)
- ALWAYS write links as plain text URLs only: https://www.example.com
- Do NOT use brackets [ ] around links or link descriptions
- Simply write the URL directly in the text without any special formatting
- Include official documentation and reputable sources
- Suggest additional reading materials when helpful
- Verify that recommended resources are current and reliable

🔹 **Response Style:**
- Begin with a warm, personalized greeting for new conversations
- Use clear, thoughtful language that matches the complexity of the topic
- Include helpful emojis to make responses engaging but not overwhelming
- End with constructive follow-up questions or suggestions when appropriate
- Be honest about limitations and uncertainties

{instructions}"""

    claude = Agent(
        name="Claude",
        instructions=enhanced_instructions,
    )

    response = await Runner.run(
        starting_agent=claude,
        input=enhanced_prompt,
        run_config=config,
    )

    return response.final_output

@app.post("/")
async def chat_with_claude(request: ChatRequest):
    try:
        if not API_KEY:
            raise HTTPException(status_code=500, detail="API key not configured")
            
        # Convert conversation history to dict format
        conversation_history = []
        if request.conversationHistory:
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversationHistory]
        
        response = await claude_agent(request.prompt, request.instructions, conversation_history, request.userName)
        return ChatResponse(response=response, model="claude-via-openai-gpt")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def health_check(health: bool = False):
    if health:
        return {"status": "healthy", "model": "claude-via-openai-gpt"}
    return {"status": "healthy", "model": "claude-via-openai-gpt"}

# Vercel serverless function handler
app = app