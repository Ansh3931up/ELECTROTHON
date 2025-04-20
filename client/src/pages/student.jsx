import { motion } from 'framer-motion';
import { useEffect, useState } from "react";
import { FiAlertTriangle, FiMessageSquare, FiSearch, FiWifiOff, FiXCircle } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";

import BottomNavBar from '../components/BottomNavBar';
import OfflineToggle from "../components/OfflineToggle";
import { useTheme } from '../context/ThemeContext';
import detectSound from "../helpers/detectSound";
import { getfrequencyByClassId, getStudentClasses, markStudentPresentByFrequency } from "../redux/slices/classSlice";
import { checkAndRequestPermissions, checkDeviceCapabilities } from '../utils/permissions';
import { smsReceiver } from "../utils/smsReceiver";
import { getSocket, initializeSocket, joinClassRoom, leaveClassRoom, markAttendance } from "../utils/socket";

// Sound helpers for audio feedback
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Quick beep with fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      setTimeout(() => audioContext.close(), 100);
    }, 500);
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

// Success sound - plays a pleasant ascending tone
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.5); // A5
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      setTimeout(() => audioContext.close(), 100);
    }, 1000);
  } catch (error) {
    console.error("Error playing success sound:", error);
  }
};

// Get a simplified schedule display (just the first slot's day and time)
const getSimpleSchedule = (schedule) => {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return { day: 'N/A', time: 'N/A' };
  }
  
  const firstSlot = schedule[0];
  const day = firstSlot.day?.substring(0, 3);
  const time = Array.isArray(firstSlot.timing) && firstSlot.timing.length > 0 
    ? firstSlot.timing[0] 
    : 'N/A';
  
  return { day, time };
};

// Get gradient color class based on an index
const getGradientClass = (index) => {
  const gradients = [
    'from-purple-500 to-indigo-600', // Purple gradient
    'from-blue-500 to-cyan-600',     // Blue gradient
    'from-pink-500 to-rose-600',     // Pink gradient
    'from-emerald-500 to-teal-600',  // Green gradient
    'from-orange-500 to-amber-600',  // Orange gradient
  ];
  
  return gradients[index % gradients.length];
};

// Simple loading spinner
const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Track current detection session to handle cleanup
let currentDetectionCleanup = null;

const Student = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { classes, loading: classLoading, error: classError } = useSelector((state) => state.class);
  
  const [status, setStatus] = useState("Waiting for attendance notifications...");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classFrequencies, setClassFrequencies] = useState({});
  const [hasPermissions, setHasPermissions] = useState(true);
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    hasMicrophone: true,
    hasCamera: true
  });
  const [isOffline, setIsOffline] = useState(false);
  const [hasSMSPermissions, setHasSMSPermissions] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    fetchFrequency: {},
    listening: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [canvasVisible, setCanvasVisible] = useState(false);

  // Track detection state and frequency
  const [detectionState, setDetectionState] = useState({
    active: false,
    currentFrequency: null,
    classId: null
  });

  // State for real-time notifications
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (user?.user?._id) {
      dispatch(getStudentClasses(user.user._id));
      
      // Initialize socket connection
      const socket = initializeSocket(user);
      if (socket) {
        socket.on('connect', () => {
          setSocketConnected(true);
        });
        
        socket.on('disconnect', () => {
          setSocketConnected(false);
        });
      }
    }
    
    // Cleanup function
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
      }
      // Also clean up any active detection
      if (currentDetectionCleanup) {
        currentDetectionCleanup();
        currentDetectionCleanup = null;
      }
    };
  }, [dispatch, user?.user?._id]);

  // Join all class rooms upon loading to always be ready for notifications
  useEffect(() => {
    if (user?.user?._id && classes && classes.length > 0) {
      // Join all class rooms
      classes.forEach(cls => {
        joinClassRoom(cls._id, user.user._id);
      });
      
      // Listen to socket events from any class
      const socket = getSocket();
      if (socket) {
        // Handle attendance started event from any joined class
        socket.on('attendanceStarted', (data) => {
          handleAttendanceNotification(data);
        });
      }
      
      return () => {
        // Cleanup: leave all class rooms
        const socket = getSocket();
        if (socket) {
          socket.off('attendanceStarted');
          
          classes.forEach(cls => {
            leaveClassRoom(cls._id, user.user._id);
          });
        }
      };
    }
  }, [classes, user?.user?._id]);

  useEffect(() => {
    const setupPermissions = async () => {
      const capabilities = await checkDeviceCapabilities();
      setDeviceCapabilities(capabilities);

      if (!capabilities.hasMicrophone || !capabilities.hasCamera) {
        alert('Your device must have both a camera and microphone for attendance.');
        return;
      }

      try {
        // Request permissions with a small delay to ensure browser is ready
        setTimeout(async () => {
          const granted = await checkAndRequestPermissions('student');
          setHasPermissions(granted);
          
          // Clear old status message if permissions were successful
          if (granted && status.includes("missing permissions")) {
            setStatus("Permissions granted! Waiting for attendance notifications...");
          }
        }, 500);

        if (isOffline) {
          const smsPermissionGranted = await smsReceiver.startListening();
          setHasSMSPermissions(smsPermissionGranted);
        }
      } catch (error) {
        console.error("Error requesting permissions:", error);
        setStatus("Error requesting permissions. Please use the Grant Permissions button.");
      }
    };

    setupPermissions();

    return () => {
      if (isOffline) {
        smsReceiver.stopListening();
      }
    };
  }, [isOffline, status]);

  useEffect(() => {
    if (isOffline && selectedClassId) {
      const removeListener = smsReceiver.addListener((result) => {
        if (result.success) {
          setClassFrequencies(prev => ({
            ...prev,
            [selectedClassId]: [result.frequency]
          }));
          setStatus('Frequency received via SMS! Starting automatic detection...');
          
          // Auto-start detection from SMS too
          startDetection(selectedClassId, [result.frequency]);
        } else {
          setStatus('Error processing SMS frequency: ' + result.error);
        }
      });

      return () => removeListener();
    }
  }, [isOffline, selectedClassId]);

  // Handle offline mode toggle
  const handleOfflineModeChange = async (offline) => {
    setIsOffline(offline);
    if (offline) {
      const smsPermissionGranted = await smsReceiver.startListening();
      setHasSMSPermissions(smsPermissionGranted);
      setStatus('Waiting for frequency via SMS...');
    } else {
      smsReceiver.stopListening();
      setStatus('Waiting for attendance notifications...');
    }
  };

  // Handle attendance notification from socket
  const handleAttendanceNotification = (data) => {
    console.log("Received attendance notification:", data);
    
    // Find the class that this notification is for
    const classObj = classes?.find(cls => cls._id === data.classId);
    console.log("Class object:", classObj);
    if (!classObj) return;
    
    // Add to notifications list
    setNotifications(prev => [
      {
        id: Date.now(),
        type: 'attendance',
        message: `Attendance started for ${classObj?.className || 'class'}`,
        data,
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 9) // Keep only the last 10 notifications
    ]);
    console.log("Notifications:", notifications);
    
    // Automatically select this class
    setSelectedClassId(data.classId);
    
    // Update stored frequency
    setClassFrequencies(prev => ({
      ...prev,
      [data.classId]: data.frequency
    }));
    
    // Make canvas visible immediately
    setCanvasVisible(true);
    
    // Play notification sound
    playNotificationSound();
    console.log("Starting detection for class:", data.classId, "with frequency:", data.frequency[0], "and sessionType:", data.sessionType);
    
    // Show a prominent notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Attendance Check: ${classObj?.className || 'Your class'}`, {
        body: 'Automatically detecting attendance frequency...',
        icon: '/favicon.ico',
        vibrate: [200, 100, 200]
      });
    }
    console.log("within the graph 3", hasPermissions, deviceCapabilities.hasMicrophone, deviceCapabilities.hasCamera);
    
    // Always start detection regardless of permission state
    // Update status
    console.log("within the graph");
    setStatus(`Starting automatic attendance detection for ${classObj.className}...`);
    console.log("within the graph 2");
    
    // Start detection immediately - ensure frequency is handled properly
    const freqToUse = Array.isArray(data.frequency) ? data.frequency : [data.frequency];
    startDetection(data.classId, freqToUse, data.sessionType);
  };

  // Start detection automatically
  const startDetection = async (classId, frequency, sessionType = 'lecture') => {
    console.log("Starting detection for class:", classId, "with frequency:", frequency, "and sessionType:", sessionType);
    
    // Ensure frequency is always in array format
    const freqArray = Array.isArray(frequency) ? frequency : [frequency];
    
    if (!classId || !freqArray || freqArray.length === 0) {
      setStatus("Cannot start detection - missing data");
      return;
    }
    
    // If already detecting for this class with the same frequency, don't restart
    if (
      detectionState.active && 
      detectionState.classId === classId && 
      JSON.stringify(detectionState.currentFrequency) === JSON.stringify(freqArray)
    ) {
      return;
    }
    
    // Stop previous detection if it exists
    if (currentDetectionCleanup) {
      console.log("Stopping previous detection...");
      currentDetectionCleanup();
      currentDetectionCleanup = null;
      
      // Small delay before starting new detection
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Find class details
    const classObj = classes.find(c => c._id === classId);
    if (!classObj) {
      setStatus("Class not found. Cannot start detection.");
      return;
    }
    
    // Use the active session type or fallback to provided or default
    const activeSessionType = classObj.activeAttendanceSession?.sessionType || sessionType;
    
    // Update detection state
    setDetectionState({
      active: true,
      currentFrequency: freqArray,
      classId
    });
    
    // Update UI
    setStatus(`Listening for frequency ${freqArray.join(', ')} Hz...`);
    setLoadingStates(prev => ({ ...prev, listening: true }));
    setCanvasVisible(true);
    
    console.log(`Starting detection for class ${classId} with frequency ${freqArray}`);
    
    try {
      // Use detectSound to listen for the frequency
      const cleanupFn = await detectSound(
        setStatus,
        freqArray,
        async (isDetected, detectedFreqValue) => {
          // Update state when detection completes
          setDetectionState(prev => ({ ...prev, active: false }));
          setLoadingStates(prev => ({ ...prev, listening: false }));
          
          if (isDetected) {
            // Play success sound
            playSuccessSound();
            
            // Update UI
            setStatus("✅ Frequency detected! Marking attendance...");
            
            // Keep canvas visible for a moment to see final detection
            setTimeout(() => setCanvasVisible(false), 3000);
            
            // Emit socket event for real-time update with the correct session type
            const marked = markAttendance(
              classId, 
              user.user._id, 
              user.user.fullName || user.user.email,
              'present',
              activeSessionType
            );
            
            if (!marked) {
              setStatus("Real-time update failed. Trying API...");
            }
            
            // Also save via API
            try {
              const result = await dispatch(markStudentPresentByFrequency({
                classId: classId,
                studentId: user.user._id,
                detectedFrequency: detectedFreqValue || freqArray[0],
                sessionType: activeSessionType
              })).unwrap();
              
              // Update UI with final status
              setStatus(`✅ Attendance marked successfully for ${activeSessionType}!`);
              console.log("Attendance marking success:", result);
              
              // Send system notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Attendance Confirmed ✓', {
                  body: `You've been marked present for ${classObj?.className || 'class'}`,
                  icon: '/favicon.ico'
                });
              }
            } catch (err) {
              setStatus(`⚠️ Failed to mark attendance: ${err || 'Unknown error'}`);
              console.error("Attendance marking error:", err);
            }
          } else {
            setStatus("Frequency detection failed. Will retry automatically.");
            setCanvasVisible(false);
            
            // Retry after a short delay
            setTimeout(() => {
              if (classFrequencies[classId] && classFrequencies[classId].length > 0) {
                startDetection(classId, classFrequencies[classId], activeSessionType);
              }
            }, 5000);
          }
        }
      );
      
      // Store cleanup function
      currentDetectionCleanup = cleanupFn;
      
    } catch (error) {
      console.error('Error starting frequency detection:', error);
      setStatus("Error starting detection. Will retry shortly...");
      setLoadingStates(prev => ({ ...prev, listening: false }));
      setCanvasVisible(false);
      setDetectionState(prev => ({ ...prev, active: false }));
      
      // Retry after delay
      setTimeout(() => {
        if (classFrequencies[classId] && classFrequencies[classId].length > 0) {
          startDetection(classId, classFrequencies[classId], activeSessionType);
        }
      }, 5000);
    }
  };

  const getInfoBoxBg = (type) => {
    switch(type){
      case 'error': return isDarkMode ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-red-50 border-red-500 text-red-700';
      case 'warning': return isDarkMode ? 'bg-yellow-900/50 border-yellow-600 text-yellow-300' : 'bg-yellow-50 border-yellow-500 text-yellow-700';
      case 'info': return isDarkMode ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-500 text-blue-700';
      default: return isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-500 text-gray-700';
    }
  };

  // Filter and search classes
  const filteredClasses = classes?.filter(cls => {
    const matchesSearch = cls.className.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        cls.classCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    return cls.status === activeFilter && matchesSearch;
  });

  return (
    <div className={`min-h-screen pb-24 bg-transparent`}>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Move Status and Visualization Area to the top for more prominence */}
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/90' : 'bg-white'} shadow-md ${detectionState.active ? 'border-2 border-blue-500' : ''}`}>
          <div className="flex items-center justify-center mb-2">
            {loadingStates.listening && (
              <div className="mr-2 p-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/30">
                <div className="w-3 h-3 rounded-full bg-white"></div>
              </div>
            )}
            <p className={`text-lg font-semibold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {status}
            </p>
          </div>
          
          {/* Canvas for frequency visualization - always reserve space but control opacity */}
          <div className={`transition-all duration-300 ${canvasVisible ? 'h-48 mb-2 opacity-100' : 'h-0 opacity-0'}`}>
            <canvas
              id="frequencyData"
              className={`w-full h-full rounded-lg ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}
            />
          </div>
          
          {/* Help text for auto detection */}
          {detectionState.active && (
            <p className={`text-sm text-center mt-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse shadow-sm shadow-green-500/50"></span>
              Listening automatically. Keep your device nearby and speaker volume up.
            </p>
          )}
        </div>

        {(!deviceCapabilities.hasMicrophone || !deviceCapabilities.hasCamera) && (
          <div className={`border-l-4 p-4 mb-4 rounded-r-md ${getInfoBoxBg('error')}`}>
            <p className="font-bold flex items-center"><FiXCircle className="mr-2"/> Device Error</p>
            <p>Your device must have both a camera and microphone for attendance.</p>
          </div>
        )}
        
        {!hasPermissions && deviceCapabilities.hasMicrophone && deviceCapabilities.hasCamera && (
          <div className={`border-l-4 p-4 mb-4 rounded-r-md ${getInfoBoxBg('warning')}`}>
            <p className="font-bold flex items-center"><FiAlertTriangle className="mr-2"/> Permissions Required</p>
            <p className="mb-2">Camera and microphone access is required for automatic attendance.</p>
            <button 
              onClick={async () => {
                // Request permissions manually when the button is clicked
                const granted = await checkAndRequestPermissions('student');
                setHasPermissions(granted);
                if (granted) {
                  setStatus("Permissions granted! You can now use automatic attendance.");
                  // If there's already an active class with frequency, try to start detection
                  if (selectedClassId && classFrequencies[selectedClassId] && classFrequencies[selectedClassId].length > 0) {
                    const classObj = classes.find(c => c._id === selectedClassId);
                    if (classObj?.activeAttendanceSession?.isActive) {
                      setTimeout(() => {
                        startDetection(
                          selectedClassId, 
                          classFrequencies[selectedClassId],
                          classObj.activeAttendanceSession.sessionType
                        );
                      }, 1000);
                    }
                  }
                } else {
                  setStatus("Could not get permissions. Please check your browser settings.");
                }
              }}
              className={`mt-2 px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors focus:ring-2 focus:ring-blue-400 focus:outline-none`}
            >
              Grant Permissions
            </button>
            <p className="mt-2 text-xs">
              Note: Some browsers require clicking this button to show the permission dialog. If you previously denied permissions, you may need to reset them in your browser settings.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
          {/* Search Bar */}
          <div className={`relative w-full sm:w-2/3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className={`pl-10 pr-4 py-2 w-full rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-500/50'
                  : 'bg-white border-gray-300 focus:border-blue-400 focus:ring-blue-400/50'
              }`}
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <OfflineToggle onModeChange={handleOfflineModeChange} isDarkMode={isDarkMode} />
        </div>

        {/* Filter Tabs */}
        <div className={`flex rounded-lg p-1 mb-4 text-sm font-medium ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-500 text-white'
                : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeFilter === 'active'
                ? 'bg-blue-500 text-white'
                : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeFilter === 'inactive'
                ? 'bg-blue-500 text-white'
                : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => setActiveFilter('ended')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeFilter === 'ended'
                ? 'bg-blue-500 text-white'
                : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            Ended
          </button>
        </div>

        {isOffline && !hasSMSPermissions && (
          <div className={`border-l-4 p-4 mb-4 rounded-r-md ${getInfoBoxBg('warning')}`}>
            <p className="font-bold flex items-center"><FiMessageSquare className="mr-2"/> SMS Permissions Required</p>
            <p>Please grant SMS permissions to receive frequency data in offline mode.</p>
          </div>
        )}

        {isOffline && hasSMSPermissions && (
          <div className={`border-l-4 p-4 mb-4 rounded-r-md ${getInfoBoxBg('info')}`}>
            <p className="font-bold flex items-center"><FiWifiOff className="mr-2"/> Offline Mode Active</p>
            <p>Waiting for frequency via SMS. Attendance will be automatic when received.</p>
          </div>
        )}

        {classLoading && <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading classes...</p>}
        {classError && <p className={`text-center py-4 ${getInfoBoxBg('error')} p-3 rounded`}>Error loading classes: {classError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!classLoading && filteredClasses?.map((cls, index) => {
            const { day, time } = getSimpleSchedule(cls.schedule);
            const isActiveAttendance = cls.activeAttendanceSession?.isActive;
            const attendanceSessionType = cls.activeAttendanceSession?.sessionType;
            const isSelected = selectedClassId === cls._id;
            const isDetecting = detectionState.active && detectionState.classId === cls._id;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={cls._id}
                className={`relative overflow-hidden rounded-xl shadow-lg cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => {
                  setSelectedClassId(cls._id);
                  
                  // When selecting a class, check if it has an active session to auto-start detection
                  if (cls.activeAttendanceSession?.isActive && !detectionState.active) {
                    setStatus(`Active ${cls.activeAttendanceSession.sessionType} session detected. Starting automatic detection...`);
                    
                    // Fetch latest frequency
                    dispatch(getfrequencyByClassId(cls._id)).then((result) => {
                      if (getfrequencyByClassId.fulfilled.match(result) && result.payload && result.payload.length > 0) {
                        // Auto-start detection
                        startDetection(cls._id, result.payload, cls.activeAttendanceSession.sessionType);
                      } else {
                        setStatus("No active frequency available. Waiting for teacher to start attendance.");
                      }
                    });
                  } else if (!detectionState.active) {
                    setStatus("Waiting for attendance to start...");
                  }
                }}
              >
                {/* Card Content */}
                <div className={`p-5 bg-gradient-to-br ${getGradientClass(index)} text-white h-full`}>
                  <div className="mb-6">
                    <h3 className="font-bold text-xl mb-1">{cls.className}</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm opacity-90">{cls.classCode} • {cls.batch}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs mt-2 bg-white/20 rounded-lg p-2 w-max">
                    <div className="mr-2">{day}</div>
                    <div>{time}</div>
                  </div>

                  {/* Attendance Status Indicator */}
                  {isActiveAttendance && (
                    <div className="mt-2 px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-sm text-xs font-medium inline-flex items-center">
                      <span className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse shadow-sm shadow-green-400/50"></span>
                      Active {attendanceSessionType} session
                    </div>
                  )}
                  
                  {/* Detection Status */}
                  {isDetecting && (
                    <div className="mt-2 px-3 py-1.5 rounded-full bg-blue-500/50 backdrop-blur-sm text-xs font-medium inline-flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">Detecting frequency...</span>
                    </div>
                  )}

                  {/* Frequency Display */}
                  {classFrequencies[cls._id] && classFrequencies[cls._id].length > 0 && isSelected && (
                    <div className="my-3 px-3 py-2 rounded bg-white/20 backdrop-blur-sm">
                      <p className="text-xs font-medium mb-1">Active Frequency:</p>
                      <div className="flex flex-wrap gap-2">
                        {classFrequencies[cls._id].map((freq, idx) => (
                          <span key={idx} className="font-mono text-sm px-2 py-0.5 rounded bg-black/20">{freq} Hz</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Message */}
                  <div className="mt-4 text-center">
                    <div className="text-xs text-white/80 p-2">
                      {isActiveAttendance
                        ? isDetecting 
                          ? "Automatic detection in progress..."
                          : "Ready for automatic attendance"
                        : "Waiting for teacher to start attendance..."}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {!classLoading && (!filteredClasses || filteredClasses.length === 0) && (
          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchQuery ? 'No classes match your search.' : 'You are not enrolled in any classes.'}
          </p>
        )}

        {/* Socket connection indicator */}
        {socketConnected ? (
          <div className={`fixed right-4 bottom-24 p-1.5 rounded-full shadow-lg ${isDarkMode ? 'bg-green-800 shadow-green-800/30' : 'bg-green-500 shadow-green-500/30'}`} title="Connected to server">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          </div>
        ) : (
          <div className={`fixed right-4 bottom-24 p-1.5 rounded-full shadow-lg ${isDarkMode ? 'bg-red-800 shadow-red-800/30' : 'bg-red-500 shadow-red-500/30'}`} title="Disconnected from server">
            <div className="w-3 h-3 rounded-full bg-red-400" />
          </div>
        )}
        
        {/* Active detection indicator */}
        {detectionState.active && (
          <div className={`fixed left-4 bottom-24 p-1.5 rounded-full animate-pulse shadow-lg bg-blue-500 shadow-blue-500/30`} title="Actively detecting frequency">
            <div className="w-3 h-3 rounded-full bg-blue-200" />
          </div>
        )}
        
        {/* Floating attendance status indicator */}
        {detectionState.active && (
          <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-full shadow-lg animate-pulse">
            <span className="w-3 h-3 bg-white rounded-full"></span>
            <span className="text-xs font-medium">Detecting</span>
          </div>
        )}
        
        {/* Show when attendance was marked successfully */}
        {!detectionState.active && status.includes("marked successfully") && (
          <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-full shadow-lg">
            <span className="text-xs font-medium">✓ Present</span>
          </div>
        )}
        
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className={`mb-4 overflow-hidden rounded-lg border ${
            isDarkMode ? 'bg-indigo-900/30 border-indigo-700' : 'bg-indigo-50 border-indigo-300'
          }`}>
            <div className={`px-4 py-3 ${
              isDarkMode ? 'bg-indigo-800/50 border-b border-indigo-700' : 'bg-indigo-100 border-b border-indigo-200'
            }`}>
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>
                Notifications
              </h3>
            </div>
            <div className="p-2 max-h-40 overflow-y-auto">
              {notifications.map(notification => (
                <div key={notification.id} className={`p-2 mb-2 rounded ${
                  isDarkMode 
                    ? 'bg-indigo-800/50 border border-indigo-700' 
                    : 'bg-white border border-indigo-200'
                }`}>
                  <p className={`text-sm ${isDarkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>
                    {notification.message}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-indigo-300/70' : 'text-indigo-500'}`}>
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNavBar user={user} />
    </div>
  );
};

export default Student;
