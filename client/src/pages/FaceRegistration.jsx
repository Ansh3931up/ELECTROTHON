// client/src/pages/FaceRegistration.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiCamera, FiCheckCircle, FiSave } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Webcam from 'react-webcam';

import { useTheme } from '../context/ThemeContext';
import { registerFace } from '../redux/slices/authSlice';
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
  
  // Check if user already has face data
  const [hasFaceData, setHasFaceData] = useState(false);

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
  
  // Check if user already has face data
  useEffect(() => {
    if (user && user.faceData && 
        (user.faceData.faceImages && user.faceData.faceImages.length > 0)) {
      setHasFaceData(true);
      console.log("User already has face data:", user.faceData);
    }
  }, [user]);

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

  const captureImage = useCallback(() => {
    if (numImagesCollected >= 15) {
      setErrorMessage('Maximum number of images (15) already captured');
      return;
    }

    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          throw new Error('Failed to capture image');
        }
        
        setCollectedImages(prev => [...prev, imageSrc]);
        setNumImagesCollected(prev => prev + 1);
        
        toast.success(`Image ${numImagesCollected + 1}/15 captured!`);
      } catch (error) {
        console.error('Error capturing image:', error);
        setErrorMessage(`Failed to capture image: ${error.message}`);
      }
    }
  }, [numImagesCollected]);

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
          setTimeout(() => {
            navigate('/');
          }, 1500);
        
      }
      if (!hasFaceData) {
        // Setting a small delay before na
        // vigating to ensure the user sees the success message
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
  
  // Calculate progress percentage
  const progressPercentage = (numImagesCollected / 15) * 100;

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className={`max-w-md w-full space-y-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-8 rounded-xl shadow-lg`}>
        <div>
          <h2 className={`mt-2 text-center text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Face Registration
          </h2>
          <p className={`mt-3 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please capture 15 photos of your face from different angles
          </p>
        </div>
        
        {hasFaceData && (
          <div className={`p-4 rounded-lg ${
            isDarkMode 
              ? 'bg-yellow-900/30 border border-yellow-800 text-yellow-300' 
              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
          }`}>
            <div className="flex items-start">
              <FiAlertTriangle className="text-xl mr-2 flex-shrink-0 mt-0.5" />
              <span>
                You already have face data registered. Submitting new data will replace your existing face data.
              </span>
            </div>
          </div>
        )}
        
        <div className="mt-6 space-y-6">
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
            <div className="space-y-6">
              <div className={`relative rounded-lg overflow-hidden shadow-lg ${
                isDarkMode 
                  ? 'bg-gray-700 border-4 border-gray-600' 
                  : 'bg-gray-200 border-4 border-gray-300'
              }`}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full h-auto"
                />
                
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                  <div className="flex justify-between items-center text-white text-xs mb-1">
                    <span>Progress:</span>
                    <span>{numImagesCollected}/15 images</span>
                  </div>
                  <div className={`w-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-600'} rounded-full h-2.5`}>
                    <div 
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {errorMessage && (
                <div className={`p-4 ${
                  isDarkMode 
                    ? 'bg-red-900/30 border border-red-800 text-red-300' 
                    : 'bg-red-50 border border-red-300 text-red-700'
                } rounded-lg text-sm flex items-start`}>
                  <FiAlertTriangle className="text-xl mr-2 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              
              <div className="flex justify-center">
                <button
                  onClick={captureImage}
                  disabled={numImagesCollected >= 15 || isSubmitting}
                  className={`w-3/4 flex items-center justify-center px-6 py-3 ${
                    isDarkMode
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700'
                      : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                  } text-white rounded-lg shadow-md transition-colors font-medium text-lg`}
                >
                  <FiCamera className="mr-2 text-xl" />
                  Capture Image
                </button>
              </div>
              
              {/* Captured images gallery */}
              {collectedImages.length > 0 && (
                <div className={`mt-6 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border border-gray-700' 
                    : 'bg-gray-50 border border-gray-200'
                } p-4 rounded-lg`}>
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
                  <div className="grid grid-cols-3 gap-3">
                    {collectedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img} 
                          alt={`Face ${idx + 1}`}
                          className={`w-full h-24 object-cover rounded-md cursor-pointer shadow-sm ${
                            isDarkMode
                              ? 'border border-gray-600 hover:shadow-md'
                              : 'border border-gray-300 hover:shadow-md'
                          } transition-shadow`}
                          onClick={() => viewImage(idx)}
                        />
                        <button
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(idx)}
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Selected image viewer */}
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
              
              {/* Submit buttons */}
              <div className={`flex justify-center mt-6 pt-4 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                {savedToDatabase ? (
                  <div className={`flex items-center justify-center ${
                    isDarkMode
                      ? 'text-green-400 bg-green-900/20 border border-green-800'
                      : 'text-green-500 bg-green-50 border border-green-200'
                  } p-3 rounded-lg w-full`}>
                    <FiCheckCircle className="mr-2 text-xl" />
                    <span className="font-medium">
                      {hasFaceData 
                        ? 'Face data updated successfully!' 
                        : 'Face registration successful!'}
                    </span>
                  </div>
                ) : (
                  <div className="w-full">
                    <button
                      onClick={handleSubmit}
                      disabled={numImagesCollected < 15 || isSubmitting}
                      className={`w-full px-4 py-3 ${
                        isDarkMode
                          ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-700'
                          : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
                      } text-white rounded-lg shadow flex items-center justify-center transition-colors font-medium text-lg`}
                    >
                      <FiSave className="mr-2" />
                      {isSubmitting ? 'Saving...' : hasFaceData ? 'Update Face Data' : 'Save Face Data'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;