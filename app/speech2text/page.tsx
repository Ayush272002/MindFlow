"use client";

import {useState, useRef} from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/custom/navbar";

const fadeInUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1]
    }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.3,
            delayChildren: 0.2,
            ease: [0.22, 1, 0.36, 1]
        }
    }
};

const Home: React.FC = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState<string>("");
    const [recording, setRecording] = useState<boolean>(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setAudioFile(event.target.files[0]);
        }
    };

    // Start recording
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

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
                setAudioFile(new File([audioBlob], "recorded_audio.wav", { type: "audio/wav" }));
                audioChunks.current = [];
            };

            mediaRecorder.start();
            setRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    // Send file to Flask backend for transcription
    const handleTranscribe = async () => {
        if (!audioFile) {
            alert("Please select an audio file or record your voice first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", audioFile);

        try {
            const response = await axios.post("http://127.0.0.1:5000/speech2text", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setTranscription(response.data.text);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <main className="min-h-screen bg-[#fafafa]">
            <Navbar loggedIn={false} />
            
            <section className="container mx-auto px-4 py-24">
                <motion.div
                    className="max-w-4xl mx-auto"
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                >
                    <motion.h1
                        className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 text-center"
                        variants={fadeInUp}
                    >
                        Speech to Text
                        <motion.span
                            className="block mt-2 pb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600"
                            variants={fadeInUp}
                        >
                            Conversion
                        </motion.span>
                    </motion.h1>

                    <motion.div
                        className="bg-white rounded-[2.5rem] p-12 shadow-sm"
                        variants={fadeInUp}
                    >
                        <div className="space-y-8">
                            {/* File Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <label
                                    htmlFor="audio-upload"
                                    className="w-full max-w-md p-8 border-2 border-dashed border-gray-300 rounded-2xl text-center cursor-pointer hover:border-blue-500 transition-colors"
                                >
                                    <div className="text-gray-600">
                                        Click to upload audio or drag and drop
                                        {audioFile && <p className="mt-2 text-blue-600">{audioFile.name}</p>}
                                    </div>
                                </label>
                                <input
                                    id="audio-upload"
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </div>

                            {/* Voice Recording */}
                            <div className="flex justify-center gap-4">
                                <Button
                                    onClick={recording ? stopRecording : startRecording}
                                    className={`px-8 py-6 text-lg rounded-xl ${
                                        recording
                                            ? "bg-red-500 hover:bg-red-600"
                                            : "bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90"
                                    } text-white`}
                                >
                                    {recording ? "Stop Recording" : "Start Recording"}
                                </Button>

                                <Button
                                    onClick={handleTranscribe}
                                    className="px-8 py-6 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 text-white"
                                    disabled={!audioFile}
                                >
                                    Transcribe
                                </Button>
                            </div>

                            {/* Transcription Result */}
                            {transcription && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 p-6 bg-gray-50 rounded-xl"
                                >
                                    <h2 className="text-2xl font-semibold mb-4 text-gray-900">Transcription:</h2>
                                    <p className="text-lg text-gray-700 whitespace-pre-wrap">{transcription}</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </section>
        </main>
    );
};

export default Home;