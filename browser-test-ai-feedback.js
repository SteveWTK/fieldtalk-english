// Browser console test for the multi-language AI feedback endpoint
// Copy and paste this into your browser console while logged into the application

async function testMultiLanguageAIFeedback() {
  console.log("🧪 Testing Multi-language AI Feedback Endpoint\n");

  // Test cases for different feedback types
  const testCases = [
    {
      name: "Writing feedback (will use user's preferred language)",
      payload: {
        type: "writing",
        content:
          "I play football very good with my team. We are training hard for win the championship.",
        context: "Describing team training",
        lessonId: "test-lesson-writing",
      },
    },
    {
      name: "Gap fill hint (will use user's preferred language)",
      payload: {
        type: "gap_fill",
        content: "The coach told us to _____ harder during practice.",
        context: "Training vocabulary",
        lessonId: "test-lesson-gap",
      },
    },
    {
      name: "Conversation practice (will use user's preferred language)",
      payload: {
        type: "conversation",
        content: "Coach, I think we need practice more the defense today.",
        context: "Talking to coach about training",
        lessonId: "test-lesson-conversation",
      },
    },
  ];

  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log("Request:", test.payload);

    try {
      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(test.payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log("✅ Response received:");
      console.log("Language:", data.language);
      console.log("Success:", data.success);

      if (test.payload.type === "writing" && data.analysis) {
        console.log("Analysis:", data.analysis);
      } else {
        console.log("Feedback:", data.feedback);
      }

      if (data.analysis?.errors) {
        console.log("Error analysis:", data.analysis.errors);
      }
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
  }

  console.log("\n\n📋 Summary:");
  console.log(
    "The endpoint will automatically detect your preferred_language from the database."
  );
  console.log("If no language is set, it defaults to Portuguese (pt-BR).");
  console.log("Supported languages: pt-BR, es, fr, en");
}

// Function to update user's preferred language (for testing)
async function updatePreferredLanguage(language) {
  console.log(
    `🔄 To test different languages, update your preferred_language in the database to: ${language}`
  );
  console.log("Supported values: pt-BR, es, fr, en");
  console.log(
    "You can do this through your database admin tool or by creating a profile settings page."
  );
}

// Run the test
console.log(
  "To test the AI feedback endpoint, run: testMultiLanguageAIFeedback()"
);
console.log(
  'To see how to change language, run: updatePreferredLanguage("es")'
);

// Auto-run if you want immediate results
testMultiLanguageAIFeedback();
