"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  options?: string[];
}

interface AgentResponse {
  status: string;
  explanation: string;
  subtopics: string[];
  prerequisites: string[];
  summary: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [activeSubtopic, setActiveSubtopic] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<{ content: string, timestamp: Date }[]>([]);

  useEffect(() => {
    const savedResponse = localStorage.getItem("chatResponse");
    if (savedResponse) {
      try {
        const parsedResponse = JSON.parse(savedResponse);
        if (parsedResponse[0]?.learning_plan) {
          setMessages([{
            role: 'assistant',
            content: parsedResponse[0].learning_plan
          }]);
        }
      } catch (error) {
        console.error("Error parsing response:", error);
      }
      localStorage.removeItem("chatResponse");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError(null);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(`${API_BASE_URL}/process-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: userMessage, current_topic: currentTopic, active_subtopic: activeSubtopic, session_history: sessionHistory }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: AgentResponse = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.explanation || data.summary || "I'm not sure how to respond to that.",
        options: data.subtopics?.length > 0 ? data.subtopics : undefined
      }]);

      setSessionHistory(prev => [...prev, { content: data.summary, timestamp: new Date() }]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = async (option: string) => {
    setInput(option);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>MindFlow Chat</CardTitle>
          {error && (
            <div className="text-red-500 text-sm mt-2">
              Error: {error}
            </div>
          )}
        </CardHeader>
        <CardContent className="h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-xl ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {message.options && message.options.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.options.map((option, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="w-full text-left justify-start"
                          onClick={() => handleOptionClick(option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-4 rounded-xl">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
