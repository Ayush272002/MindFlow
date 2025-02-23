"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MicrophoneIcon,
  PaperAirplaneIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/solid";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/custom/navbar";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [conversationPhase, setConversationPhase] = useState<
    "initial" | "learning" | "questions"
  >("initial");

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

  useEffect(() => {
    const savedResponse = localStorage.getItem("chatResponse");
    if (savedResponse) {
      const parsedResponse = JSON.parse(savedResponse);
      const moduleContent =
        parsedResponse.data[0]?.module || "No content available";
      setMessages([{ id: Date.now(), content: moduleContent, sender: "ai" }]);
      localStorage.removeItem("chatResponse");
    }
  }, []);

  const handleOptionSelect = (option: "learning" | "questions") => {
    setConversationPhase(option);
    const optionMessage: Message = {
      id: Date.now(),
      content:
        option === "learning"
          ? "I'd like to learn more about this topic."
          : "I have some questions about this topic.",
      sender: "user",
    };
    setMessages((prev) => [...prev, optionMessage]);

    const aiResponse: Message = {
      id: Date.now() + 1,
      content:
        option === "learning"
          ? "I'll help you dive deeper into this topic. What specific aspect would you like to explore further?"
          : "I'll be happy to answer your questions. What would you like to know?",
      sender: "ai",
    };
    setMessages((prev) => [...prev, aiResponse]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const newMessage: Message = {
        id: Date.now(),
        content: input,
        sender: "user",
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await axios.post(
          "http://127.0.0.1:5000/process-content",
          {
            notes: input,
            files: [],
            phase: conversationPhase, 
          }
        );

        const moduleContent =
          response.data.data[0]?.module || "No response generated";

        const aiResponse: Message = {
          id: Date.now() + 1,
          content: moduleContent,
          sender: "ai",
        };
        setMessages((prevMessages) => [...prevMessages, aiResponse]);
      } catch (error) {
        console.error("Error:", error);
        const errorMessage: Message = {
          id: Date.now() + 1,
          content: "Sorry, there was an error processing your request.",
          sender: "ai",
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
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

      mediaRecorder.start();
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
                  key={message.id}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                  initial={{
                    opacity: 0,
                    y: 20,
                    x: message.sender === "user" ? 20 : -20,
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
                      message.sender === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.sender === "ai" ? (
                      <div className="relative">
                        <Button
                          onClick={() => toggleSpeech(message.content)}
                          variant="ghost"
                          size="icon"
                          className="absolute -right-12 top-0 h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                          {isSpeaking ? (
                            <SpeakerXMarkIcon className="h-4 w-4" />
                          ) : (
                            <SpeakerWaveIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => (
                              <p
                                className="prose prose-sm max-w-none dark:prose-invert"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </motion.div>
              ))}
              {messages.length === 2 &&
                messages[1].sender === "ai" &&
                conversationPhase === "initial" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center gap-4 mt-4"
                  >
                    <Button
                      onClick={() => handleOptionSelect("learning")}
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100"
                    >
                      Learn More
                    </Button>
                    <Button
                      onClick={() => handleOptionSelect("questions")}
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100"
                    >
                      Ask Questions
                    </Button>
                  </motion.div>
                )}
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
