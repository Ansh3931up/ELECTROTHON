import React, { useEffect, useState } from "react";
// Icons for better visual cues
import { FiBookOpen, FiChevronLeft, FiClock, FiCpu, FiEdit, FiPause, FiPlay, FiUsers, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";

import { clearAttendanceError, fetchClassDetails, generatefrequency, saveDailyAttendance } from "../redux/slices/classSlice";
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
  const { classId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Selectors
  const user = useSelector((state) => state.auth.user.user);
  const { currentClass, loading, error, attendanceSaving, attendanceError } = useSelector((state) => state.class);

  // State for attendance marking session
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [currentSessionType, setCurrentSessionType] = useState(null);
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const [currentDailyAttendance, setCurrentDailyAttendance] = useState({});
  const [sortedStudentList, setSortedStudentList] = useState([]);

  // Other state remains the same
  const [classFrequencies, setClassFrequencies] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isOffline, setIsOffline] = useState(false);
  const [studentPhone, setStudentPhone] = useState("");
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);

  const isClassTeacher = currentClass?.teacherId?._id === user?._id;

  useEffect(() => {
    if (classId) {
      dispatch(fetchClassDetails(classId));
    }
    // Reset state... (remains the same)
    setIsMarkingMode(false);
    setIsSelectingType(false);
    setCurrentSessionType(null);
    setCurrentDailyAttendance({});
    dispatch(clearAttendanceError());
  }, [dispatch, classId]);

  // Step 1: Only sets frontend state now
  const handleInitiateAttendance = () => {
    if (currentClass?.studentList) {
      const initialAttendance = {};
      currentClass.studentList.forEach(student => {
        initialAttendance[student._id] = "absent"; // Default absent
      });
      setCurrentDailyAttendance(initialAttendance);
      setIsSelectingType(true); // Still ask for type first
      setIsMarkingMode(false);
      setCurrentSessionType(null);
    }
  };

  const handleSelectSessionType = (type) => {
    if (currentClass?.studentList) {
      // ... (initialize currentDailyAttendance as before - all absent) ...
      const initialAttendance = {};
      currentClass.studentList.forEach(student => {
        initialAttendance[student._id] = "absent";
      });
      setCurrentDailyAttendance(initialAttendance);
      setCurrentSessionType(type);
      setIsSelectingType(false);
      setIsMarkingMode(true);
       // Initialize sorted list when marking starts
       sortStudentList(currentClass.studentList, initialAttendance);
    }
  };

  // UPDATED: Trigger sorting after changing status
  const handleAttendanceChange = (studentId, status) => {
    const updatedAttendance = {
      ...currentDailyAttendance,
      [studentId]: status
    };
    setCurrentDailyAttendance(updatedAttendance);
    // Re-sort the list based on the new attendance state
    sortStudentList(currentClass.studentList, updatedAttendance);
  };
  // Step 3: Cancel the entire process (from type selection or marking)
  const handleCancelAttendanceProcess = () => {
    setIsMarkingMode(false);
    setIsSelectingType(false);
    setCurrentSessionType(null);
    setCurrentDailyAttendance({});
    // Optionally clear frequency states if needed
  };

  // NEW: Client-side sorting function
  const sortStudentList = (students, attendance) => {
    if (!students) return;
    const sorted = [...students].sort((a, b) => {
      const statusA = attendance[a._id] || 'absent';
      const statusB = attendance[b._id] || 'absent';
      // 'absent' comes before 'present'
      if (statusA === 'absent' && statusB === 'present') return -1;
      if (statusA === 'present' && statusB === 'absent') return 1;
      // Otherwise, keep original relative order (or sort by name)
      return a.fullName.localeCompare(b.fullName);
    });
    setSortedStudentList(sorted);
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
    if (!currentClass?._id || !currentSessionType || Object.keys(currentDailyAttendance).length === 0 || attendanceSaving) return;
    const currentClassId = currentClass._id;
    const todayISO = new Date().toISOString();

    const attendanceDataForThunk = {
        classId: currentClassId,
        date: todayISO,
        sessionType: currentSessionType,
        attendanceList: Object.entries(currentDailyAttendance).map(([studentId, status]) => ({
            studentId,
            status,
        })),
        recordedBy: user._id,
    };

    dispatch(saveDailyAttendance(attendanceDataForThunk))
        .unwrap()
        .then((result) => {
            alert('Attendance saved successfully!');
            handleCancelAttendanceProcess();
            // Consider re-fetching class details here for consistency
            // dispatch(fetchClassDetails(classId));
        })
        .catch((err) => {
            alert(`Failed to save attendance: ${err.message || 'Unknown error'}`);
        });
  };

  // --- Render Logic ---
  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-400"><p>Loading...</p></div>;
  if (error) return <div className="p-6 text-center text-red-400 bg-red-900/50 border border-red-700 rounded-lg max-w-md mx-auto mt-10">Error: {error}</div>;
  if (!currentClass) return <div className="p-6 text-center text-gray-500 bg-gray-800">Class not found.</div>;

  return (
    <div className="min-h-screen pb-24 pt-2 bg-transparent transition-colors duration-300">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* --- Header --- */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-2 rounded-full transition-colors duration-150 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
              aria-label="Go back"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">{currentClass.className}</h1>
          </div>
          {isClassTeacher && (
            <Link
              to={`/class/${classId}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm hover:bg-opacity-80 transition-colors bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
              title="Edit Class Details"
            >
              <FiEdit className="w-4 h-4"/>
              Edit
            </Link>
          )}
        </div>

        {/* --- UPDATED: Class Info --- */}
        <div className="mb-6 sm:mb-8 space-y-3 text-base text-gray-300">
            {/* Display Student Count */}
            <p className="flex items-center">
                <FiUsers className="w-5 h-5 mr-2.5 text-gray-500"/>
                <span className="font-medium mr-1.5">Students:</span> {currentClass?.studentList?.length || 0}
            </p>
        </div>

        {/* --- Attendance Section Card --- */}
        <div className="rounded-lg shadow-md border overflow-hidden bg-gray-800 border-gray-700">
          {/* State 1: Initial View - Show "Start" button */}
          {!isSelectingType && !isMarkingMode && (
            <div className="p-8 sm:p-10 text-center">
                <h2 className="text-xl font-semibold mb-6 text-gray-100">Ready to mark attendance?</h2>
                <button
                  onClick={handleInitiateAttendance} // Calls the first step handler
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow hover:shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base focus:ring-offset-gray-800"
                >
                  Start Today's Attendance
                </button>
            </div>
          )}

          {/* State 2: Selecting Type */}
          {isSelectingType && !isMarkingMode && (
            <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold mb-5 text-center text-gray-100">Select Session Type</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
                    <button
                        onClick={() => handleSelectSessionType('lecture')}
                        className="flex-1 font-medium py-3 px-6 rounded-lg transition-colors duration-150 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 bg-blue-800/60 text-blue-200 hover:bg-blue-700/70"
                    >
                        Lecture
                    </button>
                    <button
                        onClick={() => handleSelectSessionType('lab')}
                        className="flex-1 font-medium py-3 px-6 rounded-lg transition-colors duration-150 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 bg-purple-800/60 text-purple-200 hover:bg-purple-700/70"
                    >
                        Lab
                    </button>
                </div>
                <div className="text-center">
                     <button
                        type="button"
                        onClick={handleCancelAttendanceProcess} // Cancel goes back to initial state
                        className="text-sm font-medium text-gray-400 hover:text-gray-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
          )}

          {/* State 3: Marking Mode */}
          {isMarkingMode && (
            <div>
              {/* Marking Header - Now includes selected session type */}
              <div className="px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-700/50 border-gray-700">
                  <h2 className="text-xl font-semibold whitespace-nowrap capitalize text-gray-100">
                    Attendance ({currentSessionType}) - {new Date().toLocaleDateString()} {/* Show type */}
                  </h2>
                  <button
                    onClick={handleGenerateFrequency}
                    className="w-full sm:w-auto flex-shrink-0 font-medium py-2.5 px-5 rounded-md transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 bg-purple-800/60 text-purple-200 hover:bg-purple-700/70"
                    disabled={disabledButtons[currentClass._id]}
                  >
                    Special Frequency
                  </button>
              </div>

              {/* Student List - Use sortedStudentList for rendering */}
              <div className="divide-y divide-gray-700">
                {/* ** NOTE: Real-time updates from student actions require WebSockets or polling ** */}
                {sortedStudentList.length > 0 ? (
                    // <<< Use sortedStudentList >>>
                    sortedStudentList.map((student, index) => (
                        <div key={student._id} className={`flex items-center justify-between p-5 gap-5 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60'}`}>
                            <div className="flex-grow min-w-0">
                                <p className="text-base font-medium truncate text-gray-100">{student.fullName}</p>
                                <p className="text-sm truncate text-gray-400">{student.email}</p>
                            </div>
                            <div className="flex space-x-3 flex-shrink-0">
                                <button
                                    type="button"
                                    className={`px-4 h-9 rounded-md text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                        currentDailyAttendance[student._id] === 'present'
                                            ? 'bg-green-600 text-white border-green-600 focus:ring-green-500 shadow-sm focus:ring-offset-gray-800'
                                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-green-500 focus:ring-offset-gray-800'
                                    }`}
                                    onClick={() => handleAttendanceChange(student._id, 'present')}
                                >
                                    Present
                                </button>
                                <button
                                    type="button"
                                    className={`px-4 h-9 rounded-md text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                        currentDailyAttendance[student._id] === 'absent'
                                            ? 'bg-red-600 text-white border-red-600 focus:ring-red-500 shadow-sm focus:ring-offset-gray-800'
                                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-red-500 focus:ring-offset-gray-800'
                                    }`}
                                    onClick={() => handleAttendanceChange(student._id, 'absent')}
                                >
                                    Absent
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center py-8 px-5 text-gray-500">No students enrolled in this class.</p>
                )}
              </div>

              {/* Action Buttons Footer - Show loading state */}
              {currentClass.studentList?.length > 0 && (
                  <div className="px-6 py-5 border-t flex flex-col sm:flex-row justify-end items-center gap-4 bg-gray-700/50 border-gray-700">
                    <button
                        type="button"
                        onClick={handleCancelAttendanceProcess} // Cancel goes back to initial state
                        className="w-full sm:w-auto px-6 py-2.5 text-base font-medium border rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500 focus:ring-offset-gray-800"
                        disabled={attendanceSaving}
                        title="Cancel Attendance Marking"
                    >
                        Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveAttendance}
                      className="w-full sm:w-auto font-semibold py-2.5 px-6 rounded-md shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-offset-gray-800"
                      disabled={attendanceSaving} // Disable button while saving
                    >
                      {attendanceSaving ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
              )}
              {/* Display specific save error */}
              {attendanceError && (
                  <p className="text-sm text-center pt-3 px-6 text-red-400">Error: {attendanceError}</p>
              )}
            </div>
          )}
        </div>

        {/* --- Modals --- */}
        {/* SMS Form Modal (Refined Look) */}
        {showSMSForm && (
           <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="rounded-lg shadow-xl w-full max-w-sm border bg-gray-800 border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-100">Send Frequency via SMS</h2>
                  <button onClick={() => setShowSMSForm(false)} className="text-gray-400 hover:text-gray-100"><FiX size={20}/></button>
                </div>
               <div className="p-5">
                 <label className="block text-sm font-medium mb-1 text-gray-300">Student Phone Number</label>
                 <input type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} placeholder="Enter phone number" className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"/>
               </div>
               <div className="flex justify-end space-x-3 p-4 border-t rounded-b-lg bg-gray-700/50 border-gray-700">
                 <button onClick={() => setShowSMSForm(false)} className="px-4 py-2 text-sm font-medium rounded-md border transition-colors bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500">Cancel</button>
                 <button onClick={handleSendSMS} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Send SMS</button>
               </div>
             </div>
           </div>
         )}

        {/* Frequency Popup Modal (Refined Look) */}
         {showFrequencyPopup && currentClass && (
           <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="rounded-lg shadow-xl w-full max-w-sm text-center border bg-gray-800 border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-100">Frequency Sound</h2>
                  <button onClick={closeFrequencyPopup} className="text-gray-400 hover:text-gray-100"><FiX size={20}/></button>
                </div>
                <div className="p-6">
                  <div className="mb-5 p-4 rounded-lg border bg-indigo-900/30 border-indigo-700/50">
                    <h3 className="text-sm font-medium mb-1 text-indigo-300">Active Frequency</h3>
                    <span className="text-3xl font-semibold font-mono text-indigo-300">
                      {classFrequencies[currentClass._id]?.[0] || '---'} Hz
                    </span>
                  </div>
                  <button
                    onClick={togglePlaySound}
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full shadow-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isPlaying ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    } focus:ring-offset-gray-800`}
                    aria-label={isPlaying ? 'Pause sound' : 'Play sound'}
                  >
                    {isPlaying ? <FiPause className="w-7 h-7" /> : <FiPlay className="w-7 h-7 pl-1" />}
                  </button>
                  <p className="mt-4 text-sm text-gray-400">
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