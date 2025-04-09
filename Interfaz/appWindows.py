import cv2
from flask import Flask, Response, render_template, redirect, url_for, request

app = Flask(__name__)

# Variables globales para la cámara
camera_active = False
cap = None

# Función para iniciar la cámara
def start_camera():
    global cap, camera_active
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)
        # Configuración fija a 720p (HD)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        if cap.isOpened():
            camera_active = True
            print("Cámara iniciada en 720p (1280x720)")
        else:
            print("No se pudo abrir la cámara")

# Función para detener la cámara
def stop_camera():
    global cap, camera_active
    if cap and cap.isOpened():
        cap.release()
        camera_active = False
        print("Cámara detenida")

# Generador de frames para el video feed
def generate_frames():
    global cap, camera_active
    while camera_active:
        success, frame = cap.read()
        if not success:
            break
        else:
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')

# Ruta para el video feed (solo cámara)
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
    return render_template('sistema.html')

@app.route('/creditos')
def creditos():
    return render_template('creditos.html')

# Ruta de cierre de sesión
@app.route('/logout')
def logout():
    stop_camera()
    return redirect(url_for('index'))

# Ruta para iniciar sesión
@app.route('/login')
def login():
    start_camera()
    return redirect(url_for('sistema'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)