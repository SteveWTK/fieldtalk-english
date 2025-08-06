// Test script for the multi-language AI feedback endpoint
// Run with: node test-ai-feedback.js

async function testAIFeedback() {
  const baseUrl = 'http://localhost:3000'; // Update this to your actual URL
  
  // Test scenarios for different feedback types and languages
  const testCases = [
    {
      name: 'Writing feedback in Portuguese',
      payload: {
        type: 'writing',
        content: 'I play football very good with my team. We are training hard for win the championship.',
        context: 'Describing team training',
        lessonId: 'test-lesson-1'
      },
      expectedLanguage: 'pt-BR'
    },
    {
      name: 'Gap fill hint in Portuguese',
      payload: {
        type: 'gap_fill',
        content: 'The coach told us to _____ harder during practice.',
        context: 'Training vocabulary',
        lessonId: 'test-lesson-2'
      },
      expectedLanguage: 'pt-BR'
    },
    {
      name: 'Conversation in Portuguese',
      payload: {
        type: 'conversation',
        content: 'Coach, I think we need practice more the defense today.',
        context: 'Talking to coach about training',
        lessonId: 'test-lesson-3'
      },
      expectedLanguage: 'pt-BR'
    }
  ];

  // Note: To properly test this, you'll need to:
  // 1. Have a valid session cookie or auth token
  // 2. Update the player's preferred_language in the database
  // 3. Or modify the test to include proper authentication

  console.log('🧪 Testing AI Feedback Endpoint with Multi-language Support\n');
  console.log('⚠️  Note: This test requires authentication. You may need to:');
  console.log('   1. Run this from a browser console with an active session');
  console.log('   2. Add authentication headers to the fetch requests');
  console.log('   3. Or test directly through your application UI\n');

  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log('Request payload:', JSON.stringify(test.payload, null, 2));
    
    try {
      // Simulated response structure for demonstration
      console.log('\n✅ Expected response structure:');
      console.log({
        success: true,
        feedback: '(AI-generated feedback in the user\'s language)',
        analysis: {
          // For writing type
          score: 7,
          grammar: [
            {
              error: 'play... very good',
              correction: 'play... very well',
              explanation: 'Use o advérbio "well" ao invés do adjetivo "good"'
            }
          ],
          vocabulary: [],
          clarity: 'Seu texto está claro, mas precisa de algumas correções gramaticais.',
          improvements: ['Pratique o uso de advérbios vs adjetivos'],
          encouragement: 'Continue praticando! O inglês é fundamental para sua carreira no futebol.'
        },
        language: test.expectedLanguage,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  console.log('\n\n📋 API Endpoint Summary:');
  console.log('Endpoint: POST /api/ai-feedback');
  console.log('Supported languages: pt-BR, es, fr, en');
  console.log('Default language: pt-BR (if preferred_language is null)');
  console.log('\nFeatures:');
  console.log('✅ Queries player\'s preferred_language from database');
  console.log('✅ Provides feedback in the user\'s native language');
  console.log('✅ Grammar explanations in native language with English corrections');
  console.log('✅ Football-context examples and encouragement');
  console.log('✅ Stores feedback history with language information');
}

// Example of how to test with authentication from a Node.js script
async function testWithAuth(authToken) {
  const response = await fetch('http://localhost:3000/api/ai-feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `your-auth-cookie=${authToken}`, // Replace with actual auth method
    },
    body: JSON.stringify({
      type: 'writing',
      content: 'I want improve my English for play in Europe.',
      context: 'Career goals',
      lessonId: 'test-lesson'
    })
  });

  const data = await response.json();
  console.log('Response:', data);
}

// Run the test
testAIFeedback();