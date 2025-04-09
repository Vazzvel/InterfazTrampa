import cv2
from flask import Flask, Response, render_template, redirect, url_for
from picamera2 import Picamera2

app = Flask(__name__)

# Configuración de la cámara Picamera2
picam2 = Picamera2()
config = picam2.create_video_configuration(main={"size": (1280, 720)})
picam2.configure(config)
camera_active = False

# Función para iniciar la cámara
def start_camera():
    global camera_active
    if not camera_active:
        picam2.start()
        camera_active = True
        print("Cámara Picamera2 iniciada en 720p")

# Función para detener la cámara
def stop_camera():
    global camera_active
    if camera_active:
        picam2.stop()
        camera_active = False
        print("Cámara Picamera2 detenida")

# Generador de frames para el video feed
def generate_frames():
    while camera_active:
        frame = picam2.capture_array()
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')

# Ruta para el video feed
@app.route('/video_feed')
def video_feed():
    if not camera_active:
        start_camera()
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Rutas principales
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sistema')
def sistema():
    start_camera()
    return render_template('sistema.html')

@app.route('/creditos')
def creditos():
    return render_template('creditos.html')

@app.route('/logout')
def logout():
    stop_camera()
    return redirect(url_for('index'))

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, threaded=True)
    finally:
        stop_camera()
