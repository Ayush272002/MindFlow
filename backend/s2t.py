from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)