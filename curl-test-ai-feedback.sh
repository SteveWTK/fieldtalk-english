#!/bin/bash

# Test script for multi-language AI feedback endpoint
# You'll need to replace AUTH_TOKEN with your actual authentication token

echo "🧪 Testing Multi-language AI Feedback Endpoint"
echo "============================================"

# Replace this with your actual auth token or session cookie
AUTH_TOKEN="your-auth-token-here"
BASE_URL="http://localhost:3000"

# Test 1: Writing feedback
echo -e "\n📝 Test 1: Writing Feedback"
curl -X POST "$BASE_URL/api/ai-feedback" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie=$AUTH_TOKEN" \
  -d '{
    "type": "writing",
    "content": "I play football very good with my team. We are training hard for win the championship.",
    "context": "Describing team training",
    "lessonId": "test-lesson-1"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'

# Test 2: Gap fill hint
echo -e "\n📝 Test 2: Gap Fill Hint"
curl -X POST "$BASE_URL/api/ai-feedback" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie=$AUTH_TOKEN" \
  -d '{
    "type": "gap_fill",
    "content": "The coach told us to _____ harder during practice.",
    "context": "Training vocabulary",
    "lessonId": "test-lesson-2"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'

# Test 3: Conversation
echo -e "\n📝 Test 3: Conversation Practice"
curl -X POST "$BASE_URL/api/ai-feedback" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie=$AUTH_TOKEN" \
  -d '{
    "type": "conversation",
    "content": "Coach, I think we need practice more the defense today.",
    "context": "Talking to coach about training",
    "lessonId": "test-lesson-3"
  }' \
  -w "\nHTTP Status: %{http_code}\n" | jq '.'

echo -e "\n✅ Test complete!"
echo "Note: The endpoint will use the user's preferred_language from the database."
echo "Default language: pt-BR (Brazilian Portuguese)"