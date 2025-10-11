from agents import Agent, Runner
from agents import AsyncOpenAI, OpenAIChatCompletionsModel, RunConfig
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  
from models import ChatRequest, ChatResponse
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

API_KEY = os.getenv("LLAMA_API_KEY")  # Use Gemini key for now

external_client = AsyncOpenAI(
    api_key="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",
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
        print(f"Grok Agent - Processing {len(conversation_history)} context messages")
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
        
        print(f"Grok Agent - Using enhanced prompt with context")
    else:
        enhanced_prompt = f"{user_greeting}\n\n{prompt}"
        print(f"Grok Agent - No conversation context available")

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

# FastAPI app
app = FastAPI(title="Grok LLM API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.post("/chat", response_model=ChatResponse)
async def chat_with_grok(request: ChatRequest):
    try:
        # Convert conversation history to dict format
        conversation_history = []
        if request.conversationHistory:
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversationHistory]
        
        response = await grok_agent(request.prompt, request.instructions, conversation_history, request.userName)
        return ChatResponse(response=response, model="grok-via-gemini")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/improve-prompt")
async def improve_prompt(request: dict):
    try:
        original_prompt = request.get("prompt", "")
        if not original_prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        # Instructions for improving the prompt
        improvement_instructions = """
        You are an expert prompt engineer. Your task is to analyze and improve user prompts to make them more effective, clear, and specific.

        Guidelines for improvement:
        1. Make the prompt more specific and detailed
        2. Add context where appropriate
        3. Clarify the desired output format
        4. Remove ambiguity
        5. Add relevant constraints or requirements
        6. Ensure the prompt is actionable
        7. Maintain the user's original intent

        Please analyze the following prompt and provide an improved version that will generate better AI responses.

        Important: Only return the improved prompt text, nothing else. Do not include explanations or meta-commentary.
        """
        
        # Use the grok agent to improve the prompt
        improved_prompt = await grok_agent(
            prompt=f"Original prompt: {original_prompt}",
            instructions=improvement_instructions,
            conversation_history=[],
            user_name="PromptImprover"
        )
        
        # Clean up the response (remove any extra formatting)
        improved_prompt = improved_prompt.strip()
        
        # If the improved prompt is significantly longer and more detailed, return it
        # Otherwise, return a message indicating the original was already good
        if len(improved_prompt) > len(original_prompt) * 0.8 and improved_prompt != original_prompt:
            return {"improved_prompt": improved_prompt}
        else:
            # Return the original if improvement didn't add much value
            return {"improved_prompt": original_prompt}
            
    except Exception as e:
        print(f"Error improving prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to improve prompt: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "grok-via-gemini"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)


