import os
import json
import requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import google.generativeai as genai

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

        # Process the interaction through the agent service
        response = agent_service.start_new_topic(user_input)
        
        # Convert the response to a dictionary
        response_dict = response.to_dict()
        
        return jsonify(response_dict)

    except Exception as e:
        print(f"Error processing interaction: {e}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/process-content', methods=['POST'])
def process_content():
    """Process uploaded content."""
    try:
        data = request.json
        notes = data.get('notes', '')
        files = data.get('files', [])

        # Process files if any
        processed_files = []
        for file_url in files:
            local_file = download_file(file_url)
            if local_file:
                processed_files.append(local_file)

        # TODO: Process the content and generate learning plan
        # For now, return a mock response
        response = [{
            'learning_plan': f"Generated learning plan from {len(processed_files)} files and notes: {notes[:100]}..."
        }]

        return jsonify(response)

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

if __name__ == "__main__":
    app.run(debug=True)
