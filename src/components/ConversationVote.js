"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useParams } from "next/navigation";
import {
  voteForLessonTopic,
  hasUserVotedInStep,
  getStepVoteResults,
} from "@/lib/supabase/schools-queries";

export default function ConversationVote({ step, onComplete }) {
  const { user } = useAuth();
  const params = useParams();
  const lessonId = params?.id;

  const [topics, setTopics] = useState([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedTopicIndex, setVotedTopicIndex] = useState(null);
  const [voting, setVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [voteResults, setVoteResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVotingData();
  }, [step, user, lessonId]);

  useEffect(() => {
    if (step.vote_deadline) {
      updateCountdown();
      const timer = setInterval(() => {
        updateCountdown();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step.vote_deadline]);

  async function loadVotingData() {
    if (!user?.id || !step.topics || !lessonId) {
      setLoading(false);
      return;
    }

    try {
      setTopics(step.topics || []);

      const deadline = new Date(step.vote_deadline);
      const now = new Date();
      const isPastDeadline = now > deadline;
      setDeadlinePassed(isPastDeadline);

      const userVote = await hasUserVotedInStep(lessonId, step.id, user.id);
      if (userVote) {
        setHasVoted(true);
        setVotedTopicIndex(userVote.topic_index);
      }

      if (isPastDeadline || userVote) {
        await loadResults();
      }
    } catch (error) {
      console.error("Error loading voting data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResults() {
    try {
      const results = await getStepVoteResults(lessonId, step.id);

      let totalVotes = 0;
      Object.values(results).forEach(count => {
        totalVotes += count;
      });

      setVoteResults({ ...results, total: totalVotes });
    } catch (error) {
      console.error("Error loading results:", error);
    }
  }

  function updateCountdown() {
    if (!step.vote_deadline) return;

    const deadline = new Date(step.vote_deadline);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      setDeadlinePassed(true);
      setTimeRemaining("Voting has ended");
      loadResults();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let countdown = "";
    if (days > 0) countdown += `${days}d `;
    if (hours > 0 || days > 0) countdown += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) countdown += `${minutes}m `;
    countdown += `${seconds}s`;

    setTimeRemaining(countdown);
  }

  async function handleVote() {
    if (selectedTopicIndex === null || !user?.id || !lessonId) return;

    try {
      setVoting(true);

      await voteForLessonTopic(
        lessonId,
        step.id,
        selectedTopicIndex,
        user.id,
        user.class_id || null
      );

      setHasVoted(true);
      setVotedTopicIndex(selectedTopicIndex);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      alert("Failed to submit vote. Please try again.");
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (hasVoted && !deadlinePassed) {
    return (
      <div className="text-center py-8">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
          <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Vote Submitted!
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Thank you for voting for <strong>{topics[votedTopicIndex]?.title}</strong>. Results will be revealed after the deadline.
          </p>
          {timeRemaining && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Results in: {timeRemaining}</span>
            </div>
          )}
        </div>
        {onComplete && (
          <button
            onClick={onComplete}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  if (deadlinePassed) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Voting Results
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {voteResults.total || 0} total vote{voteResults.total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-4">
          {topics.map((topic, index) => {
            const votes = voteResults[index] || 0;
            const percentage = voteResults.total > 0
              ? Math.round((votes / voteResults.total) * 100)
              : 0;

            const maxVotes = Math.max(...Object.values(voteResults).filter(v => typeof v === 'number'));
            const isWinner = votes === maxVotes && votes > 0;
            const isUserChoice = index === votedTopicIndex;

            return (
              <div
                key={index}
                className={`p-6 rounded-lg border-2 ${
                  isWinner
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : isUserChoice
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {topic.title}
                    {isWinner && (
                      <span className="ml-2 text-sm font-medium text-green-600 dark:text-green-400">
                        🏆 Winner!
                      </span>
                    )}
                    {isUserChoice && !isWinner && (
                      <span className="ml-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                        Your choice
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{votes}</span>
                  </div>
                </div>
                {topic.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {topic.description}
                  </p>
                )}
                <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                      isWinner
                        ? "bg-green-500"
                        : isUserChoice
                        ? "bg-blue-500"
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {percentage}%
                </p>
              </div>
            );
          })}
        </div>

        {onComplete && (
          <button
            onClick={onComplete}
            className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {step.title || "Choose a Topic"}
        </h3>
        {step.content && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {step.content}
          </p>
        )}
        {timeRemaining && timeRemaining !== "Voting has ended" && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Time remaining: {timeRemaining}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {topics.map((topic, index) => (
          <button
            key={index}
            onClick={() => setSelectedTopicIndex(index)}
            className={`w-full p-6 rounded-lg border-2 text-left transition-all ${
              selectedTopicIndex === index
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedTopicIndex === index
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {selectedTopicIndex === index && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {topic.title}
                </h4>
                {topic.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {topic.description}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleVote}
        disabled={selectedTopicIndex === null || voting}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {voting ? "Submitting..." : "Submit Vote"}
      </button>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> You can only vote once. Choose carefully! Results will be shown after the deadline.
        </p>
      </div>
    </div>
  );
}