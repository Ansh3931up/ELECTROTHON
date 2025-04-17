import { motion } from 'framer-motion';
import { useEffect, useState } from "react";
import { FiMic, FiXCircle, FiAlertTriangle, FiWifiOff, FiMessageSquare } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";

import BottomNavBar from '../components/BottomNavBar';
import OfflineToggle from "../components/OfflineToggle";
import { useTheme } from '../context/ThemeContext';
import detectSound from "../helpers/detectSound";
import { getfrequencyByClassId,getStudentClasses, markStudentPresentByFrequency } from "../redux/slices/classSlice";
import { checkAndRequestPermissions, checkDeviceCapabilities } from '../utils/permissions';
import { smsReceiver } from "../utils/smsReceiver";

const Student = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const user = useSelector((state) => state.auth.user);
  const { classes, loading: classLoading, error: classError } = useSelector((state) => state.class);
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

  console.log("classes1111",classes);

  useEffect(() => {
    if (user?._id) {
      dispatch(getStudentClasses(user._id));
    }
  }, [dispatch, user?._id]);

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

  const handleStartListening = async (classId) => {
    if (!hasPermissions) {
       setStatus("Microphone/Camera permissions needed.");
       return;
    }
    if (!classFrequencies[classId] || classFrequencies[classId].length === 0) {
      setStatus("No frequency available for this class.");
      return;
    }
    if (!user?._id) {
        setStatus("User information not available.");
        return;
    }

    setLoadingStates(prev => ({ ...prev, listening: true }));
    setStatus("Detecting frequency...");
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
            dispatch(markStudentPresentByFrequency({
                classId: classId,
                studentId: user._id,
                detectedFrequency: detectedFreqValue || storedFrequency[0]
            }))
            .unwrap()
            .then(result => {
                setStatus("Attendance marked successfully! ✅");
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

  const getCardBg = () => isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const getSelectedCardBg = () => isDarkMode ? 'border-blue-500 bg-gray-800' : 'border-blue-500 bg-white';
  const getTextPrimary = () => isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const getTextSecondary = () => isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const getInfoBoxBg = (type) => {
      switch(type){
          case 'error': return isDarkMode ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-red-50 border-red-500 text-red-700';
          case 'warning': return isDarkMode ? 'bg-yellow-900/50 border-yellow-600 text-yellow-300' : 'bg-yellow-50 border-yellow-500 text-yellow-700';
          case 'info': return isDarkMode ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-500 text-blue-700';
          default: return isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-500 text-gray-700';
      }
  }

  return (
    <div className={`min-h-screen pb-24 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800'}`}>

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

        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold ${getTextPrimary()}`}>Student Dashboard</h1>
          <OfflineToggle onModeChange={handleOfflineModeChange} isDarkMode={isDarkMode} />
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
          <p className={`text-lg font-semibold text-center ${getTextPrimary()}`}>{status}</p>
          <canvas
            id="frequencyData"
            className={`w-full h-48 rounded-lg mt-2 ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}
            style={{ display: loadingStates.listening ? 'block' : 'none' }}
          />
        </div>

        {classLoading && <p className={`text-center py-4 ${getTextSecondary()}`}>Loading classes...</p>}
        {classError && <p className={`text-center py-4 ${getInfoBoxBg('error')} p-3 rounded`}>Error loading classes: {classError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!classLoading && classes?.map((cls) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={cls._id}
              className={`border rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 ${
                selectedClassId === cls._id ? getSelectedCardBg() + ' ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : getCardBg() + ' hover:-translate-y-1'
              }`}
              onClick={() => setSelectedClassId(cls._id)}
            >
              <h3 className={`font-bold text-lg mb-1 ${getTextPrimary()}`}>{cls.className}</h3>
              <p className={`${getTextSecondary()} text-sm mb-4`}>
                {cls.schedule ? formatSchedule(cls.schedule) : 'Schedule N/A'}
              </p>

              {classFrequencies[cls._id] && classFrequencies[cls._id].length > 0 && selectedClassId === cls._id && (
                <div className={`my-3 p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-xs font-medium ${getTextSecondary()} mb-1`}>Active Frequency:</p>
                  <div className="flex flex-wrap gap-2">
                    {classFrequencies[cls._id].map((freq, idx) => (
                      <span key={idx} className={`font-mono text-sm px-2 py-0.5 rounded ${isDarkMode ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>{freq} Hz</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4">
                 <button
                   onClick={(e) => { e.stopPropagation(); handleStartListening(cls._id); }}
                   disabled={!classFrequencies[cls._id] || classFrequencies[cls._id].length === 0 || loadingStates.listening || !hasPermissions}
                   className={`w-full relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 text-white font-medium text-base ${
                     (!classFrequencies[cls._id] || classFrequencies[cls._id].length === 0 || !hasPermissions)
                       ? `cursor-not-allowed ${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'}`
                       : loadingStates.listening && selectedClassId === cls._id
                       ? `cursor-not-allowed ${isDarkMode ? 'bg-red-700' : 'bg-red-500'}`
                       : `hover:scale-105 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'}`
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

            </motion.div>
          ))}
        </div>
        {!classLoading && !classes?.length && (
             <p className={`text-center py-8 ${getTextSecondary()}`}>You are not enrolled in any classes.</p>
         )}
      </div>
       <BottomNavBar user={user} />
    </div>
  );
};

export default Student;
