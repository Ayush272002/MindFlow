import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader
import google.generativeai as genai

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow CORS for frontend interaction

# Configure Gemini API
genai.configure(api_key="YOUR_GEMINI_API_KEY")

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    text = "\n".join([page.page_content for page in pages])
    return text

def process_with_gemini(text):
    """Use Gemini API to generate interactive learning content."""
    model = genai.GenerativeModel("gemini-pro")
    prompt = f"Create an interactive learning module from this content:\n\n{text}"
    response = model.generate_content(prompt)
    return response.text

@app.route("/process-content", methods=["POST"])
def process_content():
    data = request.json
    notes = data.get("notes", "")
    files = data.get("files", [])

    extracted_text = notes  # Start with notes
    processed_results = []

    for file_url in files:
        pdf_path = download_file(file_url)  # Implement this function to fetch the file
        if pdf_path.endswith(".pdf"):
            text = extract_text_from_pdf(pdf_path)
            extracted_text += f"\n\n{text}"

    if extracted_text.strip():
        learning_module = process_with_gemini(extracted_text)
        processed_results.append({"module": learning_module})

    print("Processed Data:", json.dumps(processed_results, indent=2))
    return jsonify({"status": "success", "data": processed_results})

if __name__ == "__main__":
    app.run(debug=True)
