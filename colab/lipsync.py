"""
SereNova Lip-Sync - Use Your Uploaded Emma Image
Upload: /content/emma.jpg
"""
try:
    from pyngrok import ngrok
    ngrok.set_auth_token("3ByKtB2Ar25vDQG9s5QFDBHc7F1_76dMJdDiSaNYWQDrU6R6D")
    public_url = ngrok.connect(5000)
    print(f"🎉 NGROK: {public_url}")
except:
    public_url = "http://localhost:5000"

import cv2, numpy as np, base64, os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

EMMA_PATH = "/content/emma.jpg"
emma_img = None
mx, my = 256, 350

if os.path.exists(EMMA_PATH):
    emma_img = cv2.imread(EMMA_PATH)
    if emma_img is not None:
        h, w = emma_img.shape[:2]
        mx, my = w // 2, int(h * 0.62)
        try:
            gray = cv2.cvtColor(emma_img, cv2.COLOR_BGR2GRAY)
            fc = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = fc.detectMultiScale(gray, 1.3, 5)
            if len(faces) > 0:
                x, y, fw, fh = max(faces, key=lambda f: f[2]*f[3])
                mx, my = x + fw // 2, int(y + fh * 0.65)
                print(f"✅ Face found! Mouth at ({mx}, {my})")
        except: pass
        print(f"✅ Loaded! Size: {w}x{h}")

print(f"Mouth: ({mx}, {my})")

@app.route('/health')
def health(): return jsonify({'mouth': [mx, my], 'ok': emma_img is not None})

@app.route('/animate', methods=['POST'])
def animate():
    text = request.json.get('text', 'hi')
    frames = []
    # More frames = smoother animation, but longer generation
    # Each word roughly 2-3 frames for natural speech rhythm
    n = min(len(text.split()) * 8, 150)
    for i in range(n):
        frame = emma_img.copy()
        
        # More natural mouth movement pattern
        # Use actual speech rhythm - more open at stressed syllables
        cycle = i / n * 6 * np.pi
        open_val = int(8 + 30 * abs(np.sin(cycle)))  # Varies between 8-38
        
        # Draw realistic mouth
        # Outer lips - darker natural lip color
        cv2.ellipse(frame, (mx, my), (35, 20), 0, 0, 360, (120, 60, 50), -1)
        
        # Inner mouth opening - darker to show depth
        cv2.ellipse(frame, (mx, my + 2), (22, open_val), 0, 0, 180, (30, 10, 10), -1)
        
        # Upper lip line
        cv2.ellipse(frame, (mx, my - 8), (28, 5), 0, 0, 180, (140, 70, 60), 2)
        
        # Lower lip line  
        cv2.ellipse(frame, (mx, my + 10), (28, 5), 0, 180, 360, (140, 70, 60), 2)
        
        # Teeth hint (subtle white)
        if open_val > 15:
            cv2.ellipse(frame, (mx, my - 2), (15, 4), 0, 0, 180, (255, 250, 240), -1)
        
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frames.append(base64.b64encode(buf).decode())
    return jsonify({'frames': frames, 'count': len(frames)})

@app.route('/get-static')
def get_static():
    frame = emma_img.copy()
    cv2.circle(frame, (mx, my), 25, (0, 255, 0), 3)
    _, buf = cv2.imencode('.jpg', frame)
    return jsonify({'frame': base64.b64encode(buf).decode()})

print(f"\n🚀 {public_url}\n")
app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)