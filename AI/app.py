from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from src.CMS.face_recognition.capture import FaceImageCapture
from src.CMS.face_recognition.train import FaceModelTrainer
from src.CMS.face_recognition.recognize import FaceRecognizer
from src.models.user_face import UserFace
import base64
import cv2
import numpy as np
from datetime import datetime
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from bson import ObjectId
import requests

# Load environment variables
load_dotenv()

# Use environment variables
MONGODB_URI = os.getenv('MONGODB_URI')
CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173"],  # Update this to match your React dev server
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Initialize MongoDB connection
user_face_db = UserFace(os.getenv('MONGODB_URI'))

# Initialize face recognition classes
face_capture = FaceImageCapture()
face_trainer = FaceModelTrainer()
face_recognizer = FaceRecognizer(tolerance=0.6)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/capture')
def capture_page():
    return render_template('capture.html')

@app.route('/train')
def train_page():
    return render_template('train.html')

@app.route('/recognize')
def recognize_page():
    user_id = request.args.get('userId')
    if not user_id:
        return render_template('recognize.html', error='No user ID provided')
    return render_template('recognize.html', user_id=user_id)

@app.route('/api/capture', methods=['POST'])
def capture_face():
    try:
        data = request.json
        if not data or 'image' not in data or 'userId' not in data:
            return jsonify({'error': 'Missing required fields'}), 400

        user_id = data['userId']

        # First verify user exists
        if not user_face_db.verify_user_exists(user_id):
            return jsonify({'error': 'User not found'}), 404

        # Decode base64 image
        image_data = base64.b64decode(data['image'].split(',')[1])
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Create a temporary file
        temp_path = f'temp_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg'
        cv2.imwrite(temp_path, image)

        try:
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                temp_path,
                folder=f"face_recognition/{user_id}",
                public_id=f"face_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )

            # Add face image to user profile
            result = user_face_db.add_face_image(
                user_id, 
                upload_result['secure_url'], 
                upload_result['public_id']
            )
            
            if result is None:
                return jsonify({'error': 'Failed to update user profile'}), 500

            return jsonify({
                'success': True,
                'image_url': upload_result['secure_url']
            })

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<userId>/images', methods=['GET'])
def get_user_images(userId):
    try:
        try:
            user_id = ObjectId(userId)
        except:
            return jsonify({'error': 'Invalid user ID format'}), 400

        images = user_face_db.get_user_images(user_id)
        
        if not images:
            return jsonify({'error': 'No face images found for this user'}), 404

        return jsonify({
            'success': True,
            'userId': userId,
            'images': images
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    try:
        users = user_face_db.get_all_users()
        if not users:
            return jsonify({
                'success': False,
                'error': 'No users with face images found'
            }), 404

        temp_dir = 'temp_training'
        os.makedirs(temp_dir, exist_ok=True)

        try:
            images_processed = 0
            for user in users:
                if 'faceData' not in user or 'faceImages' not in user['faceData']:
                    continue
                
                user_dir = os.path.join(temp_dir, str(user['_id']))
                os.makedirs(user_dir, exist_ok=True)
                
                for image_data in user['faceData']['faceImages']:
                    try:
                        response = requests.get(image_data['url'])
                        if response.status_code == 200:
                            image_name = f"face_{image_data['captured_at'].strftime('%Y%m%d_%H%M%S')}.jpg"
                            image_path = os.path.join(user_dir, image_name)
                            
                            with open(image_path, 'wb') as f:
                                f.write(response.content)
                            images_processed += 1
                    except Exception as img_err:
                        print(f"Error processing image: {img_err}")
                        continue

            if images_processed == 0:
                return jsonify({
                    'success': False,
                    'error': 'No images could be processed for training'
                }), 400

            face_trainer.train_model(temp_dir)
            face_trainer.save_model()
            face_recognizer.load_model()

            return jsonify({
                'success': True,
                'message': f'Model trained successfully with {images_processed} images'
            })

        finally:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/model/status', methods=['GET'])
def get_model_status():
    try:
        users = user_face_db.get_all_users()
        total_users = len(users)
        total_images = sum(
            len(user.get('faceData', {}).get('faceImages', [])) 
            for user in users
        )
        
        last_trained = None
        if os.path.exists(face_trainer.model_path):
            last_trained = datetime.fromtimestamp(
                os.path.getmtime(face_trainer.model_path)
            ).strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            'success': True,
            'modelTrained': face_recognizer.is_model_loaded(),
            'totalUsers': total_users,
            'totalImages': total_images,
            'lastTrained': last_trained
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing image data'
            }), 400

        # Check if model is loaded
        if not face_recognizer.is_model_loaded():
            return jsonify({
                'success': False,
                'message': 'Face recognition model not loaded. Please train the model first.'
            }), 400

        # Decode base64 image
        image_data = base64.b64decode(data['image'].split(',')[1])
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Perform recognition
        result = face_recognizer.recognize_single_face(image)
        print(jsonify(result))
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/attendance', methods=['POST', 'OPTIONS'])
def mark_attendance():
    if request.method == 'OPTIONS':
        return jsonify({"success": True})
        
    try:
        data = request.json
        if not data or 'studentId' not in data or 'classId' not in data:
            return jsonify({'error': 'Missing required fields'}), 400

        # Your attendance marking logic here
        # ...

        return jsonify({
            'success': True,
            'message': 'Attendance marked successfully'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)