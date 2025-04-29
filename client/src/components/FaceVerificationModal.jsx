import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FiX, FiCamera } from 'react-icons/fi';
import { useSelector } from 'react-redux';

const FaceVerificationModal = ({ isOpen, onClose, onVerify, userId }) => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');
  const user = useSelector((state) => state.auth.user);

  // Add debug log for user data
  useEffect(() => {
    console.log('Current user data:', user);
    console.log('Face registration status:', user?.user?.isFaceRegistered);
    console.log('User ID prop:', userId);
  }, [user, userId]);

  const capture = async () => {
    try {
      setIsCapturing(true);
      const imageSrc = webcamRef.current.getScreenshot();
      
      console.log('Attempting to capture image...');
      if (!imageSrc) {
        console.error('Image capture failed - no image data');
        throw new Error('Failed to capture image');
      }
      console.log('Image captured successfully');

      console.log('Sending verification request for user ID:', userId);
      // Send to face verification API
      const response = await fetch('https://facerecognitionsystem-993g.onrender.com/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          face_image: imageSrc
        })
      });

      const result = await response.json();
      console.log('Face verification API response:', result);

      if (result.similarity > 0.3) {
        console.log('Face verification successful');
        onVerify(true);
      } else {
        console.log('Face verification failed');
        setError('Face verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Face verification error:', err);
      setError('Error during face verification. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  // If face is not registered, show message
  if (!user?.user?.isFaceRegistered) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Face Not Registered
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg">
            <p className="mb-2">You need to register your face before using the attendance system.</p>
            <p className="text-sm">Please visit your profile page to complete face registration.</p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Face Verification
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="relative w-full aspect-video mb-4 rounded-lg overflow-hidden">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: 'user',
              width: 1280,
              height: 720
            }}
            className="w-full h-full object-cover"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={capture}
            disabled={isCapturing}
            className={`flex items-center px-4 py-2 rounded-lg ${
              isCapturing
                ? 'bg-gray-400 dark:bg-gray-600'
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            } text-white font-medium`}
          >
            {isCapturing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              <span className="flex items-center">
                <FiCamera className="mr-2" />
                Verify Face
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaceVerificationModal; 