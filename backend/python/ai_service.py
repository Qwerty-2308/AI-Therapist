from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import urllib.request
import urllib.error
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "gemma3:4b")  # Changed to Gemma
PORT = int(os.environ.get("PORT", 5001))


@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    return jsonify(
        {"status": "healthy", "model": MODEL_NAME, "ollama_url": OLLAMA_BASE_URL}
    )


@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json()
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    logger.info(f"Processing chat: {user_message[:50]}...")

    try:
        response = chat_with_ollama(user_message)
        return jsonify({"response": response})
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        return jsonify(
            {
                "response": "I'm here for you. Would you like to tell me more about what you're feeling?"
            }
        ), 200


def chat_with_ollama(user_message):
    # Use Gemma-friendly prompt format
    prompt = f"<start_of_turn>user\nYou are SereNova, a compassionate AI therapist. Respond with empathy and warmth. Keep responses brief (2-3 sentences).\n<end_of_turn>\n<start_of_turn>model\n{user_message}<end_of_turn>"

    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=120) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["response"]


if __name__ == "__main__":
    logger.info(f"Starting AI service on port {PORT} with model: {MODEL_NAME}")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
