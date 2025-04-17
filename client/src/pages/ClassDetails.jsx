import { useEffect, useState } from "react";
// Icons for better visual cues
import { FiChevronLeft, FiClock, FiPause, FiPlay, FiUsers, FiVolume2,FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { useNavigate,useParams } from "react-router-dom";

import { fetchClassDetails,generatefrequency } from "../redux/slices/classSlice"; // Assuming fetchClassDetails exists or needs to be created
import { sendFrequencySMS, storeOfflineFrequency } from "../utils/offlineMode";

const generateRandomFrequency = () => {
  // ... (Keep the function as it was)
  const minFreq = 1000;
  const maxFreq = 8000;
  const frequency = new Set();
  while (frequency.size < 1) {
    const randomFreq = Math.floor(Math.random() * (maxFreq - minFreq + 1)) + minFreq;
    frequency.add(randomFreq);
  }
  return Array.from(frequency);
};


const ClassDetails = () => {
  const { classId } = useParams(); // Get classId from URL
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Selectors - adjust based on your Redux state structure for a single class
  const user = useSelector((state) => state.auth.user.user);
  const { currentClass, loading, error } = useSelector((state) => state.class); // Assuming state.class holds the single fetched class
  
  // State for attendance marking session
  const [isMarkingMode, setIsMarkingMode] = useState(false); // NEW: Controls visibility of attendance list
  const [currentDailyAttendance, setCurrentDailyAttendance] = useState({}); // NEW: Holds attendance for the session being marked

  // State moved from Teacher component
  const [classFrequencies, setClassFrequencies] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isOffline, setIsOffline] = useState(false); // May need better offline state management
  const [studentPhone, setStudentPhone] = useState("");
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);

  useEffect(() => {
    if (classId) {
      // Dispatch action to fetch details for this specific class
      // You might need to create this action/reducer if it doesn't exist
      dispatch(fetchClassDetails(classId));
    }
    // Reset marking mode when class changes
    setIsMarkingMode(false);
    setCurrentDailyAttendance({});
  }, [dispatch, classId]);

  // NEW: Handler to start marking attendance for today
  const handleStartAttendance = () => {
    if (currentClass?.studentList) {
      const initialAttendance = {};
      currentClass.studentList.forEach(student => {
        initialAttendance[student._id] = "present"; // Default everyone to present
      });
      setCurrentDailyAttendance(initialAttendance);
      setIsMarkingMode(true); // Show the attendance list
    }
  };

  // UPDATED: Handler updates the state for the current marking session
  const handleAttendanceChange = (studentId, status) => {
    setCurrentDailyAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleOfflineModeChange = (offline) => {
    setIsOffline(offline);
    // Potentially sync with a global offline state if needed
  };

  const handleGenerateFrequency = async () => {
    if (!currentClass?._id) return;
    const currentClassId = currentClass._id;

    setDisabledButtons(prev => ({ ...prev, [currentClassId]: true }));
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [currentClassId]: false }));
    }, 5000);

    const newFrequency = await generateRandomFrequency();
    
    if (isOffline) {
      // setSelectedClassId(currentClassId); // Not needed if only one class is shown
      setShowSMSForm(true);
      setClassFrequencies(prev => ({ ...prev, [currentClassId]: newFrequency }));
      storeOfflineFrequency(newFrequency);
    } else {
      const result = await dispatch(generatefrequency({ 
        classId: currentClassId, 
        teacherId: user._id,
        frequency: newFrequency
      }));
      if (generatefrequency.fulfilled.match(result)) {
        setClassFrequencies(prev => ({ ...prev, [currentClassId]: result.payload }));
        setShowFrequencyPopup(true);
      }
    }
  };

  const handleSendSMS = async () => {
    if (!studentPhone || !currentClass?._id) return;
    const currentClassId = currentClass._id;

    const frequency = classFrequencies[currentClassId];
    const success = await sendFrequencySMS(frequency, studentPhone);
    
    if (success) {
      setShowSMSForm(false);
      setStudentPhone("");
      // setSelectedClassId(null); // Not needed
    }
  };

  const togglePlaySound = () => {
    if (!currentClass?._id || !classFrequencies[currentClass._id]) return;
     const frequency = classFrequencies[currentClass._id][0];

    if (!audioContext) {
      // Create new audio context
      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      setAudioContext(newAudioContext);
      setIsPlaying(true);
      
      // ... (Sound playing logic - same as before) ...
       let intervalCount = 0;
       const playOneInterval = () => {
         const newOscillator = newAudioContext.createOscillator();
         const gainNode = newAudioContext.createGain();
         gainNode.gain.value = 0.2;
         newOscillator.type = 'sine';
         newOscillator.frequency.setValueAtTime(frequency, newAudioContext.currentTime);
         newOscillator.connect(gainNode);
         gainNode.connect(newAudioContext.destination);
         newOscillator.start();
         setOscillator(newOscillator);
         
         setTimeout(() => {
           if (newOscillator.stop) newOscillator.stop();
           if (newOscillator.disconnect) newOscillator.disconnect();
           
           intervalCount++;
           
           if (intervalCount < 3) {
             setTimeout(() => {
               if (newAudioContext && !newAudioContext.closed) {
                 playOneInterval();
               }
             }, 500); 
           } else {
             setIsPlaying(false);
             setOscillator(null);
             if (newAudioContext && !newAudioContext.closed) {
               newAudioContext.close();
               setAudioContext(null);
             }
           }
         }, 3000);
       };
       playOneInterval();
      
    } else {
      // ... (Sound stopping logic - same as before) ...
       if (oscillator) {
         if (oscillator.stop) oscillator.stop();
         if (oscillator.disconnect) oscillator.disconnect();
       }
       if (audioContext) {
         if (audioContext.close) audioContext.close();
       }
       setAudioContext(null);
       setOscillator(null);
       setIsPlaying(false);
    }
  };

  const closeFrequencyPopup = () => {
    // ... (Same logic as before) ...
    if (isPlaying && oscillator) {
      if (oscillator.stop) oscillator.stop();
      if (oscillator.disconnect) oscillator.disconnect();
    }
    if (audioContext) {
      if (audioContext.close) audioContext.close();
    }
    setAudioContext(null);
    setOscillator(null);
    setIsPlaying(false);
    setShowFrequencyPopup(false);
  };

  // UPDATED: Save attendance for the current day's session
  const saveAttendance = async () => {
     if (!currentClass?._id || Object.keys(currentDailyAttendance).length === 0) return;
     const currentClassId = currentClass._id;
     const today = new Date().toISOString(); // Save with today's date

    try {
      const attendancePayload = Object.entries(currentDailyAttendance).map(([studentId, status]) => ({
        studentId,
        status,
        classId: currentClassId,
        date: today // Use current date for this session
      }));

      // Assuming API endpoint '/api/v1/attendance/batch' handles saving for a specific date
      // Or adjust endpoint if needed e.g., '/api/v1/class/:classId/attendance'
      const response = await fetch('/api/v1/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', /* Add Auth header */ },
        body: JSON.stringify({
          attendanceRecords: attendancePayload,
          classId: currentClassId,
          recordedBy: user._id // Assuming backend needs this
        })
      });

      if (!response.ok) throw new Error('Failed to save attendance');
      alert('Attendance saved successfully!');
      setIsMarkingMode(false); // Hide the list after saving
      // Optionally navigate back or refresh data
      // navigate('/teacher');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance: ' + err.message);
    }
  };

  // --- Render Logic ---
  if (loading) return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  if (error) return <div className="p-6 text-center text-red-600 bg-red-50 rounded-lg max-w-md mx-auto mt-10">Error: {error}</div>;
  if (!currentClass) return <div className="p-6 text-center text-gray-500">Class not found.</div>;

  // Format date/time for better readability
  const formattedTime = new Date(currentClass.time).toLocaleString([], {
    dateStyle: 'short', // e.g., 12/25/2024
    timeStyle: 'short', // e.g., 11:47 AM
  });

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* --- Header --- */}
        <div className="flex items-center mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200 transition-colors duration-150"
            aria-label="Go back"
          >
            <FiChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{currentClass.className}</h1>
        </div>

        {/* --- Class Info --- */}
        <div className="mb-6 sm:mb-8 space-y-2 text-base text-gray-700">
            <p className="flex items-center">
                <FiClock className="w-5 h-5 mr-2.5 text-gray-500"/>
                <span className="font-medium mr-1.5">Time:</span> {formattedTime}
            </p>
            <p className="flex items-center">
                <FiUsers className="w-5 h-5 mr-2.5 text-gray-500"/>
                <span className="font-medium mr-1.5">Students:</span> {currentClass.studentList?.length || 0}
            </p>
        </div>

        {/* --- Attendance Section Card --- */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {!isMarkingMode ? (
            // Button to Start Attendance - More prominent
            <div className="p-8 sm:p-10 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Ready to mark attendance?</h2>
                <button
                  onClick={handleStartAttendance}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow hover:shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base"
                >
                  Start Today's Attendance
                </button>
            </div>
          ) : (
            // Attendance Marking View - Improved Table Look
            <div>
              {/* Marking Header - Clearer separation */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-semibold text-slate-800 whitespace-nowrap">
                    Attendance - {new Date().toLocaleDateString()}
                  </h2>
                  <button
                    onClick={handleGenerateFrequency}
                    className="w-full sm:w-auto flex-shrink-0 bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium py-2.5 px-5 rounded-md transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500"
                    disabled={disabledButtons[currentClass._id]}
                  >
                    Special Frequency
                  </button>
              </div>

              {/* Student List as a "Table" Body */}
              <div className="divide-y divide-slate-200">
                {currentClass.studentList?.length > 0 ? (
                  currentClass.studentList.map((student, index) => (
                    // Subtle alternating background for rows
                    <div key={student._id} className={`flex items-center justify-between p-5 gap-5 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                      <div className="flex-grow min-w-0">
                        <p className="text-base font-medium text-slate-900 truncate">{student.fullName}</p>
                        <p className="text-sm text-slate-500 truncate">{student.email}</p>
                      </div>
                      <div className="flex space-x-3 flex-shrink-0">
                        <button
                          type="button"
                          className={`px-4 h-9 rounded-md text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            currentDailyAttendance[student._id] === 'present'
                              ? 'bg-green-600 text-white border-green-600 focus:ring-green-500 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-green-500'
                          }`}
                          onClick={() => handleAttendanceChange(student._id, 'present')}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          className={`px-4 h-9 rounded-md text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                            currentDailyAttendance[student._id] === 'absent'
                              ? 'bg-red-600 text-white border-red-600 focus:ring-red-500 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-red-500'
                          }`}
                          onClick={() => handleAttendanceChange(student._id, 'absent')}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8 px-5">No students enrolled in this class.</p>
                )}
              </div>

              {/* Action Buttons Footer - More prominent */}
              {currentClass.studentList?.length > 0 && (
                  <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setIsMarkingMode(false)}
                        className="w-full sm:w-auto px-6 py-2.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
                        title="Cancel Attendance Marking"
                    >
                        Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveAttendance}
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-md shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base"
                    >
                      Save Attendance
                    </button>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* --- Modals --- */}
        {/* SMS Form Modal (Refined Look) */}
        {showSMSForm && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Send Frequency via SMS</h2>
                  <button onClick={() => setShowSMSForm(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20}/></button>
                </div>
               <div className="p-5">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone Number</label>
                 <input type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="Enter phone number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"/>
               </div>
               <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                 <button onClick={() => setShowSMSForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                 <button onClick={handleSendSMS} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Send SMS</button>
               </div>
             </div>
           </div>
         )}

        {/* Frequency Popup Modal (Refined Look) */}
         {showFrequencyPopup && currentClass && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg shadow-xl w-full max-w-sm text-center">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Frequency Sound</h2>
                  <button onClick={closeFrequencyPopup} className="text-gray-400 hover:text-gray-600"><FiX size={20}/></button>
                </div>
                <div className="p-6">
                  <div className="mb-5 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <h3 className="text-sm font-medium text-indigo-700 mb-1">Active Frequency</h3>
                    <span className="text-3xl font-semibold font-mono text-indigo-600">
                      {classFrequencies[currentClass._id]?.[0] || '---'} Hz
                    </span>
                  </div>
                  <button
                    onClick={togglePlaySound}
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full shadow-lg ${
                      isPlaying ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    } text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    aria-label={isPlaying ? 'Pause sound' : 'Play sound'}
                  >
                    {isPlaying ? <FiPause className="w-7 h-7" /> : <FiPlay className="w-7 h-7 pl-1" />}
                  </button>
                  <p className="mt-4 text-sm text-gray-600">
                    {isPlaying ? "Playing..." : "Click to play sound"}
                  </p>
                </div>
             </div>
           </div>
         )}

      </div>
    </div>
  );
};

export default ClassDetails; 