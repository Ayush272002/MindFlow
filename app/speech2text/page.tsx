"use client";

import {useState, useRef} from "react";
import axios from "axios";

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
        <div>
            <h1>Speech-to-Text</h1>

            {/* File Upload */}
            <input type="file" accept="audio/*" onChange={handleFileUpload} />

            {/* Voice Recording */}
            <button onClick={recording ? stopRecording : startRecording}>
                {recording ? "Stop Recording" : "Start Recording"}
            </button>

            {/* Transcribe */}
            <button onClick={handleTranscribe}>Transcribe</button>

            <h2>Transcription:</h2>
            <p>{transcription}</p>
        </div>
    );
};

export default Home;