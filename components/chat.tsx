'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AgentService } from '@/app/services/agentService';
import { SafetyCheck } from '@/app/types/agents';
import type { OrchestratorResponse, TopicMapperResponse } from '@/app/types/agents';
import ReactMarkdown from 'react-markdown';
import { SafetyStatus, ExplorationAgentOutput } from '../app/types/newAgents';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'exploration' | 'explanation' | 'quiz' | 'feedback' | 'summary';
  options?: string[];
}

interface ChatProps {
  apiKey: string;
}

export function Chat({ apiKey }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentService, setAgentService] = useState<AgentService | null>(null);
  const [currentResponse, setCurrentResponse] = useState<ExplorationAgentOutput | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      setAgentService(new AgentService(apiKey));
    }
  }, [apiKey]);

  const addMessage = (role: 'user' | 'assistant', content: string, type?: Message['type'], options?: string[]) => {
    setMessages(prev => [...prev, { role, content, type, options }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentService) return;

    const userInput = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);
    addMessage('user', userInput);

    try {
      const exploration = await agentService.startNewTopic(userInput);
      
      // Simpler, more robust learning plan format
      const learningPlan = [
        `# ${userInput} Learning Plan`,
        '',
        exploration.summary || 'Let\'s explore this topic.',
        '',
        '## Prerequisites',
        ...(exploration.prerequisites || []).map(p => `- ${p}`),
        exploration.prerequisites?.length ? '' : 'No prerequisites needed.',
        '',
        '## Available Topics',
        ...(exploration.subtopics || []).map((topic, i) => `${i + 1}. ${topic}`),
        '',
        'Please choose a topic number to learn more about it.'
      ].join('\n');

      addMessage('assistant', learningPlan, 'exploration', exploration.subtopics);
      setCurrentResponse(exploration);
      setSelectedSubtopic(null);
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicSelection = async (topic: string) => {
    if (!agentService || !currentResponse) return;

    setIsLoading(true);
    setError(null);
    setSelectedSubtopic(topic);
    addMessage('user', `I'd like to learn about: ${topic}`);

    try {
      const explanation = await agentService.getExplanation(topic);
      addMessage('assistant', explanation.breakdown, 'explanation');
      
      const quiz = await agentService.getQuizQuestion(topic);
      const formattedQuestion = `Based on what you learned about ${topic}, ${quiz.question}`;
      addMessage('assistant', formattedQuestion, 'quiz', quiz.type === 'MCQ' ? quiz.options : undefined);
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizAnswer = async (answer: string) => {
    if (!agentService || !selectedSubtopic) return;

    setIsLoading(true);
    setError(null);
    addMessage('user', answer);

    try {
      const feedback = await agentService.getFeedback(selectedSubtopic, answer);
      addMessage('assistant', feedback.feedback, 'feedback');

      if (feedback.isCorrect && currentResponse?.subtopics) {
        const currentIndex = currentResponse.subtopics.indexOf(selectedSubtopic);
        const nextTopic = currentResponse.subtopics[currentIndex + 1];

        if (nextTopic) {
          const nextPrompt = `\nGreat job! Would you like to learn about "${nextTopic}" next?\n\n1. Yes, continue to next topic\n2. No, I'm done for now`;
          addMessage('assistant', nextPrompt, 'exploration', ['1', '2']);
        } else {
          const summary = await agentService.getSessionSummary();
          addMessage('assistant', summary.updatedContextSummary, 'summary');
          setCurrentResponse(null);
          setSelectedSubtopic(null);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserInput = async (input: string) => {
    if (!currentResponse) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      return;
    }

    if (currentResponse.subtopics) {
      // Check if input is a number corresponding to a topic
      const topicIndex = parseInt(input) - 1;
      if (!isNaN(topicIndex) && topicIndex >= 0 && topicIndex < currentResponse.subtopics.length) {
        handleTopicSelection(currentResponse.subtopics[topicIndex]);
        return;
      }

      // Check if input matches a topic name
      const matchingTopic = currentResponse.subtopics.find(
        topic => topic.toLowerCase() === input.toLowerCase()
      );
      if (matchingTopic) {
        handleTopicSelection(matchingTopic);
        return;
      }
    }

    // If we get here, treat it as a new topic
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${
              message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
            } p-4 rounded-lg`}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.options && (
              <div className="mt-4 grid grid-cols-1 gap-2">
                {message.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => 
                      message.type === 'quiz' 
                        ? handleQuizAnswer(option)
                        : handleUserInput(option)
                    }
                    className="text-left px-4 py-2 bg-white hover:bg-blue-50 border rounded transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-gray-500">Thinking...</div>
        )}
        {error && (
          <div className="text-red-500">{error}</div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your message..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 