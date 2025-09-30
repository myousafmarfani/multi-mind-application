# 🧠 MultiMind - AI Chat Interface

A beautiful, modern web application that allows you to chat with multiple AI models simultaneously. Experience conversations with Gemini, ChatGPT, Claude, and Grok all in one interface.

## ✨ Features

- **Multi-AI Chat**: Send one prompt to 4 different AI models simultaneously
- **Real-time Responses**: Watch all models respond in parallel
- **Modern UI**: Clean, responsive design that works on all devices
- **Health Monitoring**: Real-time status of all AI services
- **Statistics**: Track message count and response times
- **Keyboard Shortcuts**: Enhanced UX with keyboard controls
- **Responsive Design**: Perfect on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Required Python packages (install via `pip install -r requirements.txt`)
- API keys for the respective services (stored in `.env` file)

### Environment Setup

1. Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
CHATGPT_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_anthropic_api_key_here
GROK_API_KEY=your_xai_api_key_here
```

### Running the Application

#### Windows
```bash
# Start all backend services
start-services.bat

# Open the frontend
cd frontend
# Open index.html in your browser or use a local server
```

#### Linux/Mac
```bash
# Make the script executable
chmod +x start-services.sh

# Start all backend services
./start-services.sh

# Open the frontend
cd frontend
# Open index.html in your browser or use a local server
```

#### Manual Start (Alternative)
```bash
# Terminal 1 - Gemini
cd backend && python gemini_llm.py

# Terminal 2 - ChatGPT  
cd backend && python chatgpt_llm.py

# Terminal 3 - Claude
cd backend && python claude_llm.py

# Terminal 4 - Grok
cd backend && python grok_llm.py
```

### Frontend Access

1. Navigate to the `frontend` folder
2. Open `index.html` in your web browser
3. Click "Try Demo" to start chatting!

**Or use a local server for better experience:**
```bash
cd frontend
python -m http.server 3000
# Then visit http://localhost:3000
```

## 🏗️ Project Structure

```
multimind/
├── backend/
│   ├── models.py          # Pydantic models for API
│   ├── gemini_llm.py      # Gemini AI service (Port 8001)
│   ├── chatgpt_llm.py     # ChatGPT service (Port 8002)
│   ├── claude_llm.py      # Claude service (Port 8003)
│   └── grok_llm.py        # Grok service (Port 8004)
├── frontend/
│   ├── index.html         # Landing page
│   ├── chat.html          # Chat interface
│   ├── css/
│   │   ├── style.css      # Main styles
│   │   └── chat.css       # Chat-specific styles
│   └── js/
│       ├── main.js        # Landing page JavaScript
│       └── chat.js        # Chat functionality
├── start-services.bat     # Windows service starter
├── start-services.sh      # Linux/Mac service starter
└── README.md
```

## 🎯 API Endpoints

Each AI service runs on a different port with the following endpoints:

### Gemini (Port 8001)
- `POST /chat` - Send a chat message
- `GET /health` - Check service health

### ChatGPT (Port 8002)
- `POST /chat` - Send a chat message  
- `GET /health` - Check service health

### Claude (Port 8003)
- `POST /chat` - Send a chat message
- `GET /health` - Check service health

### Grok (Port 8004)  
- `POST /chat` - Send a chat message
- `GET /health` - Check service health

### Example API Request
```bash
curl -X POST "http://localhost:8001/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how are you?",
    "instructions": "You are a helpful assistant."
  }'
```

## 🎨 Features Overview

### Landing Page
- Hero section with smooth animations
- Feature showcase with hover effects
- Responsive design for all devices
- Call-to-action buttons

### Chat Interface
- 4-column grid layout for desktop
- Responsive stacking for mobile
- Real-time typing indicators
- Message history for each model
- Service health monitoring
- Response time statistics

### User Experience
- Keyboard shortcuts (Ctrl+Enter to send)
- Auto-resizing text input
- Loading states and animations
- Error handling and retry logic
- Smooth transitions and effects

## 🛠️ Customization

### Styling
- Modify `frontend/css/style.css` for general styling
- Modify `frontend/css/chat.css` for chat interface
- CSS variables in `:root` for easy theme changes

### Adding New AI Models
1. Create a new LLM file in `backend/`
2. Add FastAPI endpoint following the existing pattern
3. Update the frontend JavaScript to include the new model
4. Add the new service to the start scripts

## 🔧 Troubleshooting

### Common Issues

1. **Services not starting**: Check if ports 8001-8004 are available
2. **API keys not working**: Verify your `.env` file configuration
3. **CORS issues**: Make sure services are running on localhost
4. **Frontend not connecting**: Check console for network errors

### Debugging

- Check individual service health: `http://localhost:800X/health`
- View browser console for JavaScript errors
- Check backend terminal outputs for Python errors

## 📱 Mobile Support

The interface is fully responsive and includes:
- Stacked chat layout on mobile
- Touch-friendly buttons and inputs
- Optimized spacing and typography
- Swipe gestures (future enhancement)

## 🎯 Future Enhancements

- [ ] Dark/Light theme toggle
- [ ] Message export functionality
- [ ] Conversation history persistence
- [ ] Custom system prompts per model
- [ ] File upload support
- [ ] Voice input/output
- [ ] Performance analytics dashboard
- [ ] Model comparison tools

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Enjoy chatting with multiple AI minds! 🧠✨**
