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


# add right language
pipeline = KPipeline(lang_code='a')

load_dotenv()
app = Flask(__name__)
CORS(app)

# genai.configure(api_key=f"{os.environ.get('GEMINI_API_KEY')}")

DOWNLOADS_DIR = "downloads/"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# # def download_file(file_url):
# #     print(file_url)
# #     print(file_url.split("/"))
# #     local_filename = DOWNLOADS_DIR + file_url.split("/")[-2] + ".pdf"
# #
# #     try:
# #         response = requests.get(file_url, stream=True)
# #         response.raise_for_status()  # Handle HTTP errors
# #
# #         with open(local_filename, "wb") as file:
# #             for chunk in response.iter_content(chunk_size=8192):
# #                 file.write(chunk)
# #
# #         return local_filename
# #     except requests.exceptions.RequestException as e:
# #         print(f"Error downloading file: {e}")
# #         return None
# #
# #
def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    text = "\n".join([page.page_content for page in pages])
    return text
#
#
# def process_with_gemini(text):
#     model = genai.GenerativeModel("gemini-pro")
#     prompt = f"Create an interactive learning module from this content:\n\n{text}"
#
#     try:
#         response = model.generate_content(prompt)
#         return response.text
#     except Exception as e:
#         print(f"Error processing with Gemini: {e}")
#         return None

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
        all_audio.append(audio)  # Append audio data
    final_audio = np.concatenate(all_audio)
    return final_audio

@app.route("/process-text2speech", methods=["POST"])
def process_text2speech():
    text = ""

    # Check if a file was uploaded
    if "pdf" in request.files:
        file = request.files["pdf"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        # Extract text from PDF
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

    if not text:
        return jsonify({"error": "No text provided"}), 400
    #get audio
    audio = generate_audio(text)

    wav_file = io.BytesIO()
    sf.write(wav_file, audio, 24000, format='WAV')
    wav_file.seek(0)
    #return
    return send_file(wav_file, mimetype='audio/wav', as_attachment=False)


# # Concatenate all audio segments into one array
# @app.route("/process-content", methods=["POST"])
# def process_content():
#     data = request.json
#     notes = data.get("notes", "")
#     files = data.get("files", [])
#
#     extracted_text = notes.strip()
#     processed_results = []
#
#     for file_url in files:
#         pdf_path = download_file(file_url)
#         if pdf_path and pdf_path.endswith(".pdf"):
#             text = extract_text_from_pdf(pdf_path)
#             extracted_text += f"\n\n{text}"
#
#     if extracted_text:
#         learning_module = process_with_gemini(extracted_text)
#         if learning_module:
#             processed_results.append({"module": learning_module})
#
#     print("Processed Data:", json.dumps(processed_results, indent=2))
#     return jsonify({"status": "success", "data": processed_results})

# Load Whisper Model
model_path = os.path.join(app.root_path, 'model/whisper_model.pt')
model = torch.load(model_path, weights_only = False)

@app.route('/speech2text', methods=['POST'])
def transcribe():
    file_path = "temp_audio.wav"

    if 'file' in request.files:
        # If the request contains a file upload (regular file selection)
        file = request.files['file']
        file.save(file_path)
    
    elif request.data:
        # If the request contains raw binary audio data (recorded audio)
        with open(file_path, "wb") as f:
            f.write(request.data)

    else:
        return jsonify({"error": "No audio data received"}), 400

    # Perform transcription
    result = model.transcribe(file_path)
    os.remove(file_path)  # Clean up after processing

    return jsonify({"text": result["text"]})

if __name__ == "__main__":
    app.run(debug=True)