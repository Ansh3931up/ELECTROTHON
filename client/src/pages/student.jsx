import { motion } from 'framer-motion';
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import OfflineToggle from "../components/OfflineToggle";
import detectSound from "../helpers/detectSound";
import { getfrequencyByClassId,getStudentClasses, markStudentPresentByFrequency } from "../redux/slices/classSlice";
import { checkAndRequestPermissions, checkDeviceCapabilities } from '../utils/permissions';
import { smsReceiver } from "../utils/smsReceiver";

const Student = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user.user);
  const { classes } = useSelector((state) => state.class);
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
    fetchFrequency: false,
    listening: false
  });

  console.log("classes1111",classes);


  useEffect(() => {
    if (user?._id) {
      dispatch(getStudentClasses(user._id));
    }
  }, [dispatch, user?._id]);

  useEffect(() => {
    if (!isOffline) {
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
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [dispatch, selectedClassId, isOffline]);

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
      if (isOffline) {
        // In offline mode, wait for SMS
        setStatus("Waiting for frequency via SMS...");
      } else {
        const result = await dispatch(getfrequencyByClassId(classId));
        if (getfrequencyByClassId.fulfilled.match(result)) {
          setClassFrequencies((prev) => ({
            ...prev,
            [classId]: result.payload,
          }));
          setStatus("Frequency fetched. You can now start attendance.");
        }
      }
    } catch {
      setStatus("Error fetching frequency. Please try again.");
    } finally {
      setLoadingStates(prev => ({ ...prev, fetchFrequency: false }));
    }
  };

  const handleStartListening = async (classId) => {
    if (!classFrequencies[classId] || classFrequencies[classId].length === 0) {
      setStatus("No frequency available for this class. Fetch or wait for SMS.");
      return;
    }
    if (!user?._id) {
        setStatus("User information not available.");
        return;
    }

    setLoadingStates(prev => ({ ...prev, listening: true }));
    setStatus("Detecting frequency...");

    try {
      const storedFrequency = classFrequencies[classId]; // Array
      console.log("Using stored frequency for detection:", storedFrequency);

      // Assuming detectSound calls the callback with true/false
      await detectSound(
        setStatus,
        storedFrequency, // Pass the array
        async (isDetected, detectedFreqValue) => { // Assuming detectSound provides the exact detected value
          setLoadingStates(prev => ({ ...prev, listening: false })); // Stop loading indicator

          if (isDetected) {
            setStatus("Frequency detected! Marking attendance...");
            // --- Call the NEW backend endpoint ---
            dispatch(markStudentPresentByFrequency({
                classId: classId,
                studentId: user._id,
                detectedFrequency: detectedFreqValue || storedFrequency[0] // Send detected or expected freq
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
            // ------------------------------------
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

  return (
    <div>

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

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Student Dashboard</h1>
          <OfflineToggle onModeChange={handleOfflineModeChange} />
        </div>

        {isOffline && !hasSMSPermissions && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">SMS Permissions Required</p>
            <p>Please grant SMS permissions to receive frequency data in offline mode.</p>
          </div>
        )}

        {isOffline && hasSMSPermissions && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
            <p className="font-bold">Offline Mode Active</p>
            <p>Waiting for frequency via SMS. Make sure you have selected a class.</p>
          </div>
        )}

        <div className="mb-4">
          <p className="text-lg font-semibold">{status}</p>
          {/* Add frequency visualization canvas */}
          <canvas 
            id="frequencyData" 
            className="w-full h-48 bg-black rounded-lg mt-2"
            style={{ display: loadingStates.listening ? 'block' : 'none' }}
          />
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
                    isOffline ? "Wait for SMS" : "Fetch Frequency"
                  )}
                </button>

                <button
                  onClick={() => handleStartListening(cls._id)}
                  disabled={!classFrequencies[cls._id] || loadingStates.listening}
                  className={`relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 ${
                    !classFrequencies[cls._id]
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
                    "Mark Attendance"
                  )}
                </button>
              </div>

              {classFrequencies[cls._id] && (
                <div className="mt-4">
                  <h4 className="font-semibold">Active Frequency:</h4>
                  <div className="bg-gray-100 p-2 rounded mt-1">
                    {classFrequencies[cls._id].map((freq, idx) => (
                      <span key={idx} className="font-mono">{freq} Hz</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Student;
