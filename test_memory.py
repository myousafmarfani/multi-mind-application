#!/usr/bin/env python3
"""
Test script to verify memory functionality with MultiMind chat services
"""

import requests
import json
import time

# API endpoints
ENDPOINTS = {
    'gemini': 'http://localhost:8001',
    'chatgpt': 'http://localhost:8002',
    'claude': 'http://localhost:8003',
    'grok': 'http://localhost:8004'
}

def test_service_health(service_name, base_url):
    """Test if a service is running"""
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ {service_name} is running")
            return True
        else:
            print(f"❌ {service_name} returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ {service_name} is not accessible: {e}")
        return False

def test_memory_functionality():
    """Test memory functionality with conversation history"""
    print("\n🧠 Testing Memory Functionality\n")
    
    # Test conversation history
    conversation_history = []
    
    # First message
    first_message = "My name is John and I like pizza"
    print(f"👤 User: {first_message}")
    
    # Test with Gemini (if available)
    try:
        response = requests.post(f"{ENDPOINTS['gemini']}/chat", 
            json={
                "prompt": first_message,
                "instructions": "You are a helpful assistant. Remember details about the user.",
                "conversationHistory": conversation_history
            },
            timeout=30
        )
        
        if response.status_code == 200:
            gemini_response = response.json()['response']
            print(f"🤖 Gemini: {gemini_response}")
            
            # Add to conversation history
            conversation_history.extend([
                {"role": "user", "content": first_message},
                {"role": "assistant", "content": gemini_response}
            ])
        else:
            print(f"❌ Gemini API error: {response.status_code}")
            return
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Gemini connection error: {e}")
        return
    
    time.sleep(1)
    
    # Second message (testing memory)
    second_message = "What was my previous question?"
    print(f"\n👤 User: {second_message}")
    
    try:
        response = requests.post(f"{ENDPOINTS['gemini']}/chat",
            json={
                "prompt": second_message,
                "instructions": "You are a helpful assistant. Remember details about the user and refer to previous conversation.",
                "conversationHistory": conversation_history
            },
            timeout=30
        )
        
        if response.status_code == 200:
            gemini_response = response.json()['response']
            print(f"🤖 Gemini: {gemini_response}")
            
            # Check if response shows memory
            if "pizza" in gemini_response.lower() or "john" in gemini_response.lower() or "name" in gemini_response.lower():
                print("✅ Memory test PASSED - AI remembered previous conversation!")
            else:
                print("❌ Memory test FAILED - AI doesn't remember previous conversation")
                print(f"Conversation history sent: {conversation_history}")
        else:
            print(f"❌ Gemini API error: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Gemini connection error: {e}")

def main():
    print("🚀 MultiMind Memory Test\n")
    
    # Check service health
    print("📊 Checking Service Health:")
    available_services = []
    
    for service_name, base_url in ENDPOINTS.items():
        if test_service_health(service_name, base_url):
            available_services.append(service_name)
    
    if not available_services:
        print("\n❌ No services are running. Please start the backend services first.")
        return
    
    print(f"\n✅ Available services: {', '.join(available_services)}")
    
    # Test memory functionality
    if 'gemini' in available_services:
        test_memory_functionality()
    else:
        print("\n⚠️  Gemini service not available, skipping memory test")

if __name__ == "__main__":
    main()