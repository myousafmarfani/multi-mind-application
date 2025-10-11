from agents import Agent, Runner
from agents import AsyncOpenAI, OpenAIChatCompletionsModel, RunConfig
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest, ChatResponse
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

API_KEY = os.getenv("OPENAI_GPT_OSS")  # Use Gemini key for now

external_client = AsyncOpenAI(
    api_key="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",
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
        print(f"Claude Agent - Processing {len(conversation_history)} context messages")
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
        
        print(f"Claude Agent - Using enhanced prompt with context")
    else:
        enhanced_prompt = f"{user_greeting}\n\n{prompt}"
        print(f"Claude Agent - No conversation context available")

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

# FastAPI app
app = FastAPI(title="Claude LLM API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.post("/chat", response_model=ChatResponse)
async def chat_with_claude(request: ChatRequest):
    try:
        # Convert conversation history to dict format
        conversation_history = []
        if request.conversationHistory:
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in request.conversationHistory]
        
        response = await claude_agent(request.prompt, request.instructions, conversation_history, request.userName)
        return ChatResponse(response=response, model="claude-via-gemini")
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
        
        # Use the claude agent to improve the prompt
        improved_prompt = await claude_agent(
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
    return {"status": "healthy", "model": "claude-via-gemini"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)


