import cv2
import face_recognition
import pickle
from pathlib import Path
import numpy as np
from src.CMS.logging import logger
from src.CMS.face_recognition.utils.preprocessor import FacePreprocessor

class FaceRecognizer:
    """Class for real-time face recognition using trained model."""
    
    def __init__(self, tolerance=0.6):
        """
        Initialize the face recognizer.
        
        Args:
            tolerance (float): Face recognition tolerance (lower is more strict)
        """
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.model_path = self.project_root / 'data' / 'face_data' / 'models' / 'face_recognition_model.pkl'
        self.tolerance = tolerance
        self.known_face_encodings = []
        self.known_face_names = []
        self.preprocessor = FacePreprocessor()
        self.liveness_confirmed = False
        self.recognition_confirmed = False
        
    def load_model(self):
        """Load the trained model from disk."""
        if not self.model_path.exists():
            logger.error(f"Model file not found: {self.model_path}")
            return False
            
        try:
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
                
            self.known_face_encodings = model_data["encodings"]
            self.known_face_names = model_data["names"]
            
            logger.info(f"Model loaded with {len(self.known_face_encodings)} encodings")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False
    
    def recognize_faces(self):
        """Run real-time face recognition using webcam."""
        if not self.known_face_encodings:
            logger.error("No face encodings loaded. Please load model first.")
            return
        
        cap = cv2.VideoCapture(0)
        process_this_frame = True
        
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.error("Failed to grab frame from camera")
                break
            
            if process_this_frame:
                # Process frame with liveness detection
                face_locations, face_encodings, liveness_detected, blink_count = self.preprocessor.process_frame(frame)
                
                face_names = []
                for face_encoding in face_encodings:
                    name = self.identify_face(face_encoding)
                    face_names.append(name)
                    if name != "Unknown":
                        logger.info(f"Person recognized: {name}")
                        if liveness_detected:
                            logger.info(f"Liveness confirmed for {name} (Blinks: {blink_count})")
                            self.liveness_confirmed = True
                            self.recognition_confirmed = True
            
            process_this_frame = not process_this_frame
            
            # Draw results with liveness information
            self.draw_results(frame, face_locations, face_names, liveness_detected, blink_count)
            
            if self.handle_keys():
                break
        
        cap.release()
        cv2.destroyAllWindows()
    
    def identify_face(self, face_encoding):
        """Identify a face encoding against known faces."""
        matches = face_recognition.compare_faces(
            self.known_face_encodings, face_encoding, tolerance=self.tolerance
        )
        name = "Unknown"
        
        if True in matches:
            first_match_index = matches.index(True)
            name = self.known_face_names[first_match_index]
        
        return name
    
    def draw_results(self, frame, face_locations, face_names, liveness_detected, blink_count):
        """Draw recognition results on frame."""
        for (top, right, bottom, left), name in zip(face_locations, face_names):
            # Draw box and label
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            
            # Draw name and liveness status
            label = f"{name}"
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, label, (left + 6, bottom - 6), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1)
            
        # Draw liveness information
        liveness_color = (0, 255, 0) if liveness_detected else (0, 0, 255)
        cv2.putText(frame, f"Liveness: {'Confirmed' if liveness_detected else 'Not Confirmed'}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, liveness_color, 2)
        cv2.putText(frame, f"Blinks: {blink_count}", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Tolerance: {self.tolerance:.2f}", 
                   (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        cv2.imshow('Face Recognition', frame)
    
    def handle_keys(self):
        """Handle keyboard input."""
        key = cv2.waitKey(1)
        if key == ord('q'):
            return True
        elif key == ord('+') or key == ord('='):
            self.tolerance = min(1.0, self.tolerance + 0.05)
            logger.info(f"Tolerance increased to {self.tolerance:.2f}")
        elif key == ord('-') or key == ord('_'):
            self.tolerance = max(0.1, self.tolerance - 0.05)
            logger.info(f"Tolerance decreased to {self.tolerance:.2f}")
        return False