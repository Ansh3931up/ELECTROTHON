import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
// Icons for better visual cues
import { FiChevronLeft, FiEdit, FiUsers, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useTheme } from "../context/ThemeContext"; // Import theme context
import { 
  clearAttendanceError, 
  fetchClassDetails, 
  fetchOngoingAttendance,
  generatefrequency} from "../redux/slices/classSlice";
import { 
  endAttendance,
  getSocket, 
  initializeSocket, 
  initiateAttendance, 
  joinClassRoom, 
  leaveClassRoom,
  markAttendance
} from "../utils/socket";
// Import the hook but keep it commented until we fully migrate to it
// import useAttendanceSocket from "../utils/useAttendanceSocket";

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
  const { isDarkMode } = useTheme(); // Use theme context
  const { id } = useParams();
  console.log("classId", id);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Selectors
  const user = useSelector((state) => state.auth.user);
  const { 
    currentClass, 
    loading, 
    error, 
    attendanceSaving,
    fetchingOngoingAttendance
  } = useSelector((state) => state.class);
  console.log("currentClass", currentClass);
  
  // State for attendance marking session
  const [isSelectingType, setIsSelectingType] = useState(false);
  const [currentSessionType, setCurrentSessionType] = useState(null);
  const [isMarkingMode, setIsMarkingMode] = useState(false);
  const [currentDailyAttendance, setCurrentDailyAttendance] = useState({});
  const [sortedStudentList, setSortedStudentList] = useState([]);
  
  // State to track real-time attendance
  const [realTimeAttendance, setRealTimeAttendance] = useState({});
  const [connectedStudents, setConnectedStudents] = useState(new Set());

  // Other state remains the same
  const [classFrequencies, setClassFrequencies] = useState({});
  const [disabledButtons, setDisabledButtons] = useState({});
  const [isOffline] = useState(false);
  const [studentPhone, setStudentPhone] = useState("");
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);

  const isClassTeacher = currentClass?.teacherId?._id === user?.user?._id;
  
  // Check if there's an active attendance session by looking at today's records
  const getTodayAttendanceInfo = () => {
    if (!currentClass?.attendanceRecords?.length) return { hasActiveSession: false, activeSessionType: null };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecord = currentClass.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    
    if (!todayRecord) return { hasActiveSession: false, activeSessionType: null };
    
    // Check if lecture or lab is active
    const isLectureActive = todayRecord.lecture && 
      todayRecord.lecture.active === 'active';
    
    const isLabActive = todayRecord.lab && 
      todayRecord.lab.active === 'active';
    
    const hasActiveSession = isLectureActive || isLabActive;
    const activeSessionType = isLectureActive ? 'lecture' : (isLabActive ? 'lab' : null);
    
    return { hasActiveSession, activeSessionType };
  };
  
  const { hasActiveSession } = getTodayAttendanceInfo();

  // Initialize the attendance socket hook (for future use if needed)
  // const {
  //   connected,
  //   attendanceActive,
  //   activeSessionType: socketActiveSessionType,
  //   attendanceUpdates,
  //   startAttendance: socketStartAttendance,
  //   endAttendance: socketEndAttendance,
  //   markAttendance: socketMarkAttendance,
  // } = useAttendanceSocket(id, user?.user?._id, user?.user?.role);

  useEffect(() => {
    // Initialize socket connection
    const socket = initializeSocket(user);

    if (id) {
      dispatch(fetchClassDetails(id));
      // Join the class room for real-time updates
      if (user?.user?._id) {
        joinClassRoom(id, user.user._id);
      }
    }

    // Reset state
    setIsMarkingMode(false);
    setIsSelectingType(false);
    setCurrentSessionType(null);
    setCurrentDailyAttendance({});
    dispatch(clearAttendanceError());

    // Set up socket event listeners
    if (socket) {
      // Listen for attendance started events
      socket.on('attendanceStarted', (data) => {
        console.log('Attendance started:', data);
        if (data.classId === id) {
          toast.success(`${data.sessionType} attendance session started!`);
          setCurrentSessionType(data.sessionType);
          setIsMarkingMode(true);
          setIsSelectingType(false);
          
          // Initialize empty attendance for all students
          if (currentClass?.studentList) {
            const initialAttendance = {};
            currentClass.studentList.forEach(student => {
              initialAttendance[student._id] = "absent";
            });
            setCurrentDailyAttendance(initialAttendance);
            sortStudentList(currentClass.studentList, initialAttendance);
          }
          
          // Refresh class details
          dispatch(fetchClassDetails(id));
        }
      });
      
      // Listen for attendance update events
      socket.on('attendanceUpdate', (data) => {
        console.log('Attendance update:', data);
        if (data.classId === id) {
          // Update real-time attendance state
          setRealTimeAttendance(prev => ({
            ...prev,
            [data.studentId]: {
              status: data.status,
              timestamp: data.timestamp,
              studentName: data.studentName
            }
          }));
          
          // If we're in marking mode, also update the current attendance
          if (isMarkingMode && data.sessionType === currentSessionType) {
            setCurrentDailyAttendance(prev => ({
              ...prev,
              [data.studentId]: data.status
            }));
            
            // Show a toast notification
            toast.success(`${data.studentName} marked as ${data.status}`);
          }
        }
      });
      
      // Listen for attendance ended events
      socket.on('attendanceEnded', (data) => {
        console.log('Attendance ended:', data);
        if (data.classId === id) {
          toast.success(`${data.sessionType} attendance session ended!`);
          
          // If we were in the same session type, reset UI
          if (currentSessionType === data.sessionType) {
            setIsMarkingMode(false);
            setIsSelectingType(false);
            setCurrentSessionType(null);
          }
          
          // Refresh class details
          dispatch(fetchClassDetails(id));
        }
      });
      
      // Listen for user joined/left events
      socket.on('userJoined', (data) => {
        console.log('User joined:', data);
        if (data.userId) {
          setConnectedStudents(prev => new Set([...prev, data.userId]));
        }
      });
      
      socket.on('userLeft', (data) => {
        console.log('User left:', data);
        if (data.userId) {
          setConnectedStudents(prev => {
            const newSet = new Set([...prev]);
            newSet.delete(data.userId);
            return newSet;
          });
        }
      });
      
      // Listen for error events
      socket.on('attendance:error', (data) => {
        console.error('Attendance error:', data);
        toast.error(data.message || 'Attendance error occurred');
      });
    }

    // Clean up function
    return () => {
      if (id && user?.user?._id) {
        leaveClassRoom(id, user.user._id);
      }
      
      // Remove socket event listeners
      const socket = getSocket();
      if (socket) {
        socket.off('attendanceStarted');
        socket.off('attendanceUpdate');
        socket.off('attendanceEnded');
        socket.off('userJoined');
        socket.off('userLeft');
        socket.off('attendance:error');
      }
    };
  }, [dispatch, id, user?.user?._id]);

  // Update the attendance UI when we receive real-time updates
  useEffect(() => {
    if (isMarkingMode && Object.keys(realTimeAttendance).length > 0 && currentClass?.studentList) {
      // Merge real-time attendance into current attendance
      const updatedAttendance = { ...currentDailyAttendance };
      
      Object.entries(realTimeAttendance).forEach(([studentId, data]) => {
        if (data.status) {
          updatedAttendance[studentId] = data.status;
        }
      });
      
      // Only update if there are changes
      if (JSON.stringify(updatedAttendance) !== JSON.stringify(currentDailyAttendance)) {
        setCurrentDailyAttendance(updatedAttendance);
        sortStudentList(currentClass.studentList, updatedAttendance);
      }
    }
  }, [realTimeAttendance, isMarkingMode, currentClass?.studentList]);

  // When currentClass is updated, check if there's an active session and update UI accordingly
  useEffect(() => {
    if (!currentClass) return;

    console.log("Current class updated:", currentClass);

    const { hasActiveSession, activeSessionType } = getTodayAttendanceInfo();

    // First check if there's an active session 
    if (hasActiveSession) {
      console.log("Active session found:", activeSessionType);
      setCurrentSessionType(activeSessionType);
      setIsMarkingMode(true);
      setIsSelectingType(false);
      
      // Initialize attendance state if we're in an active session
      if (currentClass.studentList) {
      const initialAttendance = {};
      currentClass.studentList.forEach(student => {
          // Check if this student already has attendance in realTimeAttendance
          initialAttendance[student._id] = realTimeAttendance[student._id]?.status || "absent";
      });
      setCurrentDailyAttendance(initialAttendance);
        sortStudentList(currentClass.studentList, initialAttendance);
      }
      return;
    }
    
    // Next, check if there's a record for today that's marked as active
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = currentClass.attendanceRecords?.find(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === today;
    });
    
    if (todayRecord) {
      console.log("Found today's attendance record:", todayRecord);
      
      // Check for the new data structure with lecture/lab as objects containing records array
      const hasLectureSession = todayRecord.lecture && 
        ((todayRecord.lecture.records && todayRecord.lecture.records.length > 0) || 
         (Array.isArray(todayRecord.lecture) && todayRecord.lecture.length > 0));
      
      const hasLabSession = todayRecord.lab && 
        ((todayRecord.lab.records && todayRecord.lab.records.length > 0) || 
         (Array.isArray(todayRecord.lab) && todayRecord.lab.length > 0));
      
      // Check for active sessions
      const isLectureActive = todayRecord.lecture && 
        todayRecord.lecture.active === 'active';
      
      const isLabActive = todayRecord.lab && 
        todayRecord.lab.active === 'active';
      
      console.log("Session status - Lecture:", {hasRecords: hasLectureSession, isActive: isLectureActive});
      console.log("Session status - Lab:", {hasRecords: hasLabSession, isActive: isLabActive});
      
      if (isLectureActive || isLabActive) {
        // We have an active session, show the attendance UI
        const activeType = isLectureActive ? 'lecture' : 'lab';
        console.log(`Active ${activeType} session found, showing attendance UI`);
        
        setCurrentSessionType(activeType);
        setIsMarkingMode(true);
        setIsSelectingType(false);
        
        // Initialize attendance for the active session
        if (currentClass.studentList) {
          const initialAttendance = {};
          currentClass.studentList.forEach(student => {
            initialAttendance[student._id] = "absent";
          });
          
          // Try to populate with existing records if any
          const sessionRecords = todayRecord[activeType].records || todayRecord[activeType] || [];
          sessionRecords.forEach(record => {
            if (record.studentId) {
              const studentId = typeof record.studentId === 'object' ? record.studentId._id : record.studentId;
              initialAttendance[studentId] = record.status;
            }
          });
          
          setCurrentDailyAttendance(initialAttendance);
          sortStudentList(currentClass.studentList, initialAttendance);
        }
      } else if (!hasLectureSession && !hasLabSession) {
        // No sessions recorded yet, but we have a record for today - show type selection
        console.log("No sessions recorded yet, showing type selection");
        setIsSelectingType(true);
      setIsMarkingMode(false);
      setCurrentSessionType(null);
      } else if (hasLectureSession && !hasLabSession) {
        // Lecture has been recorded but lab hasn't, offer to do lab
        console.log("Lecture recorded but lab not recorded, offering lab attendance");
        setCurrentSessionType('lab');
        setIsMarkingMode(false);
        setIsSelectingType(true);
      } else if (!hasLectureSession && hasLabSession) {
        // Lab has been recorded but lecture hasn't, offer to do lecture
        console.log("Lab recorded but lecture not recorded, offering lecture attendance");
        setCurrentSessionType('lecture');
        setIsMarkingMode(false);
        setIsSelectingType(true);
      } else {
        // Both have been recorded, show initial state
        console.log("Both lecture and lab have been recorded, showing initial state");
        setIsMarkingMode(false);
        setIsSelectingType(false);
    setCurrentSessionType(null);
    }
    } else {
      // No record for today, show initial state
      console.log("No attendance record found for today, showing initial state");
      setIsMarkingMode(false);
      setIsSelectingType(false);
      setCurrentSessionType(null);
    }
  }, [currentClass, realTimeAttendance]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for user joined event
    socket.on('userJoined', ({ userId, count }) => {
      console.log(`User ${userId} joined, ${count} users in room`);
      setConnectedStudents(prev => new Set(prev).add(userId));
    });

    // Listen for user left event
    socket.on('userLeft', ({ userId, count }) => {
      console.log(`User ${userId} left, ${count} users in room`);
      setConnectedStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Listen for frequency notifications (new event)
    socket.on('frequency:notification', (data) => {
      console.log('Frequency notification received:', data);
      if (data.classId === id) {
        // If student, show a prominent notification
        if (user?.user?.role === 'student') {
          // Update UI
          toast.success('New frequency generated by teacher!', {
            duration: 5000, // Show longer
            icon: '🔊'
          });
          
          // Store the frequency data for the UI
          if (data.frequency) {
            setClassFrequencies(prev => ({
              ...prev,
              [data.classId]: Array.isArray(data.frequency) ? data.frequency : [data.frequency]
            }));
            
            // Show the frequency popup for students
            setShowFrequencyPopup(true);
          }
        }
        
        // For teachers, just log it
        if (user?.user?.role === 'teacher') {
          console.log('Confirmation that frequency was broadcast to students');
        }
      }
    });

    // Listen for attendance started event
    socket.on('attendanceStarted', ({ classId, sessionType, frequency }) => {
      console.log(`Attendance started for class ${classId}, session: ${sessionType}, frequency: ${frequency}`);
      
      // If this is for the current class, refresh the class details to get the active session
      if (classId === id) {
        dispatch(fetchClassDetails(id));
        
        // If there's a frequency included, also handle it like a frequency notification
        if (frequency && user?.user?.role === 'student') {
          // Store the frequency data for the UI
          setClassFrequencies(prev => ({
            ...prev,
            [classId]: Array.isArray(frequency) ? frequency : [frequency]
          }));
          
          // Show the frequency popup for students
          setShowFrequencyPopup(true);
          
          // Show notification
          toast.success('New frequency for attendance!', {
            duration: 5000,
            icon: '🔊'
          });
        }
      }
    });

    // Listen for attendance updates
    socket.on('attendanceUpdate', ({ classId, studentId, studentName, status, sessionType, timestamp }) => {
      console.log(`Student ${studentId} (${studentName}) marked ${status} at ${timestamp} for class ${classId} - session: ${sessionType}`);
      
      // Make sure this update is for the current class
      if (classId !== id) {
        console.log(`Ignoring attendance update for different class: ${classId} (current: ${id})`);
        return;
      }
      
      // Update real-time attendance
      setRealTimeAttendance(prev => ({
        ...prev,
        [studentId]: { status, timestamp, studentName, sessionType }
      }));

      // If we're in marking mode and the session types match, update the daily attendance
      if (isMarkingMode && currentSessionType === sessionType) {
        // Important: Always update currentDailyAttendance when a student marks themselves present
        setCurrentDailyAttendance(prev => ({
          ...prev,
          [studentId]: status
        }));
        
        // Re-sort the list with the updated data
        if (currentClass?.studentList) {
          sortStudentList(currentClass.studentList, {
            ...currentDailyAttendance,
            [studentId]: status
          });
        }
      }
      
      // Only show toast notifications based on user role and action source
      if (user?.user?._id === studentId) {
        // This is the student who marked their own attendance
        toast.success(`Your attendance has been marked as ${status}!`, {
          duration: 5000,
          icon: '✅',
          position: 'top-center'
        });
      } else if (isClassTeacher) {
        // Teacher sees updates for all students
        toast.success(`${studentName} marked as ${status}`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      // Refresh class details after a short delay
      if (isClassTeacher || user?.user?._id === studentId) {
        setTimeout(() => {
          dispatch(fetchClassDetails(id));
        }, 1000);
      }
    });

    // Listen for session ended event
    socket.on('attendanceEnded', ({ classId, sessionType }) => {
      console.log(`Attendance session for ${sessionType} ended in class ${classId}`);
      
      // If this is for the current class, refresh the class details to get the updated session status
      if (classId === id) {
        dispatch(fetchClassDetails(id));
      }
    });

    // Clean up listeners when component unmounts
    return () => {
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('frequency:notification');
      socket.off('attendanceStarted');
      socket.off('attendanceUpdate');
      socket.off('attendanceEnded');
    };
  }, [isMarkingMode, currentDailyAttendance, currentSessionType, currentClass?.studentList, id, dispatch, user?.user?.role]);

  // Step 1: Show session type selection
  const handleInitiateAttendance = () => {
    setIsSelectingType(true);
    setIsMarkingMode(false);
    setCurrentSessionType(null);
  };

  // Step 2: Select session type and start the attendance session
  const handleSelectSessionType = async(type) => {
    if (!currentClass?._id) {
      toast.error("Class information not loaded. Please refresh the page.");
      return;
    }
    
    // Check if this session type is already completed
    if (isSessionCompleted(type)) {
      toast.error(`${type} attendance for today has already been completed and cannot be modified.`);
      return;
    }
    
    console.log(`Session type selected: ${type}`);
    setCurrentSessionType(type);
    
    // Show a loading toast
    const loadingToastId = toast.loading("Starting attendance session...");
    
    // Start new attendance session using WebSockets
      await initiateAttendance(
      currentClass._id, 
      currentClass.frequency, 
      user.user._id, 
      type
    );
    
    toast.dismiss(loadingToastId);
    
    // Initialize empty attendance for all students
    if (currentClass.studentList) {
      const initialAttendance = {};
      currentClass.studentList.forEach(student => {
        initialAttendance[student._id] = "absent";
      });
      setCurrentDailyAttendance(initialAttendance);
      sortStudentList(currentClass.studentList, initialAttendance);
    }
    
    // Transition UI to marking mode
    setIsMarkingMode(true);
    setIsSelectingType(false);
  };

  // Handle manual attendance state updates and emit socket event
  const handleAttendanceChange = (studentId, status) => {
    if (!currentClass?._id || !currentSessionType) return;
    
    // Find student name for the notification
    const student = currentClass.studentList.find(s => s._id === studentId);
    const studentName = student ? student.fullName : 'Unknown Student';
    
    // Update local state for immediate UI feedback
    const updatedAttendance = {
      ...currentDailyAttendance,
      [studentId]: status
    };
    setCurrentDailyAttendance(updatedAttendance);
    
    // Re-sort the list based on the new attendance state
    sortStudentList(currentClass.studentList, updatedAttendance);
    
    // Send the attendance update via socket
    // Note: We don't show a toast here as it will come back through the socket event
    markAttendance(
      currentClass._id,
      studentId,
      studentName,
      status,
      currentSessionType
    );
  };

  // Handle cancel attendance process
  const handleCancelAttendanceProcess = () => {
    if (!id) return;
    
    // Reset states
    setCurrentSessionType(null);
    setIsSelectingType(false);
    setIsMarkingMode(false);
    setCurrentDailyAttendance({});
    
    // Use socket function to end the attendance session
    if (currentSessionType) {
      endAttendance(id, user.user._id, currentSessionType);
    }
  };

  // Student sorting remains the same
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

  // Updated to consider active session
  const handleGenerateFrequency = async () => {
    if (!currentClass?._id) return;
    const currentClassId = currentClass._id;

    // Prevent multiple frequency generations in quick succession
    setDisabledButtons(prev => ({ ...prev, [currentClassId]: true }));
    setTimeout(() => {
      setDisabledButtons(prev => ({ ...prev, [currentClassId]: false }));
    }, 5000);

    try {
      // Generate a new random frequency
      const newFrequency = await generateRandomFrequency();
      console.log("Generated frequency:", newFrequency);
    
      if (isOffline) {
        setShowSMSForm(true);
        setClassFrequencies(prev => ({ ...prev, [currentClassId]: newFrequency }));
        toast.warning('Offline mode: Frequency stored locally');
      } else {
        // Show loading toast
        const loadingToastId = toast.loading("Generating frequency...");
        
        // Save the frequency to the backend
        const result = await dispatch(generatefrequency({ 
          classId: currentClassId, 
          teacherId: user.user._id,
          frequency: newFrequency,
          autoActivate: true // Flag to activate the frequency immediately
        }));
        
        toast.dismiss(loadingToastId);
          
        if (generatefrequency.fulfilled.match(result)) {
          // Update local state with the saved frequency
          setClassFrequencies(prev => ({ ...prev, [currentClassId]: newFrequency }));
          setShowFrequencyPopup(true);
            
          // Explicitly make sure all students are notified
          const socket = getSocket();
          if (socket) {
            // Log the room status
            console.log("Emitting frequency notification to class:", currentClassId);
            
            // Emit socket event to notify students - use current session type
            const sessionTypeToUse = currentSessionType || 'lecture'; // Default to lecture if no type set
            
            // Send with more explicit details
            initiateAttendance(
              currentClassId, 
              newFrequency, // Make sure frequency is included
              user.user._id, 
              sessionTypeToUse
            );
            
            // For more reliable delivery, also emit a direct event with the frequency
            socket.emit('frequency:generated', {
              classId: currentClassId,
              frequency: newFrequency,
              timestamp: new Date().toISOString(),
              teacherId: user.user._id,
              message: "New frequency generated"
            });
          }
            
          // Show success message
          toast.success(`Frequency generated and sent to ${currentClass?.studentList?.length || 0} students.`);
        } else {
          toast.error("Failed to generate frequency: " + (result.payload || "Unknown error"));
        }
      }
    } catch (error) {
      console.error("Error generating frequency:", error);
      toast.error("Failed to generate frequency. Please try again.");
    }
  };

  const handleSendSMS = async () => {
    if (!studentPhone || !currentClass?._id) return;
    
    // Since SMS functionality is not implemented, we'll just close the form and show a message
    toast.error('SMS functionality is not implemented yet');
    setShowSMSForm(false);
    setStudentPhone("");
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
               if (newAudioContext && newAudioContext.state !== "closed") {
                 playOneInterval();
               }
             }, 500); 
           } else {
             setIsPlaying(false);
             setOscillator(null);
             if (newAudioContext && newAudioContext.state !== "closed") {
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
       if (audioContext && audioContext.state !== "closed") {
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
    if (audioContext && audioContext.state !== "closed") {
      if (audioContext.close) audioContext.close();
    }
    setAudioContext(null);
    setOscillator(null);
    setIsPlaying(false);
    setShowFrequencyPopup(false);
  };

  // Add this function to check if a session is completed
  const isSessionCompleted = (sessionType) => {
    if (!currentClass?.attendanceRecords) return false;
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const todayRecord = currentClass.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setUTCHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    
    return todayRecord && todayRecord[sessionType] && todayRecord[sessionType].active === 'completed';
  };

  // Modify the saveAttendance function
  const saveAttendance = async () => {
    if (!currentClass?._id || !currentSessionType || Object.keys(currentDailyAttendance).length === 0 || attendanceSaving) return;
    const currentClassId = currentClass._id;
    
    try {
      // Show loading toast
      const loadingToastId = toast.loading("Saving attendance...");
      
      // End the attendance session first
      endAttendance(
        currentClassId,
        user.user._id,
        currentSessionType
      );
      
      toast.dismiss(loadingToastId);
      toast.success('Attendance saved successfully!');
      
      // Reset UI state
      setIsMarkingMode(false);
      setIsSelectingType(false);
      setCurrentSessionType(null);
      setCurrentDailyAttendance({});
      
      // Refresh class details
      dispatch(fetchClassDetails(id));
      
    } catch (err) {
      console.error("Error saving attendance:", err);
      toast.error(`Failed to save attendance: ${err.message || 'Unknown error'}`);
    }
  };

  // Add this helper function to determine if we have an active record for today
  const hasTodayActiveRecord = () => {
    if (!currentClass?.attendanceRecords) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return currentClass.attendanceRecords.some(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === today && 
        (record.lecture?.active === 'active' || record.lab?.active === 'active');
    });
  };

  // Render the student attendance status with online indicator
  const renderStudentAttendanceStatus = (student, index) => {
    const isConnected = connectedStudents.has(student._id);
    const hasMarkedAttendance = realTimeAttendance[student._id]?.status === 'present';
    
    // Determine final status - giving priority to real-time updates
    const studentStatus = realTimeAttendance[student._id]?.status || currentDailyAttendance[student._id] || 'absent';
    
    // Check if the current session is completed
    const isSessionComplete = isSessionCompleted(currentSessionType);
    
    return (
      <div key={student._id} className={`flex items-center justify-between px-3 py-2.5 gap-3 ${
        isDarkMode 
          ? index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60' 
          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
      }`}>
        <div className="flex-grow min-w-0">
          <div className="flex items-center">
            <p className={`text-base font-medium truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {student.fullName}
            </p>
            
            {/* Online indicator */}
            {isConnected && (
              <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
            )}
            
            {/* Real-time attendance indicator - only show for students */}
            {hasMarkedAttendance && !isClassTeacher && (
              <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
              }`}>
                Marked
              </span>
            )}
          </div>
          <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <button
            type="button"
            className={`px-3 h-8 rounded-md text-xs font-medium border transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 ${
              studentStatus === 'present'
                ? 'bg-green-600 text-white border-green-600 focus:ring-green-500 shadow-sm'
                : isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-green-500'
            } ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
            onClick={() => handleAttendanceChange(student._id, 'present')}
            // Disable if session is complete or if student has marked themselves present (for non-teachers)
            disabled={isSessionComplete || (!isClassTeacher && hasMarkedAttendance)}
          >
            Present
          </button>
          <button
            type="button"
            className={`px-3 h-8 rounded-md text-xs font-medium border transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 ${
              studentStatus === 'absent'
                ? 'bg-red-600 text-white border-red-600 focus:ring-red-500 shadow-sm'
                : isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-red-500'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-red-500'
            } ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
            onClick={() => handleAttendanceChange(student._id, 'absent')}
            // Disable if session is complete or if student has marked themselves present (for non-teachers)
            disabled={isSessionComplete || (!isClassTeacher && hasMarkedAttendance)}
          >
            Absent
          </button>
        </div>
      </div>
    );
  };

  // Add a function to handle frequency-based attendance marking
  const handleMarkAttendanceWithFrequency = async () => {
    if (!currentClass?._id || !user?.user?._id || isPlaying) return;
    
    // Get the current frequency
    const frequency = classFrequencies[currentClass._id]?.[0];
    if (!frequency) {
      toast.error("No active frequency found");
      return;
    }
    
    try {
      // Show a loading toast
      const loadingToastId = toast.loading("Marking your attendance...");
      
      // Find the active session type
      const sessionTypeToUse = currentClass.activeAttendanceSession?.sessionType || 'lecture';
      
      // Use the markAttendance function to record attendance
      const success = markAttendance(
        currentClass._id,
        user.user._id,
        user.user.fullName || user.user.name || 'Student',
        'present',
        sessionTypeToUse
      );
      
      toast.dismiss(loadingToastId);
      
      if (success) {
        // Show success message
        toast.success("Your attendance has been marked successfully!", {
          duration: 5000,
          icon: '✅'
        });
        
        // Update local state immediately to show the change
        setRealTimeAttendance(prev => ({
          ...prev,
          [user.user._id]: {
            status: 'present',
            timestamp: new Date().toISOString(),
            studentName: user.user.fullName || user.user.name || 'Student',
            sessionType: sessionTypeToUse
          }
        }));
        
        // Close the frequency popup
        setShowFrequencyPopup(false);
        
        // Refresh class details to get updated attendance data
        setTimeout(() => {
          dispatch(fetchClassDetails(id));
        }, 1000);
      } else {
        toast.error("Failed to mark attendance. Please try again.");
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error(`Error: ${error.message || "Failed to mark attendance"}`);
    }
  };

  // Function to fetch ongoing attendance data
  const fetchOngoingAttendanceData = (sessionType = null) => {
    if (!id) return;
    
    // Show loading toast
    const loadingToastId = toast.loading("Fetching attendance data...");
    
    dispatch(fetchOngoingAttendance({ classId: id, sessionType }))
      .then((result) => {
        toast.dismiss(loadingToastId);
        
        if (fetchOngoingAttendance.fulfilled.match(result)) {
          console.log("Ongoing attendance from client:", result);
          const attendanceData = result.payload;
          
          if (attendanceData.records && attendanceData.records.length > 0) {
            // Format attendance data for the UI
            const formattedAttendance = {};
            attendanceData.records.forEach(record => {
              formattedAttendance[record.studentId] = record.status;
            });
            
            setCurrentDailyAttendance(formattedAttendance);
            
            // --- Always stay in marking mode if records exist ---
            setIsMarkingMode(true);
            setIsSelectingType(false);
            
            // Sort student list
            if (currentClass?.studentList) {
              sortStudentList(currentClass.studentList, formattedAttendance);
            }
            
            toast.success(`${attendanceData.sessionType} attendance loaded`);
          } else {
            // No records, fallback to initial state
            setIsMarkingMode(false);
            setIsSelectingType(false);
            setCurrentSessionType(null);
            setCurrentDailyAttendance({});
            toast.error(`No attendance records found for ${attendanceData.sessionType} session`);
          }
        } else {
          toast.error("Failed to fetch attendance data");
        }
      })
      .catch(err => {
        toast.dismiss(loadingToastId);
        toast.error(`Error: ${err.message || "Failed to fetch attendance"}`);
      });
  };

  // Add this to the useEffect that handles attendance checks
  useEffect(() => {
    // When currentClass is updated, check if there's an active session
    if (!currentClass) return;
    
    // If there's an active attendance session, fetch the latest data
    if (currentClass.activeAttendanceSession?.isActive) {
      const sessionType = currentClass.activeAttendanceSession.sessionType;
      fetchOngoingAttendanceData(sessionType);
    }
  }, [currentClass]);

  // Optional: Add a new button to refresh attendance data
  const renderAttendanceRefreshButton = () => {
    if (!isMarkingMode || !currentSessionType) return null;
    
    return (
      <button
        type="button"
        onClick={() => fetchOngoingAttendanceData(currentSessionType)}
        className={`text-xs font-medium py-1 px-3 rounded transition-colors duration-150 focus:outline-none mr-2 ${
          isDarkMode 
            ? 'bg-blue-800/60 text-blue-200 hover:bg-blue-700/70' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
        disabled={fetchingOngoingAttendance}
      >
        {fetchingOngoingAttendance ? 'Refreshing...' : 'Refresh Data'}
      </button>
    );
  };

  // --- Render Logic ---
  if (loading) return <div className={`flex justify-center items-center h-screen ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}><p>Loading...</p></div>;
  if (error) return <div className={`p-6 text-center ${isDarkMode ? 'text-red-400 bg-red-900/50 border border-red-700' : 'text-red-600 bg-red-100 border border-red-300'} rounded-lg max-w-md mx-auto mt-10`}>Error: {error}</div>;
  if (!currentClass) return <div className={`p-6 text-center ${isDarkMode ? 'text-gray-500 bg-gray-800' : 'text-gray-500 bg-gray-100'}`}>Class not found.</div>;

  return (
    <div className={`min-h-screen pb-24 pt-2 transition-colors duration-300 bg-transparent`}>
      <div className="p-2 sm:p-4 max-w-full mx-auto">

        {/* --- Condensed Header and Info Section --- */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className={`mr-2 p-1.5 rounded-full transition-colors duration-150 ${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
              aria-label="Go back"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{currentClass.className}</h1>
              <div className={`flex items-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <FiUsers className="w-3.5 h-3.5 mr-1" />
                <span>Students: {currentClass?.studentList?.length || 0}</span>
              </div>
            </div>
          </div>
          {isClassTeacher && (
            <Link
              to={`/edit-class/${id}`}
              className={`flex items-center gap-1 px-2.5 py-1 border text-xs font-medium rounded-md shadow-sm hover:bg-opacity-80 transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title="Edit Class Details"
            >
              <FiEdit className="w-3.5 h-3.5"/>
              Edit
            </Link>
          )}
        </div>

        {/* --- Attendance Section Card --- */}
        <div className={`rounded-lg shadow-md border overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* State 1: Initial View - Show "Start" button */}
          {!isSelectingType && !isMarkingMode && !hasActiveSession && (
            <div className="p-6 text-center">
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                {hasTodayActiveRecord() 
                  ? "Continue marking today's attendance" 
                  : "Ready to mark attendance?"}
              </h2>
                <button
                onClick={handleInitiateAttendance}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow hover:shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                >
                {hasTodayActiveRecord() 
                  ? "Continue Attendance" 
                  : "Start Today's Attendance"}
                </button>
            </div>
          )}

          {/* State 2: Selecting Type (Condensed UI) */}
          {isSelectingType && !isMarkingMode && (
            <div className="p-4 sm:p-6">
                <h2 className={`text-base font-semibold mb-4 text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Select Session Type</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-3 mb-4">
                    <button
                        onClick={() => handleSelectSessionType('lecture')}
                        className={`flex-1 font-medium py-2.5 px-5 rounded-lg transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-blue-800/60 text-blue-200 hover:bg-blue-700/70' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                    >
                        Lecture
                    </button>
                    <button
                        onClick={() => handleSelectSessionType('lab')}
                        className={`flex-1 font-medium py-2.5 px-5 rounded-lg transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 ${
                          isDarkMode 
                            ? 'bg-purple-800/60 text-purple-200 hover:bg-purple-700/70' 
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                    >
                        Lab
                    </button>
                </div>
                <div className="text-center">
                     <button
                        type="button"
                        onClick={handleCancelAttendanceProcess}
                        className={`text-sm font-medium ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
          )}

          {/* State 3: Marking Mode (Streamlined, no title header) */}
          {isMarkingMode && (
            <div>
              {/* Minimal Header - Only shows session type and date */}
              <div className={`px-3 py-2 border-b ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex justify-between items-center">
                  <p className={`text-sm font-medium capitalize ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {currentSessionType} - {new Date().toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    {renderAttendanceRefreshButton()}
                  <button
                    onClick={handleGenerateFrequency}
                    className={`text-xs font-medium py-1 px-3 rounded transition-colors duration-150 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-purple-800/60 text-purple-200 hover:bg-purple-700/70' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                    disabled={disabledButtons[currentClass._id]}
                  >
                    Special Frequency
                  </button>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics - Even more compact */}
              <div className={`px-3 py-2 border-b ${
                isDarkMode 
                  ? 'bg-gray-700/30 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      <span className="font-medium">{Object.values(currentDailyAttendance).filter(status => status === 'present').length}</span> Present
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      <span className="font-medium">{Object.values(currentDailyAttendance).filter(status => status === 'absent').length}</span> Absent
                    </div>
                  </div>
                  
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ 
                        width: `${currentClass.studentList?.length ? 
                          Math.round((Object.values(currentDailyAttendance).filter(status => status === 'present').length / 
                          currentClass.studentList.length) * 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Student List - Scrollable section with fixed height */}
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} overflow-y-auto h-[60vh]`}>
                {sortedStudentList.length > 0 ? (
                  sortedStudentList.map((student, index) => renderStudentAttendanceStatus(student, index))
                ) : (
                  <p className={`text-center py-6 px-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No students enrolled in this class.</p>
                )}
              </div>

              {/* Action Buttons Footer - More compact */}
              {currentClass.studentList?.length > 0 && (
                <div className={`px-3 py-3 border-t grid grid-cols-2 gap-2 ${
                  isDarkMode 
                    ? 'bg-gray-700/50 border-gray-700' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <button
                    type="button"
                    onClick={handleCancelAttendanceProcess}
                    className={`w-full py-2.5 text-sm font-medium border rounded shadow-sm transition-colors duration-150 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                    disabled={attendanceSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveAttendance}
                    className={`w-full font-medium py-2.5 rounded shadow-sm hover:shadow transition-all duration-150 focus:outline-none text-sm bg-indigo-600 hover:bg-indigo-700 text-white`}
                    disabled={attendanceSaving}
                  >
                    {attendanceSaving ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Modals --- */}
        {/* SMS Form Modal (Refined Look) */}
        {showSMSForm && (
           <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className={`rounded-lg shadow-xl w-full max-w-sm border ${
               isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
             }`}>
                <div className={`flex justify-between items-center p-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Send Frequency via SMS</h2>
                  <button onClick={() => setShowSMSForm(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800'}`}><FiX size={20}/></button>
                </div>
               <div className="p-5">
                 <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Student Phone Number</label>
                 <input 
                   type="tel" 
                   value={studentPhone} 
                   onChange={(e) => setStudentPhone(e.target.value)} 
                   placeholder="Enter phone number" 
                   className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                     isDarkMode 
                       ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                       : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                   }`}
                 />
               </div>
               <div className={`flex justify-end space-x-3 p-4 border-t rounded-b-lg ${
                 isDarkMode 
                   ? 'bg-gray-700/50 border-gray-700' 
                   : 'bg-gray-100/50 border-gray-200'
               }`}>
                 <button 
                   onClick={() => setShowSMSForm(false)} 
                   className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                     isDarkMode 
                       ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500' 
                       : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                   }`}
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSendSMS} 
                   className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                 >
                   Send SMS
                 </button>
               </div>
             </div>
           </div>
         )}

        {/* Frequency Popup Modal (Refined Look) */}
         {showFrequencyPopup && currentClass && (
           <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className={`rounded-lg shadow-xl w-full max-w-sm text-center border ${
               isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
             }`}>
                <div className={`flex justify-between items-center p-4 border-b ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Special Attendance</h2>
                  <button onClick={closeFrequencyPopup} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800'}`}><FiX size={20}/></button>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <button
                      onClick={togglePlaySound}
                      className={`inline-flex items-center justify-center px-6 py-3 rounded-md shadow-lg transition-colors duration-150 text-lg font-medium ${
                        isDarkMode 
                          ? isPlaying 
                            ? 'bg-red-700 text-white hover:bg-red-600' 
                            : 'bg-blue-700 text-white hover:bg-blue-600' 
                          : isPlaying 
                            ? 'bg-red-600 text-white hover:bg-red-500' 
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {isPlaying ? 'Stop Sound' : 'Play Sound'}
                    </button>
                  </div>

                  {/* Only show Attend button for students */}
                  {!isClassTeacher && (
                    <button
                      onClick={handleMarkAttendanceWithFrequency}
                      className={`w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow transition-colors duration-150 ${
                        isPlaying ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={!classFrequencies[currentClass._id]?.[0] || isPlaying}
                    >
                      Mark Me Present
                    </button>
                  )}
                </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default ClassDetails; 