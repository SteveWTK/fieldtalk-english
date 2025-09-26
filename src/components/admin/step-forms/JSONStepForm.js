"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function JSONStepForm({ step, onChange, stepType }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(step, null, 2));
  const [error, setError] = useState(null);

  const handleJSONChange = (value) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setError(null);
      onChange(parsed);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const stepTypeTemplates = {
    interactive_pitch: {
      title: "Learn the Positions",
      content: "Click on each position to learn where players play.",
      interactive_config: {
        pitch_type: "positions",
        click_areas: [
          {
            x: "50%",
            y: "50%",
            id: "midfielder",
            label: "Midfielder",
            audio_url: "/audio/positions/midfielder.mp3",
            description: "Controls the game",
            translation: "Meio-campista"
          }
        ],
        instruction: "Click on each position"
      }
    },
    interactive_game: {
      title: "Pass the Ball",
      content: "Listen and click where the ball should go!",
      game_config: {
        type: "ball_following",
        commands: [
          {
            text: "Pass to the striker",
            target: "striker",
            audio_url: "/audio/commands/pass.mp3",
            translation: "Passe para o atacante",
            success_message: "Great pass!"
          }
        ]
      }
    },
    ai_conversation: {
      title: "Conversation Practice",
      content: "Have a conversation",
      scenario: "Training ground conversation",
      context: "Speaking with teammates",
      expected_turns: 5
    },
    ai_listening_challenge: {
      title: "Listening Challenge",
      content: "Listen and respond",
      audio_url: "/audio/challenge.mp3",
      questions: [
        {
          question: "What did you hear?",
          type: "multiple_choice",
          options: ["Option 1", "Option 2"],
          correct_answer: "Option 1"
        }
      ]
    }
  };

  const loadTemplate = () => {
    const template = stepTypeTemplates[stepType] || {};
    const withId = { ...template, id: step.id, type: stepType };
    const formatted = JSON.stringify(withId, null, 2);
    setJsonText(formatted);
    handleJSONChange(formatted);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>JSON Editor Mode:</strong> This step type requires complex configuration.
          Edit the JSON directly or use the template button to start with a basic structure.
        </p>
        <button
          type="button"
          onClick={loadTemplate}
          className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Load Template for {stepType}
        </button>
      </div>

      <div className="relative">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Step Configuration (JSON)
          </label>
          <button
            type="button"
            onClick={formatJSON}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
          >
            Format JSON
          </button>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => handleJSONChange(e.target.value)}
          rows={20}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          style={{ fontFamily: 'monospace' }}
        />
      </div>

      {error ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Invalid JSON</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">Valid JSON</p>
        </div>
      )}
    </div>
  );
}