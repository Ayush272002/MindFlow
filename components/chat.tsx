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

    console.log('\n=== New Topic Submission ===');
    console.log('User input:', input.trim());
    
    const userInput = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);
    addMessage('user', userInput);

    try {
      console.log('Starting new topic...');
      const response = await agentService.startNewTopic(userInput);
      
      // Handle safety/moderation responses
      if (response.status === SafetyStatus.INAPPROPRIATE || response.status === SafetyStatus.NEEDS_HELP) {
        console.log('Safety check status:', response.status);
        addMessage('assistant', response.explanation || 'I cannot help with that request.');
        setCurrentResponse(null);
        setSelectedSubtopic(null);
        return;
      }
      
      // Handle normal exploration response
      console.log('Building learning plan...');
      const learningPlan = [
        `# ${userInput} Learning Plan`,
        '',
        response.summary || 'Let\'s explore this topic.',
        '',
        '## Prerequisites',
        ...(response.prerequisites || []).map(p => `- ${p}`),
        response.prerequisites?.length ? '' : 'No prerequisites needed.',
        '',
        '## Available Topics',
        ...(response.subtopics || []).map((topic, i) => `${i + 1}. ${topic}`),
        '',
        'Please choose a topic number to learn more about it.'
      ].join('\n');

      addMessage('assistant', learningPlan, 'exploration', response.subtopics);
      setCurrentResponse(response);
      setSelectedSubtopic(null);
      
      console.log('Learning plan created with topics:', response.subtopics);
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicSelection = async (topic: string) => {
    if (!agentService || !currentResponse) return;

    console.log('\n=== Topic Selection ===');
    console.log('Selected topic:', topic);
    
    setIsLoading(true);
    setError(null);
    setSelectedSubtopic(topic);
    addMessage('user', `I'd like to learn about: ${topic}`);

    try {
      console.log('Fetching explanation...');
      const explanation = await agentService.getExplanation(topic);
      addMessage('assistant', explanation.breakdown, 'explanation');
      
      console.log('Generating quiz...');
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

    console.log('\n=== Quiz Answer ===');
    console.log('Selected answer:', answer);
    console.log('Current subtopic:', selectedSubtopic);
    
    setIsLoading(true);
    setError(null);
    addMessage('user', answer);

    try {
      console.log('Getting feedback...');
      const feedback = await agentService.getFeedback(selectedSubtopic, answer);
      addMessage('assistant', feedback.feedback, 'feedback');

      if (feedback.isCorrect && currentResponse?.subtopics) {
        const currentIndex = currentResponse.subtopics.indexOf(selectedSubtopic);
        const nextTopic = currentResponse.subtopics[currentIndex + 1];

        console.log('Feedback result:', feedback.isCorrect ? 'Correct' : 'Incorrect');
        console.log('Next topic available:', nextTopic ? 'Yes' : 'No');

        if (nextTopic) {
          const nextPrompt = `Great job! Would you like to learn about "${nextTopic}" next?`;
          const options = [
            'Yes, continue to next topic',
            'No, I\'m done for now'
          ];
          addMessage('assistant', nextPrompt, 'exploration', options);
        } else {
          console.log('Getting session summary...');
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
    console.log('\n=== User Input ===');
    console.log('Input:', input);
    console.log('Current state:', {
      hasCurrentResponse: !!currentResponse,
      selectedSubtopic,
      awaitingAnswer: currentResponse?.subtopics && selectedSubtopic
    });

    if (!currentResponse || !agentService) {
      console.log('No current response, treating as new topic');
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
      return;
    }

    // Handle "Yes/No" responses for continuing to next topic
    if (input === 'Yes, continue to next topic' && currentResponse.subtopics && selectedSubtopic) {
      console.log('User chose to continue to next topic');
      const currentIndex = currentResponse.subtopics.indexOf(selectedSubtopic);
      const nextTopic = currentResponse.subtopics[currentIndex + 1];
      if (nextTopic) {
        console.log('Moving to next topic:', nextTopic);
        handleTopicSelection(nextTopic);
        return;
      }
    }
    
    if (input === 'No, I\'m done for now') {
      console.log('User chose to end session');
      const summary = await agentService.getSessionSummary();
      addMessage('assistant', summary.updatedContextSummary, 'summary');
      setCurrentResponse(null);
      setSelectedSubtopic(null);
      return;
    }

    if (currentResponse.subtopics) {
      // Check if input matches a topic name
      const matchingTopic = currentResponse.subtopics.find(
        topic => topic.toLowerCase() === input.toLowerCase()
      );
      if (matchingTopic) {
        console.log('Found matching topic:', matchingTopic);
        handleTopicSelection(matchingTopic);
        return;
      }

      // Check if input is a number corresponding to a topic
      const topicIndex = parseInt(input) - 1;
      if (!isNaN(topicIndex) && topicIndex >= 0 && topicIndex < currentResponse.subtopics.length) {
        console.log('Found topic by index:', currentResponse.subtopics[topicIndex]);
        handleTopicSelection(currentResponse.subtopics[topicIndex]);
        return;
      }
    }

    console.log('No matching topic found, treating as new topic');
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