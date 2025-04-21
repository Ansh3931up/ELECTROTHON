// client/src/pages/FaceRegistration.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertTriangle, FiCamera, FiCheckCircle, FiImage, FiRefreshCw, FiRepeat, FiSave, FiVideo } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Webcam from 'react-webcam';

import { registerFace } from '../redux/slices/authSlice';
import { uploadFileToCloudinary } from '../utils/cloudinaryHelper';
import { checkCameraPermission, requestCameraPermission } from '../utils/permissions';

const FaceRegistration = () => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const users = JSON.parse(localStorage.getItem('user'));
  const user=users.user;

  // Permission states
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionState, setPermissionState] = useState('pending'); // 'pending', 'granted', 'denied'
  
  // Face collection states
  const [collectedImages, setCollectedImages] = useState([]);
  const [numImagesCollected, setNumImagesCollected] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [processingVideo, setProcessingVideo] = useState(false);
  const recordingDuration = 5000; // 5 seconds of recording
  const timerRef = useRef(null);

  // Camera settings
  const [facingMode, setFacingMode] = useState('user');
  const videoConstraints = {
    width: 720,
    height: 480,
    facingMode: facingMode,
  };

  // New states for manual capture
  const [captureMode, setCaptureMode] = useState('video'); // 'video' or 'manual'
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  const [savingToDatabase, setSavingToDatabase] = useState(false);

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
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.removeEventListener('dataavailable', handleDataAvailable);
        mediaRecorderRef.current.removeEventListener('stop', handleStop);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
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

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  }, []);

  const handleStop = useCallback(() => {
    setIsRecording(false);
    setRecordingProgress(100);
    setProcessingVideo(true);
  }, []);

  const extractFrameAtTime = useCallback((timeMs) => {
    return new Promise((resolve, reject) => {
      try {
        if (!videoRef.current) {
          reject(new Error('Video element not available'));
          return;
        }

        // Set the video to the specified time
        videoRef.current.currentTime = timeMs / 1000;

        // Wait for the video to update to the new time
        const seekedHandler = () => {
          try {
            // Create canvas to capture the frame
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 320; // Default width if not available
            canvas.height = videoRef.current.videoHeight || 240; // Default height if not available
            
            // Check for valid dimensions
            if (canvas.width <= 0 || canvas.height <= 0) {
              reject(new Error('Invalid video dimensions'));
              return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Draw the video frame to the canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            
            // Convert the canvas to a data URL and resolve the promise
            const dataUrl = canvas.toDataURL('image/jpeg');
            videoRef.current.removeEventListener('seeked', seekedHandler);
            resolve(dataUrl);
          } catch (err) {
            console.error('Error extracting frame:', err);
            videoRef.current.removeEventListener('seeked', seekedHandler);
            reject(err);
          }
        };
        
        videoRef.current.addEventListener('seeked', seekedHandler);
        
        // Add a timeout to abort if seeking takes too long
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('seeked', seekedHandler);
            reject(new Error('Seeking timeout'));
          }
        }, 1000);
      } catch (err) {
        console.error('Error in extractFrameAtTime:', err);
        reject(err);
      }
    });
  }, []);

  const startRecording = useCallback(() => {
    setRecordedChunks([]);
    setIsRecording(true);
    setRecordingProgress(0);
    setErrorMessage('');

    if (webcamRef.current && webcamRef.current.stream) {
      try {
        // Check if stream is active
        const videoTracks = webcamRef.current.stream.getVideoTracks();
        if (!videoTracks || videoTracks.length === 0 || !videoTracks[0].readyState === 'live') {
          throw new Error('Camera stream is not active');
        }

        // Create media recorder with best available options - try a wider range of formats
        // and use lower quality settings which are more reliable
        let options;
        
        // Prioritize formats by compatibility (from most to least compatible)
        const mimeTypes = [
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
        ];
        
        // Find first supported mimetype
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            options = { 
              mimeType,
              videoBitsPerSecond: 250000 // Lower quality for better reliability
            };
            console.log(`Using mimetype: ${mimeType}`);
            break;
          }
        }
        
        // If none found, let browser choose
        if (!options) {
          console.log('No supported mimeType found, using browser default');
          options = { videoBitsPerSecond: 250000 };
        }
        
        mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, options);
        
        mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
        mediaRecorderRef.current.addEventListener('stop', handleStop);
        mediaRecorderRef.current.addEventListener('error', (event) => {
          console.error('MediaRecorder error:', event);
          setErrorMessage('Recording failed: ' + (event.error?.message || 'Unknown error'));
          setIsRecording(false);
        });
        
        // Request data more frequently (every 1 second) to avoid large chunks
        mediaRecorderRef.current.start(1000);

        // Create progress interval
        const startTime = Date.now();
        const updateProgress = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / recordingDuration) * 100);
          setRecordingProgress(progress);
          
          if (elapsed < recordingDuration) {
            requestAnimationFrame(updateProgress);
          }
        };
        
        requestAnimationFrame(updateProgress);

        // Stop recording after recordingDuration
        timerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, recordingDuration);
      } catch (error) {
        console.error('Error starting recording:', error);
        setErrorMessage(`Cannot start recording: ${error.message || 'Unknown error'}`);
        setIsRecording(false);
      }
    } else {
      setErrorMessage('Cannot start recording. Camera not accessible. Please refresh the page or check camera permissions.');
      setIsRecording(false);
    }
  }, [webcamRef, recordingDuration, handleDataAvailable, handleStop]);

  const processRecordedVideo = useCallback(() => {
    if (recordedChunks.length === 0) {
      setErrorMessage('No video data captured. Please try again.');
      setProcessingVideo(false);
      return;
    }

    try {
      console.log(`Processing ${recordedChunks.length} video chunks`);
      
      // Check data integrity
      const totalSize = recordedChunks.reduce((size, chunk) => size + chunk.size, 0);
      console.log(`Total video data size: ${totalSize} bytes`);
      
      if (totalSize < 1000) { // Less than 1KB is probably bad data
        setErrorMessage('Video data is too small. Please try again in better lighting conditions.');
        setProcessingVideo(false);
        return;
      }
      
      const blob = new Blob(recordedChunks, { type: recordedChunks[0].type || 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      
      if (videoRef.current) {
        // Clear any previous video
        videoRef.current.src = '';
        
        // Set up event handlers before setting the source
        videoRef.current.onloadedmetadata = () => {
          console.log(`Video loaded, duration: ${videoRef.current.duration}s`);
          
          // Verify the video is valid
          if (!videoRef.current.duration || 
              videoRef.current.duration === Infinity || 
              videoRef.current.duration <= 0.1) {
            setErrorMessage('Invalid video captured. Please try again in a well-lit environment.');
            setProcessingVideo(false);
            return;
          }
          
          // Continue with playback to ensure video is fully loaded
          videoRef.current.play().catch(e => {
            console.error('Video playback error:', e);
          });
        };
        
        videoRef.current.onplaying = () => {
          // Pause immediately, we just needed to start the process
          videoRef.current.pause();
          
          // Now we can extract frames
          try {
            extractFrames();
          } catch (err) {
            console.error('Error starting frame extraction:', err);
            setErrorMessage('Failed to process video. Please try again in better lighting conditions.');
            setProcessingVideo(false);
          }
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Video loading error:', e);
          setErrorMessage('Error loading video for processing. Please try recording again.');
          setProcessingVideo(false);
        };
        
        // Add a timeout in case the video doesn't load
        const videoTimeout = setTimeout(() => {
          if (videoRef.current) {
            console.error('Video processing timed out');
            setErrorMessage('Video processing timed out. Please try again.');
            setProcessingVideo(false);
          }
        }, 10000); // 10 second timeout
        
        // Function to extract frames
        const extractFrames = () => {
          clearTimeout(videoTimeout);
          
          const videoDuration = videoRef.current.duration * 1000; // in ms
          const promises = [];
          
          // Extract frames at evenly spaced intervals
          const framesToExtract = 15;
          console.log(`Extracting ${framesToExtract} frames from ${videoDuration}ms video`);
          
          for (let i = 0; i < framesToExtract; i++) {
            // Space frames evenly through the video
            const timeOffset = (i / (framesToExtract - 1)) * videoDuration;
            if (i === framesToExtract - 1) {
              // Ensure we don't go past the end of the video
              promises.push(extractFrameAtTime(Math.max(0, videoDuration - 100)));
            } else {
              promises.push(extractFrameAtTime(timeOffset));
            }
          }
          
          Promise.all(promises)
            .then((frames) => {
              // Verify we have valid frames (non-null and contains data)
              const validFrames = frames.filter(frame => 
                frame && frame.length > 1000 // Ensure frame has meaningful data
              );
              
              console.log(`Extracted ${validFrames.length} valid frames out of ${framesToExtract}`);
              
              if (validFrames.length < framesToExtract * 0.7) { // At least 70% success rate
                throw new Error(`Only extracted ${validFrames.length} valid frames`);
              }
              
              // Pad with duplicates if we don't have enough frames
              let finalFrames = [...validFrames];
              while (finalFrames.length < framesToExtract) {
                // Duplicate a random valid frame
                const randomIndex = Math.floor(Math.random() * validFrames.length);
                finalFrames.push(validFrames[randomIndex]);
              }
              
              setCollectedImages(finalFrames.slice(0, framesToExtract));
              setNumImagesCollected(Math.min(finalFrames.length, framesToExtract));
              setProcessingVideo(false);
              toast.success('Successfully captured face images!');
            })
            .catch((err) => {
              console.error('Error extracting frames:', err);
              setErrorMessage('Failed to process video. Please try again in better lighting conditions and ensure your face is clearly visible.');
              setProcessingVideo(false);
            });
        };
        
        // Set the video source to start loading
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      } else {
        setErrorMessage('Video element not available.');
        setProcessingVideo(false);
      }
    } catch (error) {
      console.error('Error in processRecordedVideo:', error);
      setErrorMessage('Failed to process video: ' + (error.message || 'Unknown error'));
      setProcessingVideo(false);
    }
  }, [recordedChunks, extractFrameAtTime, toast]);

  // Add an effect to trigger video processing when processingVideo is set to true
  useEffect(() => {
    if (processingVideo && recordedChunks.length > 0) {
      processRecordedVideo();
    }
  }, [processingVideo, recordedChunks, processRecordedVideo]);

  // New function for manual image capture
  const captureImage = useCallback(() => {
    if (!webcamRef.current) {
      setErrorMessage('Camera not available');
      return;
    }

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        setErrorMessage('Failed to capture image. Please check camera access.');
        return;
      }

      // Add to collected images
      setCollectedImages(prev => {
        // If we already have 15 images, replace the last one
        if (prev.length >= 15) {
          return [...prev.slice(0, 14), imageSrc];
        }
        return [...prev, imageSrc];
      });
      
      setNumImagesCollected(prev => Math.min(prev + 1, 15));
      
      if (numImagesCollected >= 14) {
        toast.success('All images collected!');
      } else {
        toast.info(`Image ${numImagesCollected + 1} captured. ${14 - numImagesCollected} more to go.`);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      setErrorMessage('Failed to capture image: ' + (error.message || 'Unknown error'));
    }
  }, [webcamRef, numImagesCollected, toast]);

  const clearImages = useCallback(() => {
    setCollectedImages([]);
    setNumImagesCollected(0);
    setSavedToDatabase(false);
    toast.info('All images cleared. Start capturing again.');
  }, [toast]);

  // New function to convert base64 to file object
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
      console.log(user);
      // Prepare the payload for the backend
      const payload = { 
        faceData: uploadResult.results.map(img => img.url) ,
        userId: user._id,
      };
      
      // Log the payload being sent to the backend (mask the actual image data for cleaner logs)
      console.log('Sending registration payload to backend:', {
        ...payload,
        faceData: `[${payload.faceData.length} base64 images]`,
        face: payload.cloudImageUrls
      });
      
      // Then register the face using the cloud URLs
      await dispatch(registerFace(payload)).unwrap();
      
      setSavedToDatabase(true);
      toast.success('Face registration successful!');
      
      // Setting a small delay before navigating to ensure the user sees the success message
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMessage(error.message || 'Failed to register face. Please try again.');
      setIsSubmitting(false);
    }
  };

  // New function to save images to database without navigation
  const saveToDatabase = async () => {
    if (numImagesCollected < 15) {
      setErrorMessage('Please collect all 15 images before saving.');
      return;
    }

    setSavingToDatabase(true);
    setErrorMessage('');

    try {
      // Upload images to Cloudinary
      toast.info('Uploading face images to cloud storage...');
      
      // Use the direct upload method instead
      const uploadResult = await uploadImagesDirect(collectedImages);
      
      if (uploadResult.hasErrors) {
        toast.warning(`Some images failed to upload (${uploadResult.count}/${uploadResult.totalAttempted} successful)`);
      }
      
      if (uploadResult.count === 0) {
        throw new Error('Failed to upload any face images to cloud storage');
      }
      
      // Prepare the payload for the backend
      const payload = { 
        faceData: uploadResult.results.map(img => img.url) ,
        userId: user._id,
      };
      
      // Log the payload being sent to the backend (mask the actual image data for cleaner logs)
      console.log('Saving to database - payload:', {
        ...payload,
        userId: user._id,
        faceData: payload.faceData
      });
      
      // Register the face using the cloud URLs
      await dispatch(registerFace(payload)).unwrap();
      
      setSavedToDatabase(true);
      toast.success('Face registration data saved to database!');
    } catch (error) {
      console.error('Save to database error:', error);
      setErrorMessage(error.message || 'Failed to save face data. Please try again.');
    } finally {
      setSavingToDatabase(false);
    }
  };

  const flipCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };

  // Function to view a specific image larger
  const viewImage = (index) => {
    setSelectedImageIndex(index);
  };

  // Function to close image viewer
  const closeImageViewer = () => {
    setSelectedImageIndex(null);
  };

  // Function to toggle between video and manual capture modes
  const toggleCaptureMode = () => {
    setCaptureMode(prevMode => prevMode === 'video' ? 'manual' : 'video');
    setErrorMessage(''); // Clear any previous errors
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Face Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {captureMode === 'video' 
              ? 'Record a short video turning your head slowly'
              : 'Capture individual photos of your face from different angles'}
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          {!hasPermission ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
                <FiAlertTriangle className="inline-block mr-1" />
                Camera access is required for face registration
              </div>
              <button
                onClick={handlePermissionRequest}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Allow Camera Access
              </button>
              {permissionState === 'denied' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  If you denied permission, you&apos;ll need to reset it in your browser settings.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative rounded-lg overflow-hidden shadow-inner bg-gray-200 dark:bg-gray-700">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full h-auto"
                />
                {(isRecording || processingVideo) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white">
                    {isRecording ? (
                      <>
                        <FiVideo className="text-red-500 animate-pulse text-3xl mb-2" />
                        <div>Recording... {Math.round(recordingProgress)}%</div>
                        <div className="w-3/4 h-2 bg-gray-700 rounded-full mt-2">
                          <div 
                            className="h-full bg-red-500 rounded-full" 
                            style={{ width: `${recordingProgress}%` }}
                          />
                        </div>
                        <p className="text-xs mt-2">Please turn your head slowly</p>
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="text-white animate-spin text-3xl mb-2" />
                        <div>Processing video...</div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <button
                    onClick={flipCamera}
                    className="flex items-center px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <FiRepeat className="mr-1" />
                    Flip Camera
                  </button>

                  <div className="flex space-x-2">
                    <button
                      onClick={toggleCaptureMode}
                      className="flex items-center px-3 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      {captureMode === 'video' ? <FiImage className="mr-1" /> : <FiVideo className="mr-1" />}
                      {captureMode === 'video' ? 'Switch to Manual' : 'Switch to Video'}
                    </button>
                    
                    {captureMode === 'video' ? (
                      <button
                        onClick={startRecording}
                        disabled={isRecording || processingVideo}
                        className={`px-4 py-2 rounded ${
                          isRecording || processingVideo
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        {isRecording ? 'Recording...' : 'Record Video (5s)'}
                      </button>
                    ) : (
                      <button
                        onClick={captureImage}
                        disabled={numImagesCollected >= 15}
                        className={`px-4 py-2 rounded ${
                          numImagesCollected >= 15
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <FiCamera className="mr-1 inline" /> Capture Image
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: 15 }).map((_, index) => (
                    <div
                      key={index}
                      className="relative aspect-square bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500"
                      onClick={() => collectedImages[index] && viewImage(index)}
                    >
                      {collectedImages[index] ? (
                        <img
                          src={collectedImages[index]}
                          alt={`Face ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiCamera className="text-gray-400 dark:text-gray-500" />
                      )}
                      <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Selected image viewer dialog */}
                {selectedImageIndex !== null && collectedImages[selectedImageIndex] && (
                  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageViewer}>
                    <div className="relative max-w-lg max-h-[80vh] bg-white rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                      <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 bg-white rounded-full p-1" onClick={closeImageViewer}>
                        &times;
                      </button>
                      <img 
                        src={collectedImages[selectedImageIndex]} 
                        alt={`Face ${selectedImageIndex + 1}`} 
                        className="max-w-full max-h-[75vh] object-contain"
                      />
                      <div className="text-center text-gray-700 mt-2">
                        Image {selectedImageIndex + 1} of {numImagesCollected}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center text-sm font-medium">
                  {numImagesCollected < 15 ? (
                    <span className="text-yellow-500 dark:text-yellow-400">
                      <FiAlertTriangle className="inline-block mr-1" />
                      {numImagesCollected} of 15 images collected
                    </span>
                  ) : (
                    <span className="text-green-500 dark:text-green-400">
                      <FiCheckCircle className="inline-block mr-1" />
                      All 15 images collected!
                    </span>
                  )}
                </div>

                {numImagesCollected > 0 && (
                  <div className="flex justify-center">
                    <button
                      onClick={clearImages}
                      className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Clear All Images
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-4 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    <FiAlertTriangle className="inline-block mr-1" />
                    <strong>Error:</strong> {errorMessage}
                    
                    {errorMessage.includes('Failed to process video') && (
                      <ul className="mt-2 ml-5 list-disc text-xs">
                        <li>Make sure your face is clearly visible</li>
                        <li>Ensure you have good lighting</li>
                        <li>Turn your head slowly during recording</li>
                        <li>Try using the &quot;Flip Camera&quot; button if you&apos;re on mobile</li>
                        <li>If problems persist, try using a different browser</li>
                        <li>Try switching to Manual mode and capture images one-by-one</li>
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={saveToDatabase}
                    className={`flex-1 py-2 rounded-lg flex justify-center items-center ${
                      numImagesCollected >= 15
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    } transition-colors`}
                    disabled={numImagesCollected < 15 || savingToDatabase || savedToDatabase}
                  >
                    {savingToDatabase ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : savedToDatabase ? (
                      <>
                        <FiCheckCircle className="mr-2" />
                        Saved to Database
                      </>
                    ) : (
                      <>
                        <FiSave className="mr-2" />
                        Save to Database
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    className={`flex-1 py-2 rounded-lg flex justify-center items-center ${
                      numImagesCollected >= 15 && !savedToDatabase && !isSubmitting
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    } transition-colors`}
                    disabled={numImagesCollected < 15 || isSubmitting || savedToDatabase}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : savedToDatabase ? (
                      <>
                        <FiCheckCircle className="mr-2" />
                        Registration Complete
                      </>
                    ) : (
                      numImagesCollected >= 15 ? 'Complete & Continue' : 'Collect All 15 Images First'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Hidden video element for processing */}
      <video ref={videoRef} style={{ display: 'none' }} />
    </div>
  );
};

export default FaceRegistration;