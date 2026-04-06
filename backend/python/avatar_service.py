"""
SereNova Avatar Service
=======================
Flask-based microservice for text-to-speech using ElevenLabs API.
Provides REST endpoints for TTS and Socket.IO for real-time communication.

Endpoints:
- GET  /health        - Health check
- POST /tts           - Convert text to speech
- POST /generate-avatar - Generate avatar audio (alias for /tts)
- GET  /voices        - List available ElevenLabs voices
- WS   /socket        - Socket.IO for real-time audio streaming
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO
import os
import logging
import requests
import json
import base64
import io

# Initialize Flask app with CORS support
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration from environment variables
ELEVENLABS_API_KEY = os.environ.get(
    "ELEVENLABS_API_KEY", 
    "sk_6950334d53f6a1e03908be64d395a3ed137efefd19db33c7"
)
PORT = int(os.environ.get("PORT", 5002))

# ElevenLabs voice and model configuration
# Using "Sarah" custom voice - works with free tier
# "Rachel" library voice requires paid plan
VOICE_ID = "EXAVITQu4vr4xnSDxMaL"
MODEL_ID = "eleven_multilingual_v2"  # Use v2 for better quality

# Track connected clients for Socket.IO
CLIENTS_CONNECTED = set()


@app.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint.
    Returns service status for monitoring.
    """
    return jsonify({"status": "healthy", "service": "avatar-service"})


@app.route("/generate-avatar", methods=["POST"])
def generate_avatar():
    """
    Generate avatar audio from text.
    Alias for /tts endpoint - generates TTS audio and returns base64 encoded audio.
    
    Request body:
        {
            "text": "Hello, how are you?"
        }
    
    Response:
        {
            "audio": "<base64 encoded mp3>",
            "text": "Hello, how are you?",
            "status": "ready"
        }
    """
    data = request.get_json()
    text = data.get("text", "")
    
    if not text:
        return jsonify({"error": "Text is required"}), 400
    
    logger.info(f"Generating avatar for: {text[:50]}...")
    
    try:
        audio_base64 = synthesize_speech(text)
        
        return jsonify({
            "audio": audio_base64,
            "text": text,
            "status": "ready"
        })
    except Exception as e:
        logger.error(f"Error generating avatar: {e}")
        return jsonify({
            "error": str(e),
            "text": text
        }), 500


def synthesize_speech(text: str) -> str:
    """
    Call ElevenLabs API to convert text to speech.
    
    Args:
        text: Text content to convert to speech
        
    Returns:
        Base64 encoded MP3 audio string
        
    Raises:
        Exception: If API call fails or returns error
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.5,
            "use_speaker_boost": True
        }
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    
    if response.status_code == 200:
        # Encode binary audio to base64 for JSON response
        audio_data = base64.b64encode(response.content).decode('utf-8')
        return audio_data
    else:
        raise Exception(f"ElevenLabs API error: {response.status_code} - {response.text}")


@app.route("/tts", methods=["POST"])
def text_to_speech():
    """
    Text-to-Speech endpoint.
    Converts provided text to speech using ElevenLabs API.
    
    Request body:
        {
            "text": "Hello, how are you today?"
        }
    
    Response:
        {
            "audio": "<base64 encoded mp3>",
            "format": "mp3"
        }
    """
    data = request.get_json()
    text = data.get("text", "")
    
    if not text:
        return jsonify({"error": "Text is required"}), 400
    
    logger.info(f"Generating TTS for: {text[:50]}...")
    
    try:
        audio_base64 = synthesize_speech(text)
        
        return jsonify({
            "audio": audio_base64,
            "format": "mp3"
        })
            
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/voices", methods=["GET"])
def list_voices():
    """
    List available ElevenLabs voices.
    Returns list of voices available for TTS.
    
    Response:
        {
            "voices": [
                {"voice_id": "...", "name": "...", ...}
            ]
        }
    """
    url = "https://api.elevenlabs.io/v1/voices"
    
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch voices"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Socket.IO Event Handlers
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """
    Handle new client connection.
    Logs connection and adds client to tracking set.
    """
    logger.info(f"Client connected: {request.sid}")
    CLIENTS_CONNECTED.add(request.sid)
    socketio.emit('connected', {'status': 'ok'}, room=request.sid)


@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle client disconnection.
    Logs disconnection and removes client from tracking set.
    """
    logger.info(f"Client disconnected: {request.sid}")
    CLIENTS_CONNECTED.discard(request.sid)


@socketio.on('stream-audio')
def handle_stream_audio(data: dict):
    """
    Handle audio streaming request via Socket.IO.
    Generates TTS and emits audio back to client.
    
    Event data:
        {
            "audio": "<optional existing audio>",
            "text": "Text to convert to speech"
        }
    """
    audio_data = data.get("audio", "")
    text = data.get("text", "")
    
    logger.info(f"Received audio stream, text: {text[:30] if text else 'None'}...")
    
    try:
        if text:
            # Generate new TTS audio
            audio_base64 = synthesize_speech(text)
            socketio.emit('avatar_audio', {
                "audio": audio_base64,
                "text": text,
                "status": "speaking"
            }, room=request.sid)
        else:
            # No text provided, just emit ready status
            socketio.emit('avatar_ready', {
                "text": text,
                "status": "speaking"
            }, room=request.sid)
        
    except Exception as e:
        logger.error(f"Error processing audio stream: {e}")
        socketio.emit('avatar_error', {"error": str(e)}, room=request.sid)


if __name__ == "__main__":
    logger.info(f"Starting Avatar service on port {PORT} with ElevenLabs")
    logger.info(f"Using voice ID: {VOICE_ID}")
    logger.info(f"Using model: {MODEL_ID}")
    socketio.run(
        app, 
        host="0.0.0.0", 
        port=PORT, 
        debug=False, 
        allow_unsafe_werkzeug=True
    )