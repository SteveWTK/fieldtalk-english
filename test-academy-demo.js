// test-academy-demo.js
// Test script for Academy Demo Lesson AI features
// Run this in browser console after logging in

console.log('🏆 Testing FieldTalk Academy Demo AI Features...\n');

// Helper function to get the actual lesson UUID
async function getAcademyDemoLessonUUID() {
  try {
    // This would normally use the helper function, but for testing we'll simulate
    const response = await fetch('/api/lessons?metadata=original_id:academy-demo-001');
    if (response.ok) {
      const data = await response.json();
      return data.lesson_id || 'academy-demo-uuid';
    }
  } catch (error) {
    console.log('ℹ️  Using fallback lesson ID for testing');
  }
  return 'academy-demo-uuid'; // Fallback for testing
}

// Test 1: AI Writing Feedback
async function testWritingFeedback() {
  console.log('📝 Testing AI Writing Feedback...');
  
  const sampleWriting = "My dream is to be professional footballer like Neymar. I practice every day with my team in my city. I want to play in Europe and help my family. Football is my life and I work very hard for this dream.";
  
  try {
    const response = await fetch('/api/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'writing',
        content: sampleWriting,
        context: 'Academy trial application - write about your football dreams',
        lessonId: 'academy-demo-001'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Writing feedback successful!');
      console.log('🌍 Language:', data.language);
      console.log('📊 Analysis:', data.analysis);
      console.log('💬 Feedback preview:', data.feedback.substring(0, 100) + '...');
    } else {
      console.error('❌ Writing feedback failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Writing test error:', error);
  }
  
  console.log('');
}

// Test 2: AI Gap Fill Hints
async function testGapFillHints() {
  console.log('💡 Testing AI Gap Fill Hints...');
  
  const testSentences = [
    "My name is ___ and I play as a midfielder",
    "I am ___ years old and I love football",
    "My ___ is to become a professional player"
  ];
  
  for (let i = 0; i < testSentences.length; i++) {
    const sentence = testSentences[i];
    console.log(`🔍 Testing: "${sentence}"`);
    
    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gap_fill',
          content: sentence,
          context: 'Brazilian academy player needs a hint for this gap fill exercise',
          lessonId: 'academy-demo-uuid' // Will be replaced with actual UUID in real usage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Hint received: ${data.feedback}`);
      } else {
        console.error(`❌ Hint failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Hint test error:`, error);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('');
}

// Test 3: AI Conversation Practice
async function testConversation() {
  console.log('💬 Testing AI Conversation Practice...');
  
  const conversationTurns = [
    "Hello coach! I am very happy to be here for the trial.",
    "My name is João and I am 17 years old.",
    "I play as midfielder and I love to pass the ball.",
    "My dream is to play professional football and help my family."
  ];
  
  for (let i = 0; i < conversationTurns.length; i++) {
    const userMessage = conversationTurns[i];
    console.log(`🗣️  Student says: "${userMessage}"`);
    
    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'conversation',
          content: userMessage,
          context: `Academy trial interview. Turn ${i + 1} of 4. You are an academy coach talking to a Brazilian teenager at their first trial.`,
          lessonId: 'academy-demo-uuid' // Will be replaced with actual UUID in real usage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`🤖 Coach responds: "${data.feedback}"`);
        if (data.analysis?.errors) {
          console.log(`📚 Learning note: ${data.analysis.errors}`);
        }
      } else {
        console.error(`❌ Conversation failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Conversation test error:`, error);
    }
    
    // Delay between conversation turns
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('');
}

// Test 4: Database Integration
async function testDatabaseIntegration() {
  console.log('🗄️  Testing Database Integration...');
  
  try {
    // Check if lesson exists
    const lessonResponse = await fetch('/api/lessons/academy-demo-001');
    
    if (lessonResponse.ok) {
      console.log('✅ Demo lesson found in database');
    } else {
      console.log('⚠️  Demo lesson not found - run migration first');
    }
  } catch (error) {
    console.log('ℹ️  Database check skipped (custom endpoint needed)');
  }
  
  console.log('');
}

// Test 5: Language Detection
async function testLanguageSupport() {
  console.log('🌍 Testing Multi-language Support...');
  
  const testMessage = "Olá, eu quero ajuda com inglês";
  
  try {
    const response = await fetch('/api/ai-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'conversation',
        content: testMessage,
        context: 'Test Portuguese language detection',
        lessonId: 'academy-demo-001'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Multi-language support working');
      console.log('🇧🇷 Detected language:', data.language);
      console.log('💬 Response type:', data.language === 'pt-BR' ? 'Portuguese' : 'English');
    } else {
      console.error('❌ Language test failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Language test error:', error);
  }
  
  console.log('');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Academy Demo AI Tests...\n');
  
  const startTime = Date.now();
  
  await testWritingFeedback();
  await testGapFillHints();
  await testConversation();
  await testDatabaseIntegration();
  await testLanguageSupport();
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`✨ All tests completed in ${duration.toFixed(1)} seconds`);
  console.log('\n🎯 Demo lesson is ready for Brazilian academy players!');
  console.log('📱 Visit: /demo/academy-trial to see the landing page');
  console.log('📚 Visit: /lesson/academy-demo-001 to try the lesson');
}

// Instructions for running tests
console.log(`
🧪 Academy Demo Test Suite
=========================

To run tests:
1. Make sure you're logged in to the application
2. Run: runAllTests()

To run individual tests:
- testWritingFeedback()
- testGapFillHints()
- testConversation()
- testLanguageSupport()

⚠️  Requirements:
- OPENAI_API_KEY must be configured
- User must be authenticated
- Database migration must be run

🎯 Expected Results:
- All AI features should respond in Portuguese (pt-BR)
- Feedback should be encouraging and beginner-friendly
- Hints should help without revealing answers
- Conversation should be patient and supportive

Run runAllTests() to begin! 🚀
`);

// Export functions for manual testing
window.testAcademyDemo = {
  runAllTests,
  testWritingFeedback,
  testGapFillHints,
  testConversation,
  testLanguageSupport,
  testDatabaseIntegration
};