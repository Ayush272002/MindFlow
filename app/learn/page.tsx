"use client";

import type React from "react";

import { useState } from "react";
import { Upload, Loader2, Sparkles, Book, Video, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Navbar from "@/components/custom/navbar";

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1],
  },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function UploadModule() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState("");

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    setProgress(0);

    for (const file of files) {
      const validTypes = [
        "application/pdf",
        "video/mp4",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];

      if (!validTypes.includes(file.type)) {
        toast.error("Please upload PDF, PPT, PPTX or MP4 files only");
        setUploading(false);
        return;
      }

      try {
        await simulateFileUpload(file);
        toast.success(`${file.name} has been converted to a learning module`, {
          icon: <Sparkles className="w-4 h-4" />,
        });
      } catch {
        toast.error("There was an error processing your file");
      }
    }

    setUploading(false);
    setProgress(0);
  };

  // eslint-disable-next-line
  const simulateFileUpload = async (file: File) => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setProgress(progress);
        if (progress === 100) {
          clearInterval(interval);
          resolve(true);
        }
      }, 500);
    });
  };

  const conversations = [
    {
      id: 1,
      title: "Neural Networks & Deep Learning",
      description:
        "Exploring activation functions, backpropagation, and CNN architectures",
      timestamp: "2 min ago",
      icon: "🧠",
      color: "from-purple-600/5 to-blue-600/5",
      progress: 85,
    },
    {
      id: 2,
      title: "Quantum Mechanics Basics",
      description: "Wave functions, Schrödinger equation, and quantum states",
      timestamp: "1 hour ago",
      icon: "⚛️",
      color: "from-blue-600/5 to-cyan-600/5",
      progress: 92,
    },
    {
      id: 3,
      title: "Financial Markets & Trading",
      description: "Options trading, market analysis, and risk management",
      timestamp: "3 hours ago",
      icon: "📈",
      color: "from-green-600/5 to-emerald-600/5",
      progress: 78,
    },
  ];

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error("Please add some notes or upload content");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await simulateFileUpload(new File([""], "notes.txt"));
      toast.success("Your content is being processed", {
        icon: <Sparkles className="w-4 h-4" />,
      });
      setNotes("");
    } catch {
      toast.error("There was an error processing your content");
    }

    setUploading(false);
    setProgress(0);
  };

  return (
    <>
      <Navbar loggedIn={true} />

      <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-blue-50/30 px-4 pt-16 pb-8">
        <motion.div
          className="container mx-auto px-4 space-y-8"
          initial="initial"
          animate="animate"
          variants={{
            animate: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          <motion.div
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 mb-6"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Powered by AI</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Transform Your Content Into
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 pb-2">
                Interactive Learning
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              Upload your resources and watch AI transform them into engaging
              experiences
            </p>
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-blue-100/50"
          >
            <div className="grid md:grid-cols-2 gap-8">
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center space-y-6 transition-all duration-200",
                  isDragging
                    ? "border-blue-600 bg-blue-50/50 scale-[0.99]"
                    : "border-gray-200",
                  uploading && "opacity-50 pointer-events-none"
                )}
              >
                <motion.div
                  className="flex flex-col items-center gap-4"
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    className="h-20 w-20 bg-gradient-to-tr from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center"
                    animate={{
                      boxShadow: isDragging
                        ? "0 0 0 3px rgba(37, 99, 235, 0.1)"
                        : "0 0 0 0px rgba(37, 99, 235, 0)",
                    }}
                  >
                    <Upload className="h-10 w-10 text-blue-600" />
                  </motion.div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      Drop your files here
                    </p>
                    <p className="text-gray-600 mt-2">
                      or click to select files
                    </p>
                  </div>
                </motion.div>

                <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>PDFs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Book className="w-4 h-4" />
                    <span>Presentations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Video className="w-4 h-4" />
                    <span>Videos</span>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    onChange={onFileSelect}
                    accept=".pdf,.ppt,.pptx,.mp4"
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    asChild
                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 px-8 py-6 text-lg rounded-xl"
                  >
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Select Files
                    </label>
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">
                    Add notes or description
                  </label>
                  <Textarea
                    placeholder="What would you like to learn? Describe your topic or paste your content here..."
                    className="min-h-[300px] rounded-xl resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 py-6 text-lg rounded-xl"
                    disabled={uploading}
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles className="w-5 h-5" />
                      Start Learning
                    </motion.div>
                  </Button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {uploading && (
                <motion.div
                  className="mt-8 space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center gap-3 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-lg font-medium">
                      Processing your content...
                    </p>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2.5 bg-blue-100 rounded-full"
                  />
                  <div className="text-sm text-gray-500">
                    This might take a few minutes depending on the content size
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-blue-100/50"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Recent Conversations</h2>
              <Button variant="ghost" className="text-blue-600">
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  className="group relative rounded-2xl bg-gradient-to-tr from-gray-50 to-blue-50 p-6 hover:shadow-lg transition-shadow"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded-2xl bg-gradient-to-r",
                      conv.color
                    )}
                  />
                  <div className="relative h-full flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="h-12 w-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center text-2xl">
                        {conv.icon}
                      </div>
                      <div className="text-sm text-gray-500">
                        {conv.timestamp}
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {conv.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {conv.description}
                    </p>
                    <div className="mt-auto space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium text-gray-900">
                          {conv.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-600 to-violet-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${conv.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto"
                      >
                        Continue Learning →
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
