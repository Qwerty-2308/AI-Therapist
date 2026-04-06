"""
SereNova - Advanced Facial Animation Service
Using enhanced OpenCV with realistic facial movements
Compatible with SereNova frontend lip-sync
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
import math
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
EMMA_PATH = "/content/emma.jpg"
emma_img = None
face_data = {}

print("🧠 Loading Emma Watson image...")

if os.path.exists(EMMA_PATH):
    emma_img = cv2.imread(EMMA_PATH)
    if emma_img is not None:
        h, w = emma_img.shape[:2]
        
        # Detect facial features
        gray = cv2.cvtColor(emma_img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) > 0:
            x, y, fw, fh = max(faces, key=lambda f: f[2]*f[3])
            face_data = {
                'x': x, 'y': y, 'w': fw, 'h': fh,
                'mouth_x': x + fw // 2,
                'mouth_y': int(y + fh * 0.65),
                'left_eye': (x + int(fw * 0.3), int(y + fh * 0.35)),
                'right_eye': (x + int(fw * 0.7), int(y + fh * 0.35)),
            }
            print(f"✅ Face detected! Mouth at ({face_data['mouth_x']}, {face_data['mouth_y']})")
        else:
            # Use center fallback
            face_data = {
                'mouth_x': w // 2,
                'mouth_y': int(h * 0.62),
                'left_eye': (w // 2 - 50, int(h * 0.38)),
                'right_eye': (w // 2 + 50, int(h * 0.38)),
            }
            print(f"⚠️ No face detected, using center fallback")
        
        print(f"✅ Loaded! Size: {w}x{h}")
    else:
        print("❌ Failed to load image")
else:
    print(f"❌ Emma image not found at {EMMA_PATH}")

# Animation parameters
MOUTH_OPEN_MAX = 35
MOUTH_OPEN_MIN = 5
BLINK_PROBABILITY = 0.02
EYE_BLINK_DURATION = 5

class SpeakingAnimation:
    def __init__(self, text, duration):
        self.text = text
        self.duration = duration
        self.num_frames = int(duration * 30)  # 30 fps
        
        # Analyze text for speech patterns
        words = text.split()
        self.num_words = len(words)
        
        # Generate natural speech rhythm
        # More mouth movement on content words (longer syllables)
        self.speech_pattern = self._generate_speech_pattern()
        
        # Eye blink timing
        self.blink_frames = self._generate_blink_timing()
        
        # Head subtle movement
        self.head_movement = self._generate_head_movement()
    
    def _generate_speech_pattern(self):
        """Generate realistic mouth opening pattern based on text"""
        pattern = []
        
        # Average speaking rate: ~150 words per minute = 2.5 words per second
        words_per_second = 2.5
        total_words = max(self.num_words, 1)
        
        for i in range(self.num_frames):
            t = i / self.num_frames
            
            # Base rhythm - opens and closes naturally
            base = math.sin(t * 4 * math.pi) * 0.3 + 0.5
            
            # Add word-level emphasis
            word_index = int(t * total_words)
            word_emphasis = math.sin(word_index * 0.5) * 0.2
            
            # Add micro-variations (like real speech)
            micro = math.sin(t * 30 * math.pi) * 0.1
            
            # Combine
            open_amount = (base + word_emphasis + micro + 0.5)
            open_amount = max(0.1, min(1.0, open_amount))
            
            pattern.append(open_amount)
        
        return pattern
    
    def _generate_blink_timing(self):
        """Generate random blink timing"""
        blinks = set()
        current = random.randint(20, 50)
        
        while current < self.num_frames:
            # Blink lasts 3-5 frames
            blink_duration = random.randint(3, 5)
            for b in range(blink_duration):
                if current + b < self.num_frames:
                    blinks.add(current + b)
            current += random.randint(40, 120)
        
        return blinks
    
    def _generate_head_movement(self):
        """Generate subtle head sway"""
        movements = []
        for i in range(self.num_frames):
            t = i / self.num_frames
            # Very subtle movement
            dx = math.sin(t * 2 * math.pi) * 2
            dy = math.sin(t * 3 * math.pi) * 1
            movements.append((dx, dy))
        return movements

def draw_mouth(img, mx, my, open_amount, teeth_visible=False):
    """Draw realistic mouth with varying openness"""
    # Scale mouth size based on face size
    scale = 1.0
    
    # Outer lips - natural lip color
    outer_color = (100, 45, 40)  # reddish-brown
    cv2.ellipse(img, (mx, my), 
                (int(35 * scale), int(18 * scale)), 
                0, 0, 360, outer_color, -1)
    
    # Inner mouth opening
    if open_amount > 0.05:
        inner_open = int(MOUTH_OPEN_MIN + (MOUTH_OPEN_MAX - MOUTH_OPEN_MIN) * open_amount)
        inner_color = (20, 5, 5)  # dark inside mouth
        cv2.ellipse(img, (mx, my + 2), 
                    (int(20 * scale), inner_open), 
                    0, 0, 180, inner_color, -1)
    
    # Upper lip line
    cv2.ellipse(img, (mx, my - 8), 
                (int(28 * scale), 4), 
                0, 0, 180, (120, 60, 50), 2)
    
    # Lower lip line
    cv2.ellipse(img, (mx, my + 10), 
                (int(28 * scale), 4), 
                0, 180, 360, (120, 60, 50), 2)
    
    # Teeth (show when mouth is more open)
    if teeth_visible and open_amount > 0.4:
        teeth_color = (255, 250, 245)  # off-white
        cv2.ellipse(img, (mx, my - 3), 
                    (int(14 * scale), 4), 
                    0, 0, 180, teeth_color, -1)
    
    # Lip shine
    shine_y = my - 12
    cv2.ellipse(img, (mx - 8, shine_y), 
                (int(8 * scale), int(3 * scale)), 
                0, 0, 180, (180, 140, 130), -1)

def draw_eyes(img, left_eye, right_eye, is_blinking):
    """Draw realistic eyes with optional blink"""
    lx, ly = left_eye
    rx, ry = right_eye
    
    eye_radius = 12
    pupil_radius = 6
    
    if is_blinking:
        # Closed eyes - draw lines
        cv2.line(img, (lx - 15, ly), (lx + 15, ly), (60, 40, 30), 2)
        cv2.line(img, (rx - 15, ry), (rx + 15, ry), (60, 40, 30), 2)
    else:
        # White of eye
        cv2.circle(img, (lx, ly), eye_radius, (240, 235, 230), -1)
        cv2.circle(img, (rx, ry), eye_radius, (240, 235, 230), -1)
        
        # Iris - slightly different colors for depth
        cv2.circle(img, (lx + 1, ly), pupil_radius + 1, (60, 40, 20), -1)  # Brown
        cv2.circle(img, (rx + 1, ry), pupil_radius + 1, (60, 40, 20), -1)
        
        # Pupil
        cv2.circle(img, (lx + 1, ly), pupil_radius - 1, (10, 5, 0), -1)
        cv2.circle(img, (rx + 1, ry), pupil_radius - 1, (10, 5, 0), -1)
        
        # Eye highlight
        cv2.circle(img, (lx - 3, ly - 3), 2, (255, 255, 255), -1)
        cv2.circle(img, (rx - 3, ry - 3), 2, (255, 255, 255), -1)
        
        # Upper eyelid line
        cv2.ellipse(img, (lx, ly - eye_radius), 
                    (15, 4), 0, 0, 180, (60, 40, 30), 2)
        cv2.ellipse(img, (rx, ry - eye_radius), 
                    (15, 4), 0, 0, 180, (60, 40, 30), 2)

def generate_frame(emma_img, face_data, animation, frame_index):
    """Generate a single animated frame"""
    # Copy image
    frame = emma_img.copy()
    
    # Get animation values
    open_amount = animation.speech_pattern[frame_index]
    is_blinking = frame_index in animation.blink_frames
    dx, dy = animation.head_movement[frame_index]
    
    # Get face coordinates
    mx = face_data.get('mouth_x', 400)
    my = face_data.get('mouth_y', 300)
    left_eye = face_data.get('left_eye', (mx - 50, my - 80))
    right_eye = face_data.get('right_eye', (mx + 50, my - 80))
    
    # Apply subtle head movement
    if dx != 0 or dy != 0:
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        frame = cv2.warpAffine(frame, M, (frame.shape[1], frame.shape[0]))
        
        # Adjust coordinates
        mx += int(dx)
        my += int(dy)
        left_eye = (left_eye[0] + int(dx), left_eye[1] + int(dy))
        right_eye = (right_eye[0] + int(dx), right_eye[1] + int(dy))
    
    # Draw facial features
    teeth_visible = open_amount > 0.4
    draw_mouth(frame, mx, my, open_amount, teeth_visible)
    draw_eyes(frame, left_eye, right_eye, is_blinking)
    
    return frame

@app.route('/health')
def health():
    return jsonify({
        'ready': emma_img is not None,
        'mouth': [face_data.get('mouth_x', 0), face_data.get('mouth_y', 0)],
        'eyes': face_data.get('left_eye', (0, 0)),
        'ok': True
    })

@app.route('/animate', methods=['POST'])
def animate():
    """Generate animated frames based on text input"""
    if emma_img is None:
        return jsonify({'error': 'Emma image not loaded'}), 400
    
    data = request.json
    text = data.get('text', 'Hello')
    
    # Calculate duration based on text length
    # Average speaking rate: ~150 words/min = 2.5 words/sec
    words_per_second = 2.5
    num_words = len(text.split())
    duration = max(num_words / words_per_second, 1.5)
    
    print(f"🎬 Generating {duration:.1f}s animation for '{text[:50]}...'")
    
    # Create animation controller
    animation = SpeakingAnimation(text, duration)
    
    # Generate frames
    frames = []
    for i in range(animation.num_frames):
        frame = generate_frame(emma_img, face_data, animation, i)
        
        # Encode frame as JPEG
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        frames.append(base64.b64encode(buf).decode())
    
    print(f"✅ Generated {len(frames)} frames")
    
    return jsonify({
        'frames': frames,
        'count': len(frames),
        'duration': duration
    })

@app.route('/animate-fast', methods=['POST'])
def animate_fast():
    """Faster animation for shorter responses"""
    if emma_img is None:
        return jsonify({'error': 'Emma image not loaded'}), 400
    
    data = request.json
    text = data.get('text', 'Hi')
    
    # Shorter duration for quick responses
    duration = 1.5
    animation = SpeakingAnimation(text, duration)
    
    frames = []
    for i in range(0, animation.num_frames, 2):  # Every other frame for speed
        frame = generate_frame(emma_img, face_data, animation, i)
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frames.append(base64.b64encode(buf).decode())
    
    return jsonify({
        'frames': frames,
        'count': len(frames)
    })

print(f"\n🚀 Advanced Facial Animation ready at {public_url}\n")
print("📝 Endpoints:")
print("  POST /animate - Full animation with eyes + mouth + head movement")
print("  POST /animate-fast - Faster animation")
print("  GET /health - Status check")
print()

app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)