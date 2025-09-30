from agents import Agent, Runner
from agents import AsyncOpenAI, OpenAIChatCompletionsModel, RunConfig
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest, ChatResponse
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

API_KEY = os.getenv("CLAUDE_API_KEY")

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

async def claude_agent(prompt: str, instructions: str = "You are a helpful assistant.  understand the user message context. if user is asking for explanations, provide detailed answers.") -> str:
    claude = Agent(
        name="Claude",
        instructions=instructions,
    )

    response = await Runner.run(
        starting_agent=claude,
        input=prompt,
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
        response = await claude_agent(request.prompt, request.instructions)
        return ChatResponse(response=response, model="gemini-2.0-flash")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "gemini-2.0-flash"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)


