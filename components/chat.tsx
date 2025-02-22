'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AgentService } from '@/app/services/agentService';
import { SafetyCheck } from '@/app/types/agents';
import type { OrchestratorResponse } from '@/app/types/agents';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  apiKey: string;
  userIp?: string;
}

export function Chat({ apiKey, userIp }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentService, setAgentService] = useState<AgentService | null>(null);

  useEffect(() => {
    // Initialize AgentService
    setAgentService(new AgentService(apiKey, userIp));
  }, [apiKey, userIp]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      role,
      content,
      timestamp: new Date()
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentService) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);
    addMessage('user', userMessage);

    try {
      // First check content safety
      const safetyCheck = await agentService.checkContentSafety(userMessage);
      
      if (safetyCheck.status !== SafetyCheck.SAFE) {
        if (safetyCheck.supportiveMessage) {
          addMessage('assistant', safetyCheck.supportiveMessage);
        } else {
          addMessage('assistant', safetyCheck.explanation);
        }
        setError('Please ensure your message is appropriate and educational.');
        return;
      }

      // If this is a new topic, start a new learning session
      const response = await agentService.startNewTopic(userMessage);
      
      // Show only the next step to the user
      addMessage('assistant', response.userPrompt);

    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your request. Please try again.');
      addMessage('assistant', 'I apologize, but I encountered an error. Could you please try rephrasing your question?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div dangerouslySetInnerHTML={{ __html: message.content }} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 mb-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What would you like to learn about?"
            className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
} 