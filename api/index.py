from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "MultiMind API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "multimind-api"}

# This is the main handler for Vercel
def handler(request):
    return app(request)