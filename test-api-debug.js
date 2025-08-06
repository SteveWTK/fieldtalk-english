// Debug test for AI feedback endpoint
// Run this in the browser console while logged in

async function debugAIFeedback() {
  console.log('🔍 Starting debug tests...\n');
  
  // Test 1: Check database connection
  console.log('Test 1: Database Connection');
  try {
    const dbResponse = await fetch('/api/test-db');
    const dbData = await dbResponse.json();
    
    if (dbData.success) {
      console.log('✅ Database connection successful');
      console.log('User ID:', dbData.userId);
      console.log('Player data:', dbData.playerData);
      console.log('Has preferred_language field:', dbData.hasPreferredLanguage);
    } else {
      console.error('❌ Database test failed:', dbData);
    }
  } catch (error) {
    console.error('❌ Database test error:', error);
  }
  
  // Test 2: Simple AI feedback request
  console.log('\nTest 2: AI Feedback Endpoint');
  try {
    const response = await fetch('/api/ai-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'gap_fill',
        content: 'The coach told us to _____ harder.',
        context: 'Training',
        lessonId: 'test-1'
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Response not OK:', response.status, response.statusText);
      console.error('Response body:', text);
      
      // Try to parse as JSON if possible
      try {
        const errorData = JSON.parse(text);
        console.error('Error details:', errorData);
      } catch {
        // Not JSON, already logged as text
      }
    } else {
      const data = await response.json();
      console.log('✅ AI Feedback successful');
      console.log('Language used:', data.language);
      console.log('Feedback:', data.feedback);
    }
  } catch (error) {
    console.error('❌ AI Feedback error:', error);
  }
  
  console.log('\n📋 Debug complete. Check the logs above for issues.');
}

// Run immediately
debugAIFeedback();