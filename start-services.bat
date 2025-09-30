@echo off
REM Start all backend services for Windows
echo Starting MultiMind Backend Services...

REM Change to backend directory
cd backend

REM Start each service in separate command prompt windows
echo Starting Gemini service on port 8001...
start "Gemini Service" cmd /k "python gemini_llm.py"

echo Starting ChatGPT service on port 8002...
start "ChatGPT Service" cmd /k "python chatgpt_llm.py"

echo Starting Claude service on port 8003...
start "Claude Service" cmd /k "python claude_llm.py"

echo Starting Grok service on port 8004...
start "Grok Service" cmd /k "python grok_llm.py"

echo.
echo All services are starting in separate windows!
echo Gemini: http://localhost:8001
echo ChatGPT: http://localhost:8002
echo Claude: http://localhost:8003
echo Grok: http://localhost:8004
echo.
echo Press any key to exit this window...
pause > nul