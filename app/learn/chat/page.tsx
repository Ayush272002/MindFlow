"use client";

import type React from "react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ComponentPropsWithoutRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  StopIcon,
} from "@heroicons/react/24/solid";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/custom/navbar";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // refs for DOM manipulation and audio handling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handles automatic scrolling to bottom of chat; TODO: ensure this actually works
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Load any saved chat responses from localStorage
  useEffect(() => {
    const savedResponse = localStorage.getItem("chatResponse");
    if (savedResponse) {
      const parsedResponse = JSON.parse(savedResponse);
      const moduleContent =
        parsedResponse.explanation ||
        parsedResponse.response ||
        parsedResponse.summary ||
        "No content available";
      setMessages([{ role: "assistant", content: moduleContent }]);
      localStorage.removeItem("chatResponse");
    }
  }, []);

  // handle form submission and API interaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // TODO: Add error handling for network issues
      const response = await axios.post(
        "http://127.0.0.1:5000/process-interaction",
        {
          input: input,
        }
      );

      const aiContent =
        response.data.explanation ||
        response.data.response ||
        response.data.summary ||
        response.data.learning_plan ||
        response.data.feedback ||
        "Sorry, I couldn't generate a response";

      const aiMessage: Message = {
        role: "assistant",
        content: aiContent,
        options: response.data.subtopics
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);

      const errorMessage: Message = {
        role: "assistant",
        content: "Oops! Something went wrong. Please try again.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      // Process recorded audio when stopped
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        const audioFile = new File([audioBlob], "recorded_audio.wav", {
          type: "audio/wav",
        });
        audioChunks.current = [];

        // Send to backend for transcription
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append("file", audioFile);

        try {
          const response = await axios.post(
            "http://127.0.0.1:5000/speech2text",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
          setInput((prev) => prev + (prev ? " " : "") + response.data.text);
        } catch (error) {
          console.error("Error:", error);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      // Stop all tracks on the stream
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const toggleSpeech = async (text: string) => {
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsSpeaking(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("text", text);

      const response = await axios.post(
        "http://127.0.0.1:5000/process-text2speech",
        formData,
        {
          responseType: "blob",
        }
      );

      const audioBlob = new Blob([response.data], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.play();
        setIsSpeaking(true);
      }
    } catch (error) {
      console.error("Error generating speech:", error);
      setIsSpeaking(false);
    }
  };

  const handleExplainMore = async (content: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/process-interaction",
        {
          input: `Please explain this more deeply: ${content}`,
        }
      );

      const aiContent =
        response.data.explanation ||
        response.data.response ||
        "I couldn't generate a deeper explanation";

      const aiMessage: Message = {
        role: "assistant",
        content: aiContent,
        options: response.data.subtopics
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't generate a deeper explanation.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestKnowledge = async (content: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/process-interaction",
        {
          input: `Please create a quick test to verify understanding of this content: ${content}`,
        }
      );

      const aiContent =
        response.data.explanation ||
        response.data.response ||
        "I couldn't generate a test";

      const aiMessage: Message = {
        role: "assistant",
        content: aiContent,
        options: response.data.subtopics
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't generate a test.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = async (option: string) => {
    setInput(option);
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  const handleInteractiveQuestions = async (content: string) => {
    setIsLoading(true);
    console.log("handling interactive question");
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/process-interaction",
        {
          input: `Generate a quiz about the following content:\n\n${content}`
        }
      );

      const aiContent =
        response.data.explanation ||
        response.data.response ||
        "I couldn't generate interactive questions";

      const aiMessage: Message = {
        role: "assistant",
        content: aiContent,
        options: response.data.subtopics
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't generate interactive questions.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar loggedIn={true} />
      <motion.div
        className="bg-white flex flex-col flex-grow rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-blue-100/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col h-full">
          <div
            ref={containerRef}
            className="messages-container flex-grow overflow-y-auto mb-4 space-y-4 pb-[160px]"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  initial={{
                    opacity: 0,
                    y: 20,
                    x: message.role === "user" ? 20 : -20,
                  }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: { duration: 0.2 },
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  layout
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-xl ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ children }) => (
                              <div className="prose prose-sm max-w-none dark:prose-invert mb-4">
                                {children}
                              </div>
                            ),
                            code: ({
                              className,
                              children,
                            }: ComponentPropsWithoutRef<"code"> & {
                              className?: string;
                            }) =>
                              className?.includes("language-") ? (
                                <pre>
                                  <code className={className}>{children}</code>
                                </pre>
                              ) : (
                                <code>{children}</code>
                              ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
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
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleExplainMore(message.content)}
                          >
                            Learn More
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() =>
                              handleInteractiveQuestions(message.content)
                            }
                          >
                            Take Quiz
                          </Button>
                        </div>
                      </>
                    ) : (
                      message.content
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[70%] p-4 rounded-xl bg-gray-100">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              <div key="scroll-anchor" ref={messagesEndRef} className="h-0" />
            </AnimatePresence>
          </div>

          <form
            onSubmit={handleSubmit}
            className="fixed bottom-0 left-0 right-0 p-6"
          >
            <div className="max-w-[1200px] mx-auto relative">
              <div className="absolute inset-0 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg -z-10" />
              <div className="relative flex items-end">
                <div className="relative flex-1">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Type your message here..."
                    className="min-h-[100px] p-4 pr-24 rounded-xl resize-none bg-transparent border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <div className="relative">
                      <Button
                        type="button"
                        onClick={recording ? stopRecording : startRecording}
                        disabled={isTranscribing}
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 rounded-lg transition-colors ${
                          recording
                            ? "text-red-500 bg-red-50 hover:bg-red-100"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {recording ? (
                          <StopIcon className="h-5 w-5" />
                        ) : isTranscribing ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <MicrophoneIcon className="h-5 w-5" />
                        )}
                      </Button>
                      {isTranscribing && (
                        <motion.div
                          className="absolute inset-0 rounded-lg border border-blue-400/50"
                          animate={{ opacity: [0.5, 1] }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "reverse",
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </div>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      disabled={!input.trim() || isLoading}
                      className={`h-9 w-9 rounded-lg transition-colors ${
                        input.trim()
                          ? "text-blue-600 hover:bg-blue-50"
                          : "text-gray-400"
                      }`}
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default Chat;