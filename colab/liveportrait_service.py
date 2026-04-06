
"""
SereNova LivePortrait Integration
Generates animated video clips and extracts frames for lip-sync
"""
try:
    from pyngrok import ngrok
    ngrok.set_auth_token("3ByKtB2Ar25vDQG9s5QFDBHc7F1_76dMJdDiSaNYWQDrU6R6D")
    public_url = ngrok.connect(5000)
    print(f"🎉 NGROK: {public_url}")
except:
    public_url = "http://localhost:5000"

import os
import cv2
import numpy as np
import base64
import json
import subprocess
import shutil
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Paths
EMMA_PATH = "/content/emma.jpg"
OUTPUT_DIR = "/content/output"
FRAMES_DIR = "/content/frames"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

# Check if LivePortrait is installed
def setup_liveportrait():
    """Install and setup LivePortrait"""
    os.chdir("/content")
    
    if not os.path.exists("LivePortrait"):
        print("📦 Cloning LivePortrait...")
        subprocess.run(["git", "clone", "https://github.com/KwaiVGI/LivePortrait.git"], check=True)
    
    os.chdir("/content/LivePortrait")
    
    # Install dependencies
    print("📦 Installing dependencies...")
    subprocess.run(["pip", "install", "-r", "requirements.txt", "-q"], check=True)
    
    # Download models
    print("📦 Downloading models...")
    subprocess.run(["python", "inference/_utils.py"], check=True)
    
    print("✅ LivePortrait ready!")

def check_installation():
    """Check if LivePortrait is ready"""
    return os.path.exists("/content/LivePortrait")

# Try to setup on import
emma_exists = os.path.exists(EMMA_PATH)
liveportrait_ready = check_installation()

print(f"📸 Emma image exists: {emma_exists}")
print(f"🤖 LivePortrait ready: {liveportrait_ready}")

@app.route('/health')
def health():
    return jsonify({
        'emma_exists': emma_exists,
        'liveportrait_ready': liveportrait_ready,
        'ok': True
    })

@app.route('/animate', methods=['POST'])
def animate():
    """Generate animated video from Emma image using LivePortrait"""
    data = request.json
    text = data.get('text', 'hello')
    
    if not emma_exists:
        return jsonify({'error': 'Emma image not found'}), 400
    
    try:
        # Use a driving video for animation
        # For now, we'll use a simple approach - generate based on text duration
        # In production, you'd use audio-driven animation
        
        output_video = generate_animation(text)
        
        # Extract frames from video
        frames = extract_frames(output_video)
        
        return jsonify({
            'frames': frames,
            'count': len(frames),
            'video': output_video
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

def generate_animation(text):
    """Generate animated video using LivePortrait"""
    if not liveportrait_ready:
        # Fallback to simple animation
        return generate_simple_animation(text)
    
    os.chdir("/content/LivePortrait")
    
    # Create output path
    video_path = f"{OUTPUT_DIR}/output.mp4"
    
    # Use inference command
    # This uses a driving video to animate the source image
    cmd = [
        "python", "inference.py",
        "--source", EMMA_PATH,
        "--driving", "assets Driving video or use --driving_video",
        "--output", video_path
    ]
    
    # For now, return simple fallback
    return generate_simple_animation(text)

def generate_simple_animation(text):
    """Generate simple animation as fallback"""
    import math
    
    # Read Emma image
    img = cv2.imread(EMMA_PATH)
    if img is None:
        raise ValueError("Could not read Emma image")
    
    h, w = img.shape[:2]
    
    # Detect face to find mouth position
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) > 0:
        x, y, fw, fh = max(faces, key=lambda f: f[2]*f[3])
        mx, my = x + fw // 2, int(y + fh * 0.65)
    else:
        mx, my = w // 2, int(h * 0.62)
    
    print(f"🎭 Generating animation with mouth at ({mx}, {my})")
    
    # Generate frames with more dynamic animation
    frames = []
    duration = max(len(text.split()) * 0.3, 2.0)  # ~2-5 seconds
    num_frames = int(duration * 30)  # 30 fps
    
    for i in range(num_frames):
        frame = img.copy()
        
        # More natural speaking animation
        # Multiple cycles of opening/closing
        t = i / num_frames
        cycle1 = math.sin(t * 8 * math.pi)  # Slow cycle
        cycle2 = math.sin(t * 20 * math.pi) * 0.3  # Fast micro-movements
        
        open_amount = max(0, (cycle1 + cycle2) * 20 + 10)
        
        # Draw realistic mouth
        # Outer lips
        cv2.ellipse(frame, (mx, my), (35, 20), 0, 0, 360, (120, 60, 50), -1)
        
        # Inner mouth
        if open_amount > 5:
            cv2.ellipse(frame, (mx, my + 2), (22, open_amount), 0, 0, 180, (30, 10, 10), -1)
        
        # Lip lines
        cv2.ellipse(frame, (mx, my - 8), (28, 5), 0, 0, 180, (140, 70, 60), 2)
        cv2.ellipse(frame, (mx, my + 10), (28, 5), 0, 180, 360, (140, 70, 60), 2)
        
        # Teeth when mouth is open
        if open_amount > 15:
            cv2.ellipse(frame, (mx, my - 2), (15, 4), 0, 0, 180, (255, 250, 240), -1)
        
        # Encode frame
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frames.append(base64.b64encode(buf).decode())
    
    # Save video
    video_path = f"{OUTPUT_DIR}/animation.mp4"
    save_video(frames, video_path)
    
    # Return just frames (no video file path for now)
    return frames

def save_video(frames, output_path):
    """Save frames as video"""
    if not frames:
        return
    
    # Decode first frame to get dimensions
    first_frame = base64.b64decode(frames[0])
    img = cv2.imdecode(np.frombuffer(first_frame, np.uint8), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    
    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, 30, (w, h))
    
    for frame_b64 in frames:
        frame = cv2.imdecode(np.frombuffer(base64.b64decode(frame_b64), np.uint8), cv2.IMREAD_COLOR)
        out.write(frame)
    
    out.release()
    print(f"🎬 Saved video to {output_path}")

def extract_frames(video_path):
    """Extract frames from video"""
    frames = []
    
    if not os.path.exists(video_path):
        return frames
    
    cap = cv2.VideoCapture(video_path)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Encode frame
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frames.append(base64.b64encode(buf).decode())
    
    cap.release()
    return frames

@app.route('/animate-simple', methods=['POST'])
def animate_simple():
    """Simple animation endpoint - same as /animate but explicit"""
    return animate()

print(f"\n🚀 LivePortrait Service ready at {public_url}\n")
app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)