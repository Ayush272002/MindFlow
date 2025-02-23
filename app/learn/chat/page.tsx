"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MicrophoneIcon, PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/solid"
import { Loader2 } from "lucide-react"
import Navbar from "@/components/custom/navbar"
import axios from "axios"

interface Message {
  id: number
  content: string
  sender: "user" | "ai"
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [recording, setRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const savedResponse = localStorage.getItem("chatResponse");
    if (savedResponse) {
      const parsedResponse = JSON.parse(savedResponse);
      setMessages([
        { id: Date.now(), content: JSON.stringify(parsedResponse, null, 2), sender: "ai" },
      ]);
      localStorage.removeItem("chatResponse");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      const newMessage: Message = {
        id: Date.now(),
        content: input,
        sender: "user",
      }
      setMessages((prevMessages) => [...prevMessages, newMessage])
      setInput("")
      setIsLoading(true)
      
      // Simulate AI response
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const aiResponse: Message = {
          id: Date.now() + 1,
          content: "This is a sample response with LaTeX: $E = mc^2$",
          sender: "ai",
        }
        setMessages((prevMessages) => [...prevMessages, aiResponse])
      } finally {
        setIsLoading(false)
      }
    }
  }

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
        const audioFile = new File([audioBlob], "recorded_audio.wav", { type: "audio/wav" });
        audioChunks.current = [];

        // Send to backend for transcription
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append("file", audioFile);

        try {
          const response = await axios.post("http://127.0.0.1:5000/speech2text", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setInput(prev => prev + (prev ? " " : "") + response.data.text);
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
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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
          <div className="flex-grow overflow-y-auto mb-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 20, x: message.sender === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  layout
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-xl ${
                      message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.content}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[70%] p-4 rounded-xl bg-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-end">
            <div className="relative flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[100px] pr-24 rounded-xl resize-none bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
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
                      className="absolute inset-0 rounded-lg border-2 border-blue-600"
                      initial={{ scale: 1 }}
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [1, 0.5, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
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
            <div ref={messagesEndRef} />
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default Chat

