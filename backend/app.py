import os
import json
import requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import google.generativeai as genai

load_dotenv()
app = Flask(__name__)
CORS(app)

genai.configure(api_key=f"{os.environ.get('GEMINI_API_KEY')}")

DOWNLOADS_DIR = "downloads/"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

def download_file(file_url):
    """Download file from a given URL."""
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
    return "\n".join([page.page_content for page in pages])

def process_with_gemini(text):
    """Generate a structured learning plan using Gemini (strictly 200 words)."""
    model = genai.GenerativeModel("gemini-pro")
    prompt = (
        "Summarize the following content into a structured learning plan "
        "strictly within 200 words, ensuring it does not exceed this limit. Use Markdown format:\n\n" + text
    )
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error processing with Gemini: {e}")
        return None

def split_text_for_rag(text):
    """Split the text into smaller chunks for RAG processing."""
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    return text_splitter.split_text(text)

@app.route("/process-content", methods=["POST"])
def process_content():
    data = request.json
    notes = data.get("notes", "").strip()
    files = data.get("files", [])
    
    extracted_text = notes
    for file_url in files:
        pdf_path = download_file(file_url)
        if pdf_path and pdf_path.endswith(".pdf"):
            extracted_text += "\n\n" + extract_text_from_pdf(pdf_path)
    
    chunks = split_text_for_rag(extracted_text)
    full_learning_plan = ""
    
    for chunk in chunks:
        learning_module = process_with_gemini(chunk)
        if learning_module:
            full_learning_plan += learning_module + "\n\n"
    
    return jsonify([{"learning_plan": full_learning_plan}])

if __name__ == "__main__":
    app.run(debug=True)
