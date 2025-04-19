import { motion } from 'framer-motion';
import { useEffect, useState } from "react";
import { FiAlertTriangle, FiMessageSquare, FiSearch, FiWifiOff, FiXCircle } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";

import BottomNavBar from '../components/BottomNavBar';
import OfflineToggle from "../components/OfflineToggle";
import { useTheme } from '../context/ThemeContext';
import detectSound from "../helpers/detectSound";
import { getfrequencyByClassId,getStudentClasses, markStudentPresentByFrequency } from "../redux/slices/classSlice";
import { checkAndRequestPermissions, checkDeviceCapabilities } from '../utils/permissions';
import { smsReceiver } from "../utils/smsReceiver";
import { getSocket, initializeSocket, joinClassRoom, leaveClassRoom, markAttendance } from "../utils/socket";

// Format schedule array into readable string
const formatSchedule = (schedule) => {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return 'No schedule available';
  }
  
  return schedule.map(slot => {
    const day = slot.day;
    const times = Array.isArray(slot.timing) ? slot.timing.join(', ') : slot.timing;
    return `${day}: ${times}`;
  }).join(' • ');
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

const Student = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { classes, loading: classLoading, error: classError } = useSelector((state) => state.class);
  console.log("classes", classes);
  const [status, setStatus] = useState("Select a class to check frequency");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classFrequencies, setClassFrequencies] = useState({});
  const [hasPermissions, setHasPermissions] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    hasMicrophone: false,
    hasCamera: false
  });
  const [isOffline, setIsOffline] = useState(false);
  const [hasSMSPermissions, setHasSMSPermissions] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    fetchFrequency: {},
    listening: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // State for real-time notifications
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (user?.user?._id) {
      console.log("Dispatching getStudentClasses with ID:", user.user._id);
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
    };
  }, [dispatch, user?.user?._id]);

  useEffect(() => {
    if (!isOffline && selectedClassId && !loadingStates.listening) {
      const fetchFreqForSelected = () => {
        setLoadingStates(prev => ({ ...prev, fetchFrequency: { ...prev.fetchFrequency, [selectedClassId]: true } }));
        dispatch(getfrequencyByClassId(selectedClassId)).then((result) => {
          if (getfrequencyByClassId.fulfilled.match(result)) {
            setClassFrequencies((prev) => ({
              ...prev,
              [selectedClassId]: result.payload || [],
            }));
            if(result.payload && result.payload.length > 0){
               setStatus("Frequency fetched. Ready to Mark Attendance.");
            } else if (status.startsWith("Frequency fetched")) {
                setStatus("No active frequency. Fetch or wait.")
            }
          } else {
             setStatus("Error fetching frequency.");
          }
        }).finally(() => {
           setLoadingStates(prev => ({ ...prev, fetchFrequency: { ...prev.fetchFrequency, [selectedClassId]: false } }));
        });
      };

      fetchFreqForSelected();
      const interval = setInterval(fetchFreqForSelected, 10000);

      return () => clearInterval(interval);
    }
  }, [dispatch, selectedClassId, isOffline, loadingStates.listening]);

  useEffect(() => {
    const setupPermissions = async () => {
      const capabilities = await checkDeviceCapabilities();
      setDeviceCapabilities(capabilities);

      if (!capabilities.hasMicrophone || !capabilities.hasCamera) {
        alert('Your device must have both a camera and microphone for attendance.');
        return;
      }

      const granted = await checkAndRequestPermissions('student');
      setHasPermissions(granted);

      if (isOffline) {
        const smsPermissionGranted = await smsReceiver.startListening();
        setHasSMSPermissions(smsPermissionGranted);
      }
    };

    setupPermissions();

    return () => {
      if (isOffline) {
        smsReceiver.stopListening();
      }
    };
  }, [isOffline]);

  useEffect(() => {
    if (isOffline && selectedClassId) {
      const removeListener = smsReceiver.addListener((result) => {
        if (result.success) {
          setClassFrequencies(prev => ({
            ...prev,
            [selectedClassId]: [result.frequency]
          }));
          setStatus('Frequency received via SMS');
        } else {
          setStatus('Error processing SMS frequency: ' + result.error);
        }
      });

      return () => removeListener();
    }
  }, [isOffline, selectedClassId]);

  // Join class room when a class is selected
  useEffect(() => {
    if (selectedClassId && user?.user?._id) {
      joinClassRoom(selectedClassId, user.user._id);
      
      // Setup socket event listeners
      const socket = getSocket();
      
      socket.on('attendanceStarted', (data) => {
        if (data.classId === selectedClassId) {
          console.log("Received attendance notification:", data);
          // Add notification
          const classObj = classes?.find(cls => cls._id === data.classId);
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
          
          // Automatically update frequency
          setClassFrequencies(prev => ({
            ...prev,
            [selectedClassId]: data.frequency
          }));
          
          setStatus("Attendance started! Ready to mark your presence.");
          
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log("Error playing sound", e));
          
          // Auto-start frequency detection if requested by teacher
          if (data.autoDetect && hasPermissions && 
              deviceCapabilities.hasMicrophone && deviceCapabilities.hasCamera) {
            // Show a prominent notification to the user
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Attendance Check: ${classObj?.className || 'Your class'}`, {
                body: 'Automatic attendance verification starting...',
                icon: '/favicon.ico'
              });
            }
            
            // Small delay before starting detection
            setTimeout(() => {
              handleStartListening(selectedClassId);
            }, 1500);
          }
        }
      });
      
      // Cleanup when selected class changes
      return () => {
        if (selectedClassId) {
          leaveClassRoom(selectedClassId, user.user._id);
        }
        socket.off('attendanceStarted');
      };
    }
  }, [selectedClassId, user?.user?._id, classes, hasPermissions, deviceCapabilities]);

  const handleOfflineModeChange = async (offline) => {
    setIsOffline(offline);
    if (offline) {
      const smsPermissionGranted = await smsReceiver.startListening();
      setHasSMSPermissions(smsPermissionGranted);
      setStatus('Waiting for frequency via SMS...');
    } else {
      smsReceiver.stopListening();
      setStatus('Select a class to check frequency');
    }
  };

  const LoadingSpinner = ({ className = "text-white" }) => (
    <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Add manual function to fetch frequency for a specific class
  const handleManualFetchFrequency = (classId, e) => {
    e.stopPropagation(); // Prevent card selection
    setSelectedClassId(classId);
    setStatus("Fetching frequency...");
    
    setLoadingStates(prev => ({ ...prev, fetchFrequency: { ...prev.fetchFrequency, [classId]: true } }));
    dispatch(getfrequencyByClassId(classId)).then((result) => {
      if (getfrequencyByClassId.fulfilled.match(result)) {
        setClassFrequencies((prev) => ({
          ...prev,
          [classId]: result.payload || [],
        }));
        if(result.payload && result.payload.length > 0){
          setStatus("Frequency fetched. Ready to Mark Attendance.");
        } else {
          setStatus("No active frequency available for this class.");
        }
      } else {
        setStatus("Error fetching frequency.");
      }
    }).finally(() => {
      setLoadingStates(prev => ({ ...prev, fetchFrequency: { ...prev.fetchFrequency, [classId]: false } }));
    });
  };

  const handleStartListening = async (classId) => {
    if (!hasPermissions) {
      setStatus("Microphone/Camera permissions needed.");
      return;
    }
    
    if (!classId) {
      setStatus("Please select a class first");
      return;
    }
    
    if (!classFrequencies[classId] || classFrequencies[classId].length === 0) {
      setStatus("No frequency available for this class.");
      return;
    }
    
    if (!user?.user?._id) {
      setStatus("User information not available.");
      return;
    }
    
    // Check if there's an active attendance session for this class
    const selectedClass = classes.find(c => c._id === classId);
    if (!selectedClass) {
      setStatus("Class not found");
      return;
    }
    
    // Get the active session type if available
    const isActiveSession = selectedClass.activeAttendanceSession?.isActive || false;
    const activeSessionType = selectedClass.activeAttendanceSession?.sessionType || 'lecture';
    
    if (!isActiveSession) {
      setStatus("No active attendance session for this class. Wait for teacher to start attendance.");
      return;
    }
    
    setStatus(`Starting detection for ${activeSessionType} attendance...`);
    setLoadingStates(prev => ({ ...prev, listening: true }));
    setSelectedClassId(classId);
    
    try {
      const storedFrequency = classFrequencies[classId];
      console.log("Using stored frequency for detection:", storedFrequency);

      await detectSound(
        setStatus,
        storedFrequency,
        async (isDetected, detectedFreqValue) => {
          setLoadingStates(prev => ({ ...prev, listening: false }));

          if (isDetected) {
            setStatus("Frequency detected! Marking attendance...");
            
            // Emit socket event for real-time update with the correct session type
            const marked = markAttendance(
              classId, 
              user.user._id, 
              user.user.fullName || user.user.email,
              'present',
              activeSessionType // Use the active session type
            );
            
            if (!marked) {
              setStatus("Failed to emit real-time attendance update. Will still try to record via API.");
            }
            
            // Also save via API
            dispatch(markStudentPresentByFrequency({
              classId: classId,
              studentId: user.user._id,
              detectedFrequency: detectedFreqValue || storedFrequency[0],
              sessionType: activeSessionType // Include session type in API call
            }))
            .unwrap()
            .then(result => {
              setStatus(`Attendance for ${activeSessionType} marked successfully! ✅`);
              console.log("Marking success:", result);
            })
            .catch(err => {
              setStatus(`Failed to mark attendance: ${err || 'Unknown error'}`);
              console.error("Marking error:", err);
            });
          } else {
            setStatus("Frequency detection failed. Please ensure you are in the right place.");
          }
        }
      );

    } catch (error) {
      console.error('Error starting frequency detection:', error);
      setStatus("Error starting detection. Please try again.");
      setLoadingStates(prev => ({ ...prev, listening: false }));
    }
  };

  const getInfoBoxBg = (type) => {
      switch(type){
          case 'error': return isDarkMode ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-red-50 border-red-500 text-red-700';
          case 'warning': return isDarkMode ? 'bg-yellow-900/50 border-yellow-600 text-yellow-300' : 'bg-yellow-50 border-yellow-500 text-yellow-700';
          case 'info': return isDarkMode ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-500 text-blue-700';
          default: return isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-500 text-gray-700';
      }
  }

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
        {(!deviceCapabilities.hasMicrophone || !deviceCapabilities.hasCamera) && (
          <div className={`border-l-4 p-4 mb-4 rounded-r-md ${getInfoBoxBg('error')}`}>
            <p className="font-bold flex items-center"><FiXCircle className="mr-2"/> Device Error</p>
            <p>Your device must have both a camera and microphone for attendance.</p>
          </div>
        )}
        
        {!hasPermissions && deviceCapabilities.hasMicrophone && deviceCapabilities.hasCamera && (
          <div className={`border-l-4 p-4 mb-4 rounded-r-md ${getInfoBoxBg('warning')}`}>
            <p className="font-bold flex items-center"><FiAlertTriangle className="mr-2"/> Permissions Required</p>
            <p>Camera and microphone access is required for attendance.</p>
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
             <p>Waiting for frequency via SMS. Make sure you have selected a class.</p>
           </div>
        )}

        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <p className={`text-lg font-semibold text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{status}</p>
          <canvas
            id="frequencyData"
            className={`w-full h-48 rounded-lg mt-2 ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}
            style={{ display: loadingStates.listening ? 'block' : 'none' }}
          />
        </div>

        {classLoading && <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading classes...</p>}
        {classError && <p className={`text-center py-4 ${getInfoBoxBg('error')} p-3 rounded`}>Error loading classes: {classError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!classLoading && filteredClasses?.map((cls, index) => {
            const { day, time } = getSimpleSchedule(cls.schedule);
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={cls._id}
                className={`relative overflow-hidden rounded-xl shadow-lg cursor-pointer ${selectedClassId === cls._id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedClassId(cls._id)}
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

                  {/* Frequency Display */}
                  {classFrequencies[cls._id] && classFrequencies[cls._id].length > 0 && selectedClassId === cls._id && (
                    <div className="my-3 px-3 py-2 rounded bg-white/20 backdrop-blur-sm">
                      <p className="text-xs font-medium mb-1">Active Frequency:</p>
                      <div className="flex flex-wrap gap-2">
                        {classFrequencies[cls._id].map((freq, idx) => (
                          <span key={idx} className="font-mono text-sm px-2 py-0.5 rounded bg-black/20">{freq} Hz</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    {/* Get Frequency Button */}
                    <button
                      onClick={(e) => handleManualFetchFrequency(cls._id, e)}
                      disabled={loadingStates.fetchFrequency?.[cls._id]}
                      className={`w-full relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 text-white font-medium text-sm ${
                        loadingStates.fetchFrequency?.[cls._id]
                          ? 'cursor-not-allowed bg-black/30'
                          : 'hover:bg-white/20 bg-white/10 backdrop-blur-sm'
                      }`}
                    >
                      {loadingStates.fetchFrequency?.[cls._id] ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner />
                          <span>Getting Frequency...</span>
                        </div>
                      ) : (
                        "Get Frequency"
                      )}
                    </button>
                    
                    {/* Mark Attendance Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartListening(cls._id); }}
                      disabled={!classFrequencies[cls._id] || classFrequencies[cls._id].length === 0 || loadingStates.listening || !hasPermissions}
                      className={`w-full relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 text-white font-medium text-sm ${
                        (!classFrequencies[cls._id] || classFrequencies[cls._id].length === 0 || !hasPermissions)
                          ? 'cursor-not-allowed bg-black/30'
                          : loadingStates.listening && selectedClassId === cls._id
                          ? 'cursor-not-allowed bg-black/50'
                          : 'hover:bg-white/30 bg-white/20 backdrop-blur-sm'
                      }`}
                    >
                      {loadingStates.listening && selectedClassId === cls._id ? (
                        <div className="flex items-center space-x-2">
                          <LoadingSpinner />
                          <span>Listening...</span>
                        </div>
                      ) : (
                        !hasPermissions ? 'Permissions Needed' : "Mark Attendance"
                      )}
                    </button>
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
          <div className={`fixed right-4 bottom-24 p-1 rounded-full ${isDarkMode ? 'bg-green-800' : 'bg-green-500'}`}>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        ) : (
          <div className={`fixed right-4 bottom-24 p-1 rounded-full ${isDarkMode ? 'bg-red-800' : 'bg-red-500'}`}>
            <div className="w-2 h-2 rounded-full bg-red-400" />
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
