import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import OfflineToggle from "../components/OfflineToggle";
import { fetchAllStudents } from "../redux/slices/authSlice";
import { createClass, generatefrequency, getTeacherClasses } from "../redux/slices/classSlice";
import { sendFrequencySMS, storeOfflineFrequency } from "../utils/offlineMode";

const generateRandomFrequency = () => {
  const minFreq = 1000; // 1 kHz
  const maxFreq = 8000; // 8 kHz
  const frequency = new Set();

  while (frequency.size < 1) {
    const randomFreq = Math.floor(Math.random() * (maxFreq - minFreq + 1)) + minFreq;
    frequency.add(randomFreq);
  }

  return Array.from(frequency);
};

const Teacher = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user.user);
  const students = useSelector((state) => state.auth.students);
  const { classes, error } = useSelector((state) => state.class);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    className: "",  
    time: "",
    studentIds: [],
  });
  const [classFrequencies, setClassFrequencies] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isOffline, setIsOffline] = useState(false);
  const [studentPhone, setStudentPhone] = useState("");
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);

  useEffect(() => {
    if (user?._id) {
      dispatch(getTeacherClasses(user._id));
      dispatch(fetchAllStudents());
    }
  }, [dispatch, user?._id]);

  const handleCreateClass = (e) => {
    e.preventDefault();
    const classData = {
      teacherId: user._id,
      ...newClass,
      studentIds: newClass.studentIds,
    };
    dispatch(createClass(classData));
    setShowCreateForm(false);
    setNewClass({ className: "", time: "", studentIds: [] });
  };

  const handleStudentSelection = (studentId) => {
    setNewClass(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter(id => id !== studentId)
        : [...prev.studentIds, studentId]
    }));
  };

  const handleOfflineModeChange = (offline) => {
    setIsOffline(offline);
  };

  const handleGenerateFrequency = async (classId) => {
    setDisabledButtons(prev => ({ ...prev, [classId]: true }));
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [classId]: false }));
    }, 5000);

    const newFrequency = await generateRandomFrequency();
    
    if (isOffline) {
      setSelectedClassId(classId);
      setShowSMSForm(true);
      setClassFrequencies(prev => ({ ...prev, [classId]: newFrequency }));
      storeOfflineFrequency(newFrequency);
    } else {
      const result = await dispatch(generatefrequency({ 
        classId, 
        teacherId: user._id,
        frequency: newFrequency
      }));
      if (generatefrequency.fulfilled.match(result)) {
        setClassFrequencies(prev => ({ ...prev, [classId]: result.payload }));
        setShowFrequencyPopup(true);
      }
    }
  };

  const handleSendSMS = async () => {
    if (!studentPhone || !selectedClassId) return;

    const frequency = classFrequencies[selectedClassId];
    const success = await sendFrequencySMS(frequency, studentPhone);
    
    if (success) {
      setShowSMSForm(false);
      setStudentPhone("");
      setSelectedClassId(null);
    }
  };

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
    setShowClassDetails(true);
    
    // Initialize attendance data for all students in the class
    const initialAttendance = {};
    cls.studentList?.forEach(student => {
      initialAttendance[student._id] = "present"; // Default to present
    });
    setAttendanceData(initialAttendance);
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const togglePlaySound = () => {
    if (!audioContext) {
      // Create new audio context
      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      const frequency = classFrequencies[selectedClass._id][0];
      
      setAudioContext(newAudioContext);
      setIsPlaying(true);
      
      // Play sound with pattern: 3s on, 0.5s off, 3s on, 0.5s off, 3s on
      let intervalCount = 0;
      
      // Function to play one interval
      const playOneInterval = () => {
        // Create a new oscillator for each interval
        const newOscillator = newAudioContext.createOscillator();
        
        // Make the sound less harsh by adding a gain node and ramping volume
        const gainNode = newAudioContext.createGain();
        gainNode.gain.value = 0.2; // Lower volume to 20% of maximum
        
        // Connect oscillator to gain node and then to output
        newOscillator.type = 'sine';
        newOscillator.frequency.setValueAtTime(frequency, newAudioContext.currentTime);
        newOscillator.connect(gainNode);
        gainNode.connect(newAudioContext.destination);
        
        // Start playing
        newOscillator.start();
        setOscillator(newOscillator);
        
        // Play for 3 seconds then stop
        setTimeout(() => {
          newOscillator.stop();
          newOscillator.disconnect();
          
          // Increment the interval counter
          intervalCount++;
          
          // If we haven't played 3 times yet, schedule the next interval
          if (intervalCount < 3) {
            // Wait 0.5 seconds before playing the next interval
            setTimeout(() => {
              // Make sure audio context is still available
              if (newAudioContext && !newAudioContext.closed) {
                playOneInterval();
              }
            }, 500); // 0.5 second pause between intervals
          } else {
            // After all 3 intervals, reset the state
            setIsPlaying(false);
            setOscillator(null);
            
            // Close the audio context
            if (newAudioContext && !newAudioContext.closed) {
              newAudioContext.close();
              setAudioContext(null);
            }
          }
        }, 3000); // 3 seconds per play interval
      };
      
      // Start playing the first interval
      playOneInterval();
      
    } else {
      // Stop all playing sounds
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      
      if (audioContext) {
        audioContext.close();
      }
      setAudioContext(null);
      setOscillator(null);
      setIsPlaying(false);
    }
  };

  const closeFrequencyPopup = () => {
    if (isPlaying && oscillator) {
      oscillator.stop();
      oscillator.disconnect();
    }
    if (audioContext) {
      audioContext.close();
    }
    setAudioContext(null);
    setOscillator(null);
    setIsPlaying(false);
    setShowFrequencyPopup(false);
  };

  const saveAttendance = async () => {
    try {
      // Format the attendance data
      const attendancePayload = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId,
        status,
        classId: selectedClass._id,
        date: new Date().toISOString()
      }));

      // Make API call to save attendance
      const response = await fetch('/api/v1/attendance/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          attendanceRecords: attendancePayload,
          classId: selectedClass._id,
          recordedBy: user._id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      alert('Attendance saved successfully!');
      // Go back to class list
      setShowClassDetails(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance: ' + error.message);
    }
  };

  return (
    <div>
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <OfflineToggle onModeChange={handleOfflineModeChange} />
        </div>

        {!showClassDetails ? (
          // Classes List View
          <>
            {/* Create Class Button */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
              Create New Class
            </button>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {classes.map((cls) => (
                <div 
                  key={cls._id} 
                  className="border rounded-lg p-4 shadow hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleClassClick(cls)}
                >
                  <h3 className="font-bold text-lg">{cls.className}</h3>
                  <p className="text-gray-600">Time: {new Date(cls.time).toLocaleString()}</p>
                  <p className="text-gray-600">Students: {cls.studentList?.length || 0}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Class Details View
          <div className="animate-fadeIn">
            <div className="flex items-center mb-4">
              <button 
                onClick={() => setShowClassDetails(false)}
                className="mr-4 bg-gray-200 p-2 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-bold">{selectedClass.className}</h2>
            </div>

            <div className="mb-6 flex justify-between items-center">
              <div>
                <p>Class Time: {new Date(selectedClass.time).toLocaleString()}</p>
                <p>Total Students: {selectedClass.studentList?.length || 0}</p>
              </div>
              
              <button
                onClick={() => handleGenerateFrequency(selectedClass._id)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105"
                disabled={disabledButtons[selectedClass._id]}
              >
                Special
              </button>
            </div>

            {/* Students Attendance Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedClass.studentList?.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              attendanceData[student._id] === 'present' 
                                ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                                : 'bg-green-50 text-green-600 border border-green-200'
                            }`}
                            onClick={() => handleAttendanceChange(student._id, 'present')}
                          >
                            Present
                          </button>
                          <button
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              attendanceData[student._id] === 'absent' 
                                ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                                : 'bg-red-50 text-red-600 border border-red-200'
                            }`}
                            onClick={() => handleAttendanceChange(student._id, 'absent')}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAttendance}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg shadow"
              >
                Save Attendance
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Create Class Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all">
              {/* Modal Header */}
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-gray-800">Create New Class</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new class</p>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateClass} className="p-6 space-y-6">
                {/* Class Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Name
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter class name"
                      value={newClass.className}
                      onChange={(e) => setNewClass({ ...newClass, className: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Class Time Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Time
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newClass.time}
                    onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Student Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Students
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                    {students.map((student) => (
                      <div 
                        key={student._id} 
                        className="flex items-center p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          id={student._id}
                          checked={newClass.studentIds.includes(student._id)}
                          onChange={() => handleStudentSelection(student._id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                        />
                        <label htmlFor={student._id} className="ml-3 cursor-pointer flex-1">
                          <div className="text-sm font-medium text-gray-700">{student.fullName}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Selected: {newClass.studentIds.length} students
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SMS Form Modal */}
        {showSMSForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h2 className="text-xl font-semibold mb-4">Send Frequency via SMS</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Phone Number
                </label>
                <input
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSMSForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSMS}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Frequency Popup */}
        {showFrequencyPopup && selectedClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Frequency Sound</h2>
                <button
                  onClick={closeFrequencyPopup}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Active Frequency</h3>
                <div className="text-center">
                  <span className="text-3xl font-mono text-blue-600">
                    {classFrequencies[selectedClass._id]?.[0]} Hz
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={togglePlaySound}
                  className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg ${
                    isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  } text-white transition-colors`}
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              </div>

              <p className="mt-4 text-sm text-gray-500 text-center">
                {isPlaying 
                  ? "Sound is playing. Click to pause." 
                  : "Click to play the frequency sound."}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default Teacher;
