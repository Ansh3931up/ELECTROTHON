import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getStudentClasses, getfrequencyByClassId } from "../redux/slices/classSlice";
import detectSound from "../helpers/detectSound";
import NavBar from "../components/NavBar";
import { checkAndRequestPermissions, checkDeviceCapabilities } from '../utils/permissions';
import { Camera } from '@capacitor/camera';
import { motion } from 'framer-motion';

const Student = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user.user);
  const { classes, loading, error } = useSelector((state) => state.class);
  const [listeningClasses, setListeningClasses] = useState({});
  const [status, setStatus] = useState("Select a class to check frequency");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classFrequencies, setClassFrequencies] = useState({});
  const [hasPermissions, setHasPermissions] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    hasMicrophone: false,
    hasCamera: false
  });
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('idle'); // 'idle', 'verifying', 'success', 'failed'
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [loadingStates, setLoadingStates] = useState({
    fetchFrequency: false,
    listening: false
  });
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('idle');
  const [trainingStatus, setTrainingStatus] = useState('idle'); // 'idle', 'training', 'success', 'failed'
  console.log("classes1111",classes);

  useEffect(() => {
    if (user?._id) {
      dispatch(getStudentClasses(user._id));
    }
  }, [dispatch, user?._id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedClassId) {
        dispatch(getfrequencyByClassId(selectedClassId)).then((result) => {
          if (getfrequencyByClassId.fulfilled.match(result)) {
            setClassFrequencies((prev) => ({
              ...prev,
              [selectedClassId]: result.payload,
            }));
          }
        });
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [dispatch, selectedClassId]);

  useEffect(() => {
    const setupPermissions = async () => {
      // Check device capabilities first
      const capabilities = await checkDeviceCapabilities();
      setDeviceCapabilities(capabilities);

      if (!capabilities.hasMicrophone || !capabilities.hasCamera) {
        alert('Your device must have both a camera and microphone for attendance.');
        return;
      }

      const granted = await checkAndRequestPermissions('student');
      setHasPermissions(granted);
    };

    setupPermissions();
  }, []);

  const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const handleFetchFrequency = async (classId) => {
    setLoadingStates(prev => ({ ...prev, fetchFrequency: true }));
    setSelectedClassId(classId);
    setStatus("Fetching frequency...");

    try {
      const result = await dispatch(getfrequencyByClassId(classId));
      if (getfrequencyByClassId.fulfilled.match(result)) {
        setClassFrequencies((prev) => ({
          ...prev,
          [classId]: result.payload,
        }));
        setStatus("Frequency fetched. You can now start attendance.");
      }
    } catch (error) {
      setStatus("Error fetching frequency. Please try again.");
    } finally {
      setLoadingStates(prev => ({ ...prev, fetchFrequency: false }));
    }
  };

  const handleStartListening = async (classId) => {
    if (!classFrequencies[classId] || classFrequencies[classId].length === 0) {
      setStatus("No frequency available for this class");
      return;
    }

    setLoadingStates(prev => ({ ...prev, listening: true }));
    setStatus("Detecting frequency...");

    try {
      await detectSound(
        setStatus, 
        classFrequencies[classId],
        async (isDetected) => {
          if (isDetected) {
            setStatus("Frequency matched! Starting face verification...");
            await startFaceVerification();
          } else {
            setStatus("Frequency detection failed. Please try again.");
          }
          setLoadingStates(prev => ({ ...prev, listening: false }));
        }
      );
    } catch (error) {
      console.error('Error in frequency detection:', error);
      setStatus("Error detecting frequency. Please try again.");
      setLoadingStates(prev => ({ ...prev, listening: false }));
    }
  };

  const startFaceVerification = async () => {
    try {
      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
  
      // Get the recognition result by opening in a new window
      const recognitionWindow = window.open(`http://localhost:3000/recognize?userId=${user._id}`, 'Face Recognition', 'width=800,height=600');
      
      // Create a promise to handle the recognition result
      const recognitionResult = await new Promise((resolve, reject) => {
        // Listen for message from recognition window
        window.addEventListener('message', function handleMessage(event) {
          if (event.origin !== 'http://localhost:3000') return;
          
          window.removeEventListener('message', handleMessage);
          recognitionWindow.close();
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        });
  
        // Handle window close
        recognitionWindow.onbeforeunload = () => {
          reject(new Error('Face verification cancelled'));
        };
      });
  
      // Handle the recognition result
      if (recognitionResult.verified) {
        setVerificationStatus('success');
        setStatus('Face verification successful! Marking attendance...');
        
        // Make API call to mark attendance
        const attendanceResponse = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId: user._id,
            classId: selectedClassId,
            verificationData: recognitionResult
          }),
        });
  
        if (!attendanceResponse.ok) {
          throw new Error('Failed to mark attendance');
        }
  
        setStatus('Attendance marked successfully!');
      } else {
        setVerificationStatus('failed');
        setStatus('Face verification failed. Please try again.');
      }
  
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationStatus('failed');
      setStatus(`Face verification failed: ${error.message}`);
    }
  };

  const startImageCapture = async () => {
    try {
      // Open capture window with user ID
      const captureWindow = window.open(
        `http://localhost:3000/capture?userId=${user._id}`,
        'Face Image Capture',
        'width=800,height=600,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes'
      );
  
      // Handle the capture result
      const captureResult = await new Promise((resolve, reject) => {
        window.addEventListener('message', function handleMessage(event) {
          if (event.origin !== 'http://localhost:3000') return;
          
          window.removeEventListener('message', handleMessage);
          captureWindow.close();
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        });
  
        // Handle window close
        captureWindow.onbeforeunload = () => {
          reject(new Error('Image capture cancelled'));
        };
      });
  
      // Handle successful capture
      if (captureResult.success) {
        setCaptureStatus('success');
        setStatus('Face images captured successfully!');
        
        // Optional: Make API call to update user profile
        const updateResponse = await fetch('/api/user/update-face', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user._id,
            faceImages: captureResult.images
          }),
        });
  
        if (!updateResponse.ok) {
          throw new Error('Failed to update user profile');
        }
  
        setStatus('Face profile updated successfully!');
      } else {
        setCaptureStatus('failed');
        setStatus('Face image capture failed. Please try again.');
      }
  
    } catch (error) {
      console.error('Image capture error:', error);
      setCaptureStatus('failed');
      setStatus(`Image capture failed: ${error.message}`);
    }
  };

  // Add after startImageCapture function
const startTraining = async () => {
  try {
    setTrainingStatus('training');
    setStatus('Starting model training...');

    // Open training window
    const trainingWindow = window.open(
      `http://localhost:3000/train?userId=${user._id}`,
      'Face Model Training',
      'width=800,height=600,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes'
    );

    // Handle the training result
    const trainingResult = await new Promise((resolve, reject) => {
      window.addEventListener('message', function handleMessage(event) {
        if (event.origin !== 'http://localhost:3000') return;
        
        window.removeEventListener('message', handleMessage);
        trainingWindow.close();
        
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      });

      // Handle window close
      trainingWindow.onbeforeunload = () => {
        reject(new Error('Training cancelled'));
      };
    });

    if (trainingResult.success) {
      setTrainingStatus('success');
      setStatus('Face model trained successfully!');
    } else {
      setTrainingStatus('failed');
      setStatus('Model training failed. Please try again.');
    }

  } catch (error) {
    console.error('Training error:', error);
    setTrainingStatus('failed');
    setStatus(`Training failed: ${error.message}`);
  }
};

  const captureFace = async () => {
    try {
      setVerificationStatus('verifying');
      
      // Create a canvas to capture the video frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert canvas to base64
      const imageData = canvas.toDataURL('image/jpeg');

      // Send to your backend API for face verification
      const response = await fetch('YOUR_FACE_VERIFICATION_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          studentId: user._id,
          classId: selectedClassId,
        }),
      });

      if (!response.ok) {
        throw new Error('Face verification failed');
      }

      const result = await response.json();
      
      if (result.verified) {
        setVerificationStatus('success');
        setStatus('Attendance marked successfully!');
        setTimeout(() => {
          closeFaceVerification();
        }, 2000);
      } else {
        setVerificationStatus('failed');
        setStatus('Face verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationStatus('failed');
      setStatus('Face verification failed. Please try again.');
    }
  };

  const closeFaceVerification = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowFaceVerification(false);
    setVerificationStatus('idle');
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div>
      <NavBar />
      <div className="p-6">
        {(!deviceCapabilities.hasMicrophone || !deviceCapabilities.hasCamera) && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p className="font-bold">Device Error</p>
            <p>Your device must have both a camera and microphone for attendance.</p>
          </div>
        )}
        
        {!hasPermissions && deviceCapabilities.hasMicrophone && deviceCapabilities.hasCamera && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">Permissions Required</p>
            <p>Camera and microphone access is required for attendance.</p>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>

        <div className="mb-6">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={startImageCapture}
            className={`relative flex items-center justify-center px-6 py-3 rounded-lg transition-all duration-300 
              ${captureStatus === 'success' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-blue-500 hover:bg-blue-600'} 
              text-white font-medium shadow-lg hover:shadow-xl`}
          >
            <span className="flex items-center space-x-2">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span>
                {captureStatus === 'success' 
                  ? 'Update Face Profile' 
                  : 'Setup Face Profile'}
              </span>
            </span>
          </motion.button>
          
          {/* Status message */}
          {captureStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-2 p-2 rounded ${
                captureStatus === 'success' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {status}
            </motion.div>
          )}
        </div>

        {/* Add after the capture button div */}
        <div className="mb-6">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={startTraining}
            className={`relative flex items-center justify-center px-6 py-3 rounded-lg transition-all duration-300 
              ${trainingStatus === 'success' 
                ? 'bg-green-500 hover:bg-green-600' 
                : trainingStatus === 'training'
                ? 'bg-yellow-500'
                : 'bg-purple-500 hover:bg-purple-600'} 
              text-white font-medium shadow-lg hover:shadow-xl`}
            disabled={trainingStatus === 'training'}
          >
            <span className="flex items-center space-x-2">
              {trainingStatus === 'training' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Training Model...</span>
                </>
              ) : (
                <>
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                    />
                  </svg>
                  <span>
                    {trainingStatus === 'success' 
                      ? 'Model Trained Successfully' 
                      : 'Train Face Recognition Model'}
                  </span>
                </>
              )}
            </span>
          </motion.button>
          
          {/* Training Status message */}
          {trainingStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mt-2 p-2 rounded ${
                trainingStatus === 'success' 
                  ? 'bg-green-100 text-green-700'
                  : trainingStatus === 'training'
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {status}
            </motion.div>
          )}
        </div>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {classes.map((cls) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={cls._id}
              className={`border rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 ${
                selectedClassId === cls._id ? 'border-blue-500 border-2' : ''
              }`}
            >
              <h3 className="font-bold text-lg">{cls.className}</h3>
              <p className="text-gray-600">Time: {new Date(cls.time).toLocaleString()}</p>
              <p className="text-gray-600">Teacher: {cls.teacherId[0].fullName}</p>

              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={() => handleFetchFrequency(cls._id)}
                  disabled={loadingStates.fetchFrequency}
                  className={`relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 ${
                    loadingStates.fetchFrequency
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 hover:transform hover:scale-105'
                  } text-white font-medium`}
                >
                  {loadingStates.fetchFrequency ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner />
                      <span>Fetching...</span>
                    </div>
                  ) : (
                    "Fetch Frequency"
                  )}
                </button>

                <button
                  onClick={() => handleStartListening(cls._id)}
                  disabled={!classFrequencies[cls._id] || selectedClassId !== cls._id || loadingStates.listening}
                  className={`relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 ${
                    !classFrequencies[cls._id] || selectedClassId !== cls._id
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : loadingStates.listening
                      ? 'bg-green-400 text-white cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white hover:transform hover:scale-105'
                  }`}
                >
                  {loadingStates.listening ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner />
                      <span>Listening...</span>
                    </div>
                  ) : (
                    "Start Attendance"
                  )}
                </button>
              </div>

              {/* Frequency Display with Animation */}
              {classFrequencies[cls._id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-100 p-4 rounded-lg mt-4"
                >
                  <h2 className="text-lg font-semibold mb-2">Expected Frequency</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {classFrequencies[cls._id].map((freq, index) => (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        key={index}
                        className="bg-white p-3 rounded-md shadow-md text-center"
                      >
                        <span className="text-blue-600 font-mono text-lg">{freq} Hz</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Status Display with Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-100 p-4 rounded-lg mb-4"
        >
          <p className="font-semibold">{status}</p>
        </motion.div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-2">
            {error}
          </div>
        )}

        <canvas id="frequencyData" className="w-full border rounded-lg mt-4"></canvas>

        {/* Face Verification Popup with Animation */}
        {showFaceVerification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Face Verification</h3>
                  <button 
                    onClick={closeFaceVerification}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Camera Preview */}
                <div className="relative w-64 h-64 mx-auto overflow-hidden rounded-full border-4 border-blue-500">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-2 border-white border-dashed rounded-full pointer-events-none"></div>
                </div>

                {/* Status and Instructions */}
                <div className="mt-4 text-center">
                  {verificationStatus === 'verifying' && (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      <span className="text-gray-600">Verifying...</span>
                    </div>
                  )}
                  {verificationStatus === 'success' && (
                    <div className="text-green-500 font-medium">Verification successful!</div>
                  )}
                  {verificationStatus === 'failed' && (
                    <div className="text-red-500 font-medium">Verification failed. Please try again.</div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    Please ensure your face is clearly visible and centered
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={closeFaceVerification}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={captureFace}
                    disabled={verificationStatus === 'verifying'}
                    className={`px-6 py-2 rounded-lg ${
                      verificationStatus === 'verifying'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    } text-white transition-colors`}
                  >
                    Verify Face
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Student;
