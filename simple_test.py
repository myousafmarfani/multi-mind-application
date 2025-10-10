import requests
import json

def test_chatgpt_memory():
    url = "http://localhost:8001/chat"  # Test Gemini directly
    
    # Test with conversation history
    data = {
        "prompt": "What is my name and what do I like?",
        "conversationHistory": [
            {"role": "user", "content": "My name is John and I like pizza"},
            {"role": "assistant", "content": "Nice to meet you, John! I'll remember that you like pizza."}
        ]
    }
    
    print("Sending request to ChatGPT:")
    print(json.dumps(data, indent=2))
    
    response = requests.post(url, json=data)
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    test_chatgpt_memory()