#!/bin/bash
# Start all backend services
echo "Starting MultiMind Backend Services..."

# Start each service in background
echo "Starting Gemini service on port 8001..."
cd backend && python gemini_llm.py &
GEMINI_PID=$!

echo "Starting ChatGPT service on port 8002..."
python chatgpt_llm.py &
CHATGPT_PID=$!

echo "Starting Claude service on port 8003..."
python claude_llm.py &
CLAUDE_PID=$!

echo "Starting Grok service on port 8004..."
python grok_llm.py &
GROK_PID=$!

echo "All services started!"
echo "Gemini: http://localhost:8001"
echo "ChatGPT: http://localhost:8002"
echo "Claude: http://localhost:8003"
echo "Grok: http://localhost:8004"

# Function to stop all services
cleanup() {
    echo "Stopping all services..."
    kill $GEMINI_PID $CHATGPT_PID $CLAUDE_PID $GROK_PID 2>/dev/null
    echo "All services stopped."
    exit 0
}

# Trap SIGINT (Ctrl+C) to cleanup
trap cleanup SIGINT

# Wait for all processes
wait