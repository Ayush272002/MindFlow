"use client";

import { useChat } from "ai/react";
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
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface ChatMessage {
  role: string;
  content: string;
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [learningPlans, setLearningPlans] = useState<string[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  useEffect(() => {
    const savedResponse = localStorage.getItem("chatResponse");
    if (savedResponse) {
      try {
        const parsedResponse = JSON.parse(savedResponse);
        if (parsedResponse.status === "success" && parsedResponse.data) {

          const plans = parsedResponse.data
            .map((item: any) => item.learning_plan)
            .filter(Boolean);
          setLearningPlans(plans);
        }
      } catch (error) {
        console.error("Error parsing response:", error);
      }
      localStorage.removeItem("chatResponse");
    }
  }, []);

  const nextPlan = () => {
    if (currentPlanIndex < learningPlans.length - 1) {
      setCurrentPlanIndex((prev) => prev + 1);
    }
  };

  const prevPlan = () => {
    if (currentPlanIndex > 0) {
      setCurrentPlanIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Learning Plans</CardTitle>
        </CardHeader>
        <CardContent className="h-[70vh] overflow-y-auto">
          {learningPlans.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  onClick={prevPlan}
                  disabled={currentPlanIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous Plan
                </Button>
                <span className="text-sm text-muted-foreground">
                  Plan {currentPlanIndex + 1} of {learningPlans.length}
                </span>
                <Button
                  variant="outline"
                  onClick={nextPlan}
                  disabled={currentPlanIndex === learningPlans.length - 1}
                >
                  Next Plan
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <ReactMarkdown>
                      {learningPlans[currentPlanIndex]}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((m, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    m.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      m.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </span>
                </div>
              ))}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`mb-4 ${
                    m.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      m.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="text-left">
                  <span className="inline-block p-2 rounded-lg bg-gray-200 text-black">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-grow"
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
