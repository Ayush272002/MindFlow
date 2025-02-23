import os
import json
import requests
from dotenv import load_dotenv
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain.document_loaders import PyPDFLoader
from werkzeug.utils import secure_filename
import kokoro
from kokoro import KPipeline
from IPython.display import display, Audio
import soundfile as sf
import numpy as np
import re
import pdfplumber
import google.generativeai as genai
import torch
import io
import os


pipeline = KPipeline(lang_code='a')

from agents import AgentService, SafetyStatus

load_dotenv()
app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600
    }
})

# Initialize the agent service
agent_service = AgentService(api_key=os.environ.get('GEMINI_API_KEY'))

# Set up downloads directory for storing PDFs
DOWNLOADS_DIR = "downloads/"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def download_file(file_url):
    print(file_url)
    print(file_url.split("/"))
    local_filename = DOWNLOADS_DIR + file_url.split("/")[-2] + ".pdf"

    try:
        response = requests.get(file_url, stream=True)
        response.raise_for_status()

        with open(local_filename, "wb") as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)

        return local_filename
    except requests.exceptions.RequestException as e:
        print(f"Error downloading file: {e}")
        return None


def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    text = "\n".join([page.page_content for page in pages])
    return text


def process_with_gemini(text):
    """Generate a structured learning plan using Gemini (strictly 200 words)."""
    model = genai.GenerativeModel("gemini-pro")
    prompt = f"Create an interactive learning module from this content. Use LaTeX for mathematical expressions and wrap them in single or double dollar signs if required. Use markdown for other content:\n\n{text}"
    
    try:
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        print(f"Error processing with Gemini: {e}")
        return None

def split_text_for_rag(text):
    """Split the text into smaller chunks for RAG processing."""
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    return text_splitter.split_text(text)

@app.route('/process-interaction', methods=['POST'])
def process_interaction():
    """Process user interaction with the AI agents."""
    try:
        data = request.json
        user_input = data.get('input')

        if not user_input:
            return jsonify({
                'error': 'No input provided'
            }), 400

        current_topic = data.get('current_topic')
        active_subtopic = data.get('active_subtopic')
        session_history = data.get('session_history')

        # Process the interaction through the agent service
        response = agent_service.start_new_topic(user_input, current_topic=current_topic, active_subtopic=active_subtopic, session_history=session_history)

        # Convert the response to a dictionary
        response_dict = response.to_dict()

        return jsonify(response_dict)

    except Exception as e:
        print(f"Error processing interaction: {e}")
        return jsonify({
            'error': str(e)
        }), 500

def generate_audio(text):
    generator = pipeline(
        text, voice='af_heart', # <= change voice here
        speed=1
    )
    all_audio = []
    for i, (gs, ps, audio) in enumerate(generator):
        print(i)
        print(gs)
        print(ps)
        all_audio.append(audio)
    final_audio = np.concatenate(all_audio)
    return final_audio

@app.route("/process-text2speech", methods=["POST"])
def process_text2speech():
    text = ""

    if "pdf" in request.files:
        file = request.files["pdf"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        text = ""
        with pdfplumber.open(file) as pdf:
            text = " ".join(page.extract_text() for page in pdf.pages)
        print(text)
        text = re.sub(r"(\w+)\s*\n\s*(\w+)", r"\1 \2", text)
        print(text)
    else:
        text = request.form.get("text", "").strip()
        print(text)

    if not text:
        return jsonify({"error": "No text provided"}), 400

    audio = generate_audio(text)

    wav_file = io.BytesIO()
    sf.write(wav_file, audio, 24000, format='WAV')
    wav_file.seek(0)
    return send_file(wav_file, mimetype='audio/wav', as_attachment=False)


def is_valid_pdf(file_url):
    """Check if the file is a valid PDF."""
    try:
        # Check file extension
        if not file_url.lower().endswith('.pdf'):
            return False
            
        # Download and verify file content
        response = requests.get(file_url, stream=True)
        response.raise_for_status()
        
        # Check the magic numbers for PDF
        magic_numbers = response.raw.read(4)
        return magic_numbers.startswith(b'%PDF')
    except:
        return False

@app.route('/process-content', methods=['POST'])
def process_content():
    """Process uploaded content."""
    try:
        data = request.json
        notes = data.get('notes', '')
        files = data.get('files', [])

        # Process files if any
        processed_files = []
        all_text = []
        
        # Add notes if provided
        if notes.strip():
            all_text.append(notes)

        # Process each file
        for file_url in files:
            # Validate PDF
            if not is_valid_pdf(file_url):
                return jsonify({
                    'error': f'Invalid or unsupported file format. Only PDF files are allowed.'
                }), 400
                
            local_file = download_file(file_url)
            if local_file:
                processed_files.append(local_file)
                try:
                    text = extract_text_from_pdf(local_file)
                    if text:
                        all_text.append(text)
                except Exception as e:
                    print(f"Error extracting text from PDF: {e}")
                    return jsonify({
                        'error': 'Could not extract text from PDF. Please ensure it is a valid PDF file with extractable text.'
                    }), 400

        # If no content was processed, return error
        if not all_text:
            return jsonify({
                'error': 'No content could be processed'
            }), 400

        # Combine all text and process with Gemini
        combined_text = "\n\n".join(all_text)
        processed_content = process_with_gemini(combined_text)

        if not processed_content:
            return jsonify({
                'error': 'Failed to process content with AI'
            }), 500

        # Return the processed content
        return jsonify({
            'response': processed_content,
            'status': 'success'
        })

    except Exception as e:
        print(f"Error processing content: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route("/get-summary", methods=["GET"])
def get_summary():
    """Get a summary of the current learning session."""
    summary = agent_service.get_session_summary()
    return jsonify(summary.to_dict())
# Load Whisper Model
# TODO: Add error handling for model loading
model_path = os.path.join(app.root_path, 'model/whisper_model.pt')
model = torch.load(model_path, weights_only=False)  # Load speech recognition model

@app.route('/speech2text', methods=['POST'])
def transcribe():
    """Converts speech audio to text using Whisper model"""
    temp_file = "temp_audio.wav"

    # Handle both file upload and direct audio recording
    if 'file' in request.files:
        file = request.files['file']
        file.save(temp_file)

    elif request.data:
        # If the request contains raw binary audio data (recorded audio)
        with open(temp_file, "wb") as f:
            f.write(request.data)

    else:
        return jsonify({"error": "No audio data received"}), 400

    # Convert speech to text
    result = model.transcribe(temp_file)
    os.remove(temp_file)  # Clean up temporary file after processing

    return jsonify({"text": result["text"]})

if __name__ == "__main__":
    app.run(debug=True)
