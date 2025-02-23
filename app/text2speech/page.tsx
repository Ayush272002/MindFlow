"use client";

import { useState } from "react";

export default function Home() {
    const [text, setText] = useState("");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const fetchAudio = async () => {
        setAudioUrl(null);

        const formData = new FormData();
        if (pdfFile) {
            formData.append("pdf", pdfFile);
        } else {
            formData.append("text", text);
        }

        try {
            const response = await fetch("http://localhost:5000/process-text2speech", {
                method: "POST",
                body: formData, // Handles both text and PDF
            });

            if (!response.ok) {
                throw new Error("Failed to generate audio");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (error) {
            console.error("Error fetching audio:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
            <input
                type="text"
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    setAudioUrl(null);
                    setPdfFile(null); // Reset PDF when typing text
                }}
                placeholder="Enter text"
                className="border px-4 py-2 rounded"
            />
            <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPdfFile(file);
                    setText(""); // Clear text when selecting a PDF
                }}
                className="border px-4 py-2 rounded"
            />
            <button onClick={fetchAudio} className="px-4 py-2 bg-blue-500 text-white rounded">
                Generate Audio
            </button>
            {audioUrl && (
                <audio controls>
                    <source src={audioUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                </audio>
            )}
        </div>
    );
}
