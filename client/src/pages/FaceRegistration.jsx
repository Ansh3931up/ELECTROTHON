// client/src/pages/FaceRegistration.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiPause, FiPlay, FiRefreshCw, FiSave } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Webcam from 'react-webcam';

import { useTheme } from '../context/ThemeContext';
import { getUserProfile, registerFace } from '../redux/slices/authSlice';
import { uploadFileToCloudinary } from '../utils/cloudinaryHelper';
import { checkCameraPermission, requestCameraPermission } from '../utils/permissions';

// Helper function to extract the actual user data from potentially nested user objects
const extractUserData = (userObj) => {
  let current = userObj;
  while (current && current.user && typeof current.user === 'object' && current.user._id === undefined) {
    current = current.user;
  }
  
  // Return the user with actual user properties (_id, fullName, etc.)
  return current && current.user && current.user._id ? current.user : current;
};

// Helper function to get user ID regardless of nesting level
const getUserId = (userObj) => {
  const userData = extractUserData(userObj);
  return userData && userData._id;
};

const FaceRegistration = () => {
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const users = JSON.parse(localStorage.getItem('user'));
  console.log("users", users);
  
  // Use helper function to extract the correct user data
  const user = extractUserData(users);
  console.log("Extracted user data:", user);
  
  // Check if user already has face data and verification status
  const [hasFaceData, setHasFaceData] = useState(false);
  
  // View settings - show or hide captured images
  const [showCapturedImages, setShowCapturedImages] = useState(false);

  // Permission states
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionState, setPermissionState] = useState('pending'); // 'pending', 'granted', 'denied'
  
  // Face collection states
  const [collectedImages, setCollectedImages] = useState([]);
  const [numImagesCollected, setNumImagesCollected] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Camera settings
  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: 'user',
  };

  // Image viewing state
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  
  // Auto-capture state
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [autoCapturingProgress, setAutoCapturingProgress] = useState(0);
  const autoIntervalRef = useRef(null);
  
  // Camera view settings
  const [fullscreenCamera, setFullscreenCamera] = useState(false);
  
  // Check if user already has face data and verification status
  useEffect(() => {
    if (user && user.faceData) {
      // Check verification status first
      if (user.faceData.verificationStatus === 'verified') {
        toast.info('Your face verification is already complete!');
        // Redirect to home or dashboard page
        setTimeout(() => {
          navigate('/');
        }, 1500);
        return;
      }
      
      // Set face data flag if they have face images
      if (user.faceData.faceImages && user.faceData.faceImages.length > 0) {
        setHasFaceData(true);
        console.log("User already has face data:", user.faceData);
      }
    }
  }, [user, navigate]);

  // Check camera permission on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const hasAccess = await checkCameraPermission();
        setHasPermission(hasAccess);
        setPermissionState(hasAccess ? 'granted' : 'pending');
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissionState('denied');
        setErrorMessage('Camera permission denied. Please enable camera access in your browser settings.');
      }
    };
    
    checkPermissions();
  }, []);

  const handlePermissionRequest = async () => {
    try {
      setPermissionState('pending');
      const result = await requestCameraPermission();
      setHasPermission(result);
      setPermissionState(result ? 'granted' : 'denied');
      if (!result) {
        setErrorMessage('Camera permission denied. Please enable camera access in your browser settings.');
      } else {
        setErrorMessage('');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionState('denied');
      setErrorMessage(`Couldn&apos;t access camera: ${error.message}`);
    }
  };

  // Function to convert base64 to file object
  const base64ToFile = (base64, filename) => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  };

  // Function to upload images directly using the method provided by the user
  const uploadImagesDirect = async (images) => {
    try {
      const uploadedUrls = [];
      
      console.log(`Starting direct upload of ${images.length} images`);
      
      for (let i = 0; i < images.length; i++) {
        // Skip invalid images
        if (!images[i] || images[i].length < 100) {
          console.warn(`Image ${i+1} is invalid or too small, skipping`);
          continue;
        }
        
        // Convert base64 to file
        const filename = `face_${i+1}.jpg`;
        const file = base64ToFile(images[i], filename);
        
        console.log(`Preparing to upload image ${i+1}/${images.length}:`, {
          filename,
          type: file.type,
          size: file.size
        });
        
        // Upload using direct method
        const url = await uploadFileToCloudinary(file);
        
        if (url) {
          uploadedUrls.push({ url });
          console.log(`Image ${i+1} uploaded successfully: ${url}`);
        }
      }
      
      console.log(`Upload complete: ${uploadedUrls.length}/${images.length} images successful`);
      
      return {
        results: uploadedUrls,
        hasErrors: uploadedUrls.length === 0,
        count: uploadedUrls.length,
        totalAttempted: images.length
      };
    } catch (error) {
      console.error('Error in uploadImagesDirect:', error);
      return {
        results: [],
        hasErrors: true,
        count: 0,
        totalAttempted: images.length
      };
    }
  };

  // Function to fetch the latest user data
  const refreshUserData = async () => {
    try {
      const userId = getUserId(users);
      if (!userId) {
        console.error("Cannot refresh user data: User ID not found");
        return;
      }
      
      console.log("Refreshing user data for ID:", userId);
      
      // Call your API to get the latest user data
      const refreshedUserData = await dispatch(getUserProfile({ userId })).unwrap();
      
      // Update local storage with fresh data
      if (refreshedUserData) {
        // Store the updated user data
        localStorage.setItem('user', JSON.stringify(refreshedUserData));
        console.log("User data refreshed:", refreshedUserData);
        
        // Check updated verification status
        if (refreshedUserData.faceData && 
            refreshedUserData.faceData.verificationStatus === 'verified') {
          toast.success("Your face verification is now complete!");
        }
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const handleSubmit = async () => {
    if (numImagesCollected < 15) {
      setErrorMessage('Please collect all 15 images before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // First upload images to Cloudinary
      toast.info('Uploading face images to cloud storage...');
      
      // Use the direct upload method instead of the previous one that had issues
      const uploadResult = await uploadImagesDirect(collectedImages);
      
      if (uploadResult.hasErrors) {
        toast.warning(`Some images failed to upload (${uploadResult.count}/${uploadResult.totalAttempted} successful)`);
      }
      
      if (uploadResult.count === 0) {
        throw new Error('Failed to upload any face images to cloud storage');
      }
      
      // Get user ID regardless of nesting level
      const userId = getUserId(users);
      console.log("Using user ID:", userId);
      
      if (!userId) {
        throw new Error('Could not determine user ID. Please try logging out and back in.');
      }
      
      // Prepare the payload for the backend with the extracted userId
      const payload = { 
        faceData: uploadResult.results.map(img => img.url),
        userId: userId,
      };
      
      // Log the payload being sent to the backend
      console.log('Sending registration payload to backend:', {
        ...payload,
        faceData: payload.faceData,
        userId: payload.userId
      });
      
      // Then register the face using the cloud URLs
      const response = await dispatch(registerFace(payload)).unwrap();
      console.log("response", response);
      
      if(response.success){
        setSavedToDatabase(true);
        toast.success('Face registration successful!');
        
        // Refresh user data to get the latest verification status
        await refreshUserData();
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(error.message || 'Failed to register face. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Function to view a specific image larger
  const viewImage = (index) => {
    setSelectedImageIndex(index);
  };

  // Function to close image viewer
  const closeImageViewer = () => {
    setSelectedImageIndex(null);
  };

  // Function to remove an image
  const removeImage = (indexToRemove) => {
    setCollectedImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setNumImagesCollected(prev => prev - 1);
    if (selectedImageIndex === indexToRemove) {
      setSelectedImageIndex(null);
    }
  };
  
  // Function to reset/clear all collected images
  const handleRetake = useCallback(() => {
    if (isAutoCapturing) {
      // Stop auto-capture if it's running
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
      setIsAutoCapturing(false);
    }
    
    // Clear the collected images
    setCollectedImages([]);
    setNumImagesCollected(0);
    setSelectedImageIndex(null);
    setErrorMessage('');
    
    toast.info("All images cleared. You can start again.");
  }, [isAutoCapturing]);

  // Calculate progress percentage
  const progressPercentage = (numImagesCollected / 15) * 100;

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
      }
    };
  }, []);

  // Function to toggle auto-capture mode
  const toggleAutoCapture = useCallback(() => {
    if (isAutoCapturing) {
      // Stop auto-capture
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
      setIsAutoCapturing(false);
      toast.info("Auto-capture stopped");
    } else {
      // Start auto-capture
      if (numImagesCollected >= 15) {
        toast.warning("Maximum number of images already collected");
        return;
      }

      setIsAutoCapturing(true);
      setAutoCapturingProgress(0);
      toast.info("Auto-capture started - photos will be taken automatically");

      let captureCount = 0;
      const totalNeeded = 15 - numImagesCollected;
      
      autoIntervalRef.current = setInterval(() => {
        if (webcamRef.current) {
          try {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
              throw new Error('Failed to capture image');
            }
            
            setCollectedImages(prev => [...prev, imageSrc]);
            setNumImagesCollected(prev => prev + 1);
            
            captureCount++;
            setAutoCapturingProgress(Math.min(100, (captureCount / totalNeeded) * 100));
            
            // Only show toast for every 5th image to reduce notification spam
            if (captureCount % 5 === 0 || captureCount === totalNeeded) {
              toast.success(`Auto-capture: ${numImagesCollected + 1}/15 photos`);
            }
            
            // Stop if we've collected enough images
            if (numImagesCollected + 1 >= 15 || captureCount >= totalNeeded) {
              clearInterval(autoIntervalRef.current);
              autoIntervalRef.current = null;
              setIsAutoCapturing(false);
              toast.success('Auto-capture complete!');
            }
          } catch (error) {
            console.error('Error in auto-capture:', error);
            clearInterval(autoIntervalRef.current);
            autoIntervalRef.current = null;
            setIsAutoCapturing(false);
            setErrorMessage(`Auto-capture failed: ${error.message}`);
          }
        }
      }, 200); // Capture every 0.2 seconds
    }
  }, [isAutoCapturing, numImagesCollected, webcamRef]);

  // Function to toggle showing captured images
  const toggleShowCapturedImages = () => {
    setShowCapturedImages(prev => !prev);
  };

  // Toggle fullscreen camera view
  const toggleFullscreenCamera = () => {
    setFullscreenCamera(prev => !prev);
  };

  return (
    <div className={`min-h-screen bg-transparent  flex flex-col items-center justify-center py-6 px-4 sm:px-6 lg:px-8`}>
      <div className={`w-full ${fullscreenCamera ? 'max-w-5xl' : 'max-w-3xl'} space-y-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg transition-all duration-300`}>
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Face Registration
          </h2>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {numImagesCollected}/15 photos captured
          </p>
        </div>
        
        {hasFaceData && (
          <div className={`p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-yellow-900/30 border border-yellow-800 text-yellow-300' 
              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
          }`}>
            <div className="flex items-start text-sm">
              <FiAlertTriangle className="text-lg mr-2 flex-shrink-0 mt-0.5" />
              <span>
                You already have face data registered. Submitting new data will replace your existing face data.
              </span>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {!hasPermission ? (
            <div className={`flex flex-col items-center justify-center space-y-4 p-6 ${
              isDarkMode 
                ? 'border border-yellow-800 bg-yellow-900/30' 
                : 'border border-yellow-200 bg-yellow-50'
            } rounded-lg`}>
              <div className={`p-4 ${
                isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
              } rounded-lg text-sm flex items-center`}>
                <FiAlertTriangle className="text-xl mr-2" />
                <span>Camera access is required for face registration</span>
              </div>
              <button
                onClick={handlePermissionRequest}
                className={`w-full px-4 py-3 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-lg shadow transition-colors font-medium`}
              >
                Allow Camera Access
              </button>
              {permissionState === 'denied' && (
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center max-w-xs`}>
                  If you denied permission, you&apos;ll need to reset it in your browser settings.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Enhanced camera container */}
              <div 
                className={`relative w-full ${fullscreenCamera ? 'h-[70vh]' : 'h-[50vh]'} rounded-lg overflow-hidden shadow-xl ${
                  isDarkMode 
                    ? 'bg-black border-2 border-gray-600' 
                    : 'bg-black border-2 border-gray-300'
                } transition-all duration-300`}
              >
                {/* Camera background - solid black */}
                <div className="absolute inset-0 bg-black"></div>
                
                {/* Webcam with object-fit: contain to maintain aspect ratio */}
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="absolute inset-0 w-full h-full object-contain z-10"
                />
                
                {/* Camera viewfinder overlay */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-3 left-3 w-12 h-12 border-t-2 border-l-2 border-white opacity-60"></div>
                  <div className="absolute top-3 right-3 w-12 h-12 border-t-2 border-r-2 border-white opacity-60"></div>
                  <div className="absolute bottom-3 left-3 w-12 h-12 border-b-2 border-l-2 border-white opacity-60"></div>
                  <div className="absolute bottom-3 right-3 w-12 h-12 border-b-2 border-r-2 border-white opacity-60"></div>
                  
                  {/* Center focus point */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32">
                    <div className="w-full h-full rounded-full border border-white opacity-30"></div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white opacity-20"></div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white opacity-70"></div>
                  </div>
                  
                  {/* Face position guide text */}
                  <div className="absolute top-5 left-0 right-0 text-center">
                    <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                      Position your face in the center
                    </span>
                  </div>
                </div>

                {/* Circular progress indicator in the center during auto-capture */}
                {isAutoCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="relative">
                      {/* Circular progress background */}
                      <svg className="w-28 h-28" viewBox="0 0 100 100">
                        <circle 
                          className="stroke-gray-600 opacity-80"
                          strokeWidth="6"
                          fill="rgba(0,0,0,0.5)"
                          r="44"
                          cx="50"
                          cy="50"
                        />
                        {/* Animated progress circle */}
                        <circle 
                          className="stroke-blue-500"
                          strokeWidth="6"
                          fill="transparent"
                          r="44"
                          cx="50"
                          cy="50"
                          strokeDasharray="276.46"
                          strokeDashoffset={276.46 - (276.46 * autoCapturingProgress / 100)}
                          strokeLinecap="round"
                          style={{
                            transition: 'stroke-dashoffset 0.2s ease',
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center'
                          }}
                        />
                      </svg>
                      {/* Text in the center of circle */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-xl drop-shadow-lg">{numImagesCollected}/15</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Camera controls overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-4 py-3 z-20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isAutoCapturing ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                      <span className="text-white text-xs">
                        {isAutoCapturing ? 'CAPTURING' : 'READY'}
                      </span>
                    </div>
                    
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-800 rounded-full h-1">
                        <div 
                          className="bg-green-500 h-1 rounded-full transition-all duration-300" 
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                </div>

                    <button
                      onClick={toggleFullscreenCamera}
                      className="text-white text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                    >
                      {fullscreenCamera ? 'Compact' : 'Expand'}
                    </button>
                  </div>
                </div>
                </div>

                {errorMessage && (
                <div className={`mt-4 p-3 ${
                  isDarkMode 
                    ? 'bg-red-900/30 border border-red-800 text-red-300' 
                    : 'bg-red-50 border border-red-300 text-red-700'
                } rounded-lg text-sm flex items-start w-full`}>
                  <FiAlertTriangle className="text-lg mr-2 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                  </div>
                )}

              {/* Simplified control buttons - max-width to prevent overflow */}
              <div className="flex flex-col sm:flex-row justify-center w-full max-w-md mx-auto gap-4 mt-6">
                {/* Auto-capture button */}
                <button
                  onClick={toggleAutoCapture}
                  disabled={numImagesCollected >= 15 || isSubmitting}
                  className={`flex items-center justify-center px-6 py-3 ${
                    isDarkMode
                      ? isAutoCapturing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                      : isAutoCapturing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:bg-gray-400 text-white rounded-lg shadow-md transition-colors font-medium flex-1`}
                >
                  {isAutoCapturing ? (
                    <>
                      <FiPause className="mr-2" />
                      Stop Capture
                    </>
                  ) : (
                    <>
                      <FiPlay className="mr-2" />
                      Auto-Capture
                    </>
                  )}
                </button>

                {/* Toggle images button - only when there are images */}
                {collectedImages.length > 0 && (
                  <button
                    onClick={toggleShowCapturedImages}
                    className={`flex items-center justify-center px-6 py-3 ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } rounded-lg shadow-md transition-colors font-medium`}
                  >
                    {showCapturedImages ? 'Hide Images' : 'Show Images'}
                  </button>
                )}
                
                {/* Retake button - only when there are images */}
                {collectedImages.length > 0 && (
                  <button
                    onClick={handleRetake}
                    className={`flex items-center justify-center px-6 py-3 ${
                      isDarkMode
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    } rounded-lg shadow-md transition-colors font-medium`}
                  >
                    <FiRefreshCw className="mr-2" />
                    Retake All
                  </button>
                )}
              </div>
              
              {/* Collapsible captured images gallery */}
              {showCapturedImages && collectedImages.length > 0 && (
                <div className={`mt-4 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border border-gray-700' 
                    : 'bg-gray-50 border border-gray-200'
                } p-4 rounded-lg w-full`}>
                  <h3 className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  } mb-3 flex items-center`}>
                    <span className={`${
                      isDarkMode 
                        ? 'bg-blue-900 text-blue-300' 
                        : 'bg-blue-100 text-blue-800'
                    } text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2`}>
                      {numImagesCollected}
                    </span>
                    Captured Images
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {collectedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img} 
                          alt={`Face ${idx + 1}`}
                          className={`w-full h-16 object-cover rounded-md cursor-pointer shadow-sm ${
                            isDarkMode
                              ? 'border border-gray-600 hover:shadow-md'
                              : 'border border-gray-300 hover:shadow-md'
                          } transition-shadow`}
                          onClick={() => viewImage(idx)}
                        />
                        <button
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          onClick={() => removeImage(idx)}
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 rounded-bl">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Image viewer modal */}
              {selectedImageIndex !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={closeImageViewer}>
                  <div className="relative max-w-2xl max-h-full p-4">
                    <img 
                      src={collectedImages[selectedImageIndex]} 
                      alt={`Face ${selectedImageIndex + 1}`}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    />
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(selectedImageIndex);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white py-2 px-4 rounded-lg text-sm">
                      Image {selectedImageIndex + 1} of {numImagesCollected}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Submit button - at the bottom, with larger size */}
              {!savedToDatabase && numImagesCollected > 0 && (
                <div className="w-full max-w-md mx-auto mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={numImagesCollected < 15 || isSubmitting}
                    className={`flex items-center justify-center px-6 py-4 ${
                      isDarkMode
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700'
                        : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                    } text-white rounded-lg shadow-lg transition-colors font-medium w-full`}
                  >
                    <FiSave className="mr-2 text-lg" />
                    {isSubmitting ? 'Saving...' : hasFaceData ? 'Update Face Data' : 'Save Face Data'}
                  </button>
                  {numImagesCollected < 15 && (
                    <p className={`text-center text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Need {15 - numImagesCollected} more photos before saving
                    </p>
                  )}
                </div>
              )}
              
              {savedToDatabase && (
                <div className={`flex items-center justify-center mt-6 w-full max-w-md mx-auto ${
                  isDarkMode
                    ? 'text-green-400 bg-green-900/20 border border-green-800'
                    : 'text-green-500 bg-green-50 border border-green-200'
                } p-4 rounded-lg`}>
                  <FiCheckCircle className="mr-2 text-xl" />
                  <span className="font-medium">
                    {hasFaceData 
                      ? 'Face data updated successfully!' 
                      : 'Face registration successful!'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;