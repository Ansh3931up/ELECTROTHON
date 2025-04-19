import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
// Icons for better visual cues
import { FiBookOpen, FiChevronLeft, FiClock, FiCpu, FiEdit, FiPause, FiPlay, FiUsers, FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useTheme } from "../context/ThemeContext"; // Import theme context
import { 
  clearAttendanceError, 
  endAttendanceSession, 
  fetchClassDetails, 
  generatefrequency, 
  saveDailyAttendance, 
  startAttendanceSession} from "../redux/slices/classSlice";
import { sendFrequencySMS, storeOfflineFrequency } from "../utils/offlineMode";
import { fetchAttendanceData,getSocket, initializeSocket, initiateAttendance, joinClassRoom, leaveClassRoom } from "../utils/socket";

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
  const { currentClass, loading, error, attendanceSaving, attendanceError } = useSelector((state) => state.class);
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
  const [isOffline, setIsOffline] = useState(false);
  const [studentPhone, setStudentPhone] = useState("");
  const [showSMSForm, setShowSMSForm] = useState(false);
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);

  const isClassTeacher = currentClass?.teacherId?._id === user?.user?._id;
  // Check if there's an active attendance session
  const hasActiveSession = currentClass?.activeAttendanceSession?.isActive || false;
  const activeSessionType = currentClass?.activeAttendanceSession?.sessionType || null;

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

    // Clean up function
    return () => {
      if (id && user?.user?._id) {
        leaveClassRoom(id, user.user._id);
      }
    };
  }, [dispatch, id, user?.user?._id]);

  // When currentClass is updated, check if there's an active session and update UI accordingly
  useEffect(() => {
    if (!currentClass) return;

    console.log("Current class updated:", currentClass);

    // First check if there's an active session directly from the class
    if (currentClass.activeAttendanceSession?.isActive) {
      console.log("Active session found:", currentClass.activeAttendanceSession);
      setCurrentSessionType(currentClass.activeAttendanceSession.sessionType);
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
        (typeof todayRecord.lecture === 'object' ? todayRecord.lecture.active : false);
      
      const isLabActive = todayRecord.lab && 
        (typeof todayRecord.lab === 'object' ? todayRecord.lab.active : false);
      
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

  // Helper function to initialize attendance for a specific session type
  const initializeAttendanceForSession = (sessionType, todayRecord) => {
    if (!currentClass?.studentList) return;
    
    const initialAttendance = {};
    currentClass.studentList.forEach(student => {
      // Check if this student already has attendance in realTimeAttendance or in the record
      const recordedAttendance = todayRecord[sessionType].find(
        record => record.studentId._id === student._id || record.studentId === student._id
      );
      
      initialAttendance[student._id] = 
        realTimeAttendance[student._id]?.status || 
        (recordedAttendance ? recordedAttendance.status : "absent");
    });
    
    setCurrentDailyAttendance(initialAttendance);
    sortStudentList(currentClass.studentList, initialAttendance);
  };

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

    // Listen for attendance started event
    socket.on('attendanceStarted', ({ classId, sessionType }) => {
      console.log(`Attendance started for class ${classId}, session: ${sessionType}`);
      
      // If this is for the current class, refresh the class details to get the active session
      if (classId === id) {
        dispatch(fetchClassDetails(id));
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
      socket.off('attendanceStarted');
      socket.off('attendanceUpdate');
      socket.off('attendanceEnded');
    };
  }, [isMarkingMode, currentDailyAttendance, currentSessionType, currentClass?.studentList, id, dispatch]);

  // Step 1: Show session type selection
  const handleInitiateAttendance = () => {
    setIsSelectingType(true);
    setIsMarkingMode(false);
    setCurrentSessionType(null);
  };

  // Step 2: Select session type and start the attendance session
  const handleSelectSessionType = (type) => {
    if (!currentClass?._id) {
      toast.error("Class information not loaded. Please refresh the page.");
      return;
    }
    
    console.log(`Session type selected: ${type}`);
    setCurrentSessionType(type);
    
    // Check if there's already attendance recorded for this date and type
    const today = new Date().toISOString().split('T')[0];
    
    // Show a loading toast
    const loadingToastId = toast.loading("Starting attendance session...");
    
    fetchAttendanceData(currentClass._id, today, type)
      .then((data) => {
        toast.dismiss(loadingToastId);
        
        if (data.attendanceRecords && data.attendanceRecords.length > 0) {
          toast.info(`${type.charAt(0).toUpperCase() + type.slice(1)} attendance records already exist for today`);
          
          // Format the data for the UI
          const existingAttendance = {};
          data.attendanceRecords.forEach(record => {
            if (record.studentId && record.studentId._id) {
              existingAttendance[record.studentId._id] = record.status;
            }
          });
          
          setCurrentDailyAttendance(existingAttendance);
          if (currentClass.studentList) {
            sortStudentList(currentClass.studentList, existingAttendance);
          }
          
          // Explicitly set UI to marking mode
          setIsMarkingMode(true);
          setIsSelectingType(false);
          
          console.log("Showing existing attendance records with UI in marking mode");
        } else {
          // If no existing records, start a new attendance session
          console.log("No existing records found, starting new attendance session");
          dispatch(startAttendanceSession({ 
            classId: currentClass._id, 
            sessionType: type 
          }))
            .unwrap()
            .then(() => {
              // Session started successfully
              console.log("Attendance session started successfully");
              dispatch(fetchClassDetails(id));
              
              // Initialize empty attendance for all students
              if (currentClass.studentList) {
      const initialAttendance = {};
      currentClass.studentList.forEach(student => {
        initialAttendance[student._id] = "absent";
      });
      setCurrentDailyAttendance(initialAttendance);
                sortStudentList(currentClass.studentList, initialAttendance);
              }
              
              // Explicitly transition UI to marking mode
      setIsMarkingMode(true);
              setIsSelectingType(false);
              
              toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} attendance session started`);
            })
            .catch(error => {
              console.error("Failed to start attendance session:", error);
              toast.error(`Failed to start attendance session: ${error.message || "Unknown error"}`);
              setIsSelectingType(false);
            });
        }
      })
      .catch(error => {
        toast.dismiss(loadingToastId);
        console.error("Error checking existing attendance:", error);
        toast.error("Error checking attendance records. Trying direct method...");
        
        // Fall back to the original behavior if there's an error checking attendance
        dispatch(startAttendanceSession({ 
          classId: currentClass._id, 
          sessionType: type 
        }))
          .unwrap()
          .then(() => {
            console.log("Direct attendance session started successfully");
            dispatch(fetchClassDetails(id));
            
            // Initialize empty attendance for all students
            if (currentClass.studentList) {
              const initialAttendance = {};
              currentClass.studentList.forEach(student => {
                initialAttendance[student._id] = "absent";
              });
              setCurrentDailyAttendance(initialAttendance);
       sortStudentList(currentClass.studentList, initialAttendance);
    }
            
            // Explicitly transition UI to marking mode
            setIsMarkingMode(true);
            setIsSelectingType(false);
            
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} attendance session started`);
          })
          .catch(error => {
            console.error("Failed to start attendance session (fallback):", error);
            toast.error(`Failed to start attendance session: ${error.message || "Unknown error"}`);
            setIsSelectingType(false);
          });
      });
  };

  // Handle manual attendance state updates
  const handleAttendanceChange = (studentId, status) => {
    const updatedAttendance = {
      ...currentDailyAttendance,
      [studentId]: status
    };
    setCurrentDailyAttendance(updatedAttendance);
    
    // Re-sort the list based on the new attendance state
    sortStudentList(currentClass.studentList, updatedAttendance);
  };

  // Cancel the attendance process
  const handleCancelAttendanceProcess = () => {
    // If we're in an active session, end it on the server
    if (hasActiveSession && currentClass?._id) {
      dispatch(endAttendanceSession({ classId: currentClass._id }))
        .unwrap()
        .then(() => {
          // Session ended successfully, reset UI state
    setIsMarkingMode(false);
    setIsSelectingType(false);
    setCurrentSessionType(null);
    setCurrentDailyAttendance({});
          // Refresh class details
          dispatch(fetchClassDetails(id));
        })
        .catch(error => {
          alert(`Failed to end attendance session: ${error}`);
        });
    } else {
      // Just reset the UI state
    setIsMarkingMode(false);
    setIsSelectingType(false);
    setCurrentSessionType(null);
    setCurrentDailyAttendance({});
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

  const handleOfflineModeChange = (offline) => {
    setIsOffline(offline);
    // Potentially sync with a global offline state if needed
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
      storeOfflineFrequency(newFrequency);
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
            
          // Emit socket event to notify students - use current session type
          const sessionTypeToUse = currentSessionType || 'lecture'; // Default to lecture if no type set
          initiateAttendance(currentClassId, newFrequency, user.user._id, sessionTypeToUse);
            
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

  // Updated to save attendance and end the session
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
      recordedBy: user.user._id,
      markCompleted: true // Add flag to indicate this session is done
    };

    dispatch(saveDailyAttendance(attendanceDataForThunk))
        .unwrap()
        .then((result) => {
        // Check if attendance was already recorded
        if (result.alreadyRecorded) {
          // If already recorded, update the UI to show existing records
          if (result.data && result.data.attendanceRecords) {
            const existingAttendance = {};
            // Convert the existing attendance records to the format our UI expects
            result.data.attendanceRecords.forEach(record => {
              existingAttendance[record.studentId._id || record.studentId] = record.status;
            });
            
            // Update the UI with the existing records
            setCurrentDailyAttendance(existingAttendance);
            
            // Reload the sortedStudentList with the existing data
            if (currentClass?.studentList) {
              sortStudentList(currentClass.studentList, existingAttendance);
            }
            
            // Show a less alarming message - attendance exists but we'll show it
            alert('Attendance records for this date already exist. Showing existing records.');
          }
        } else {
          // Standard success case - we saved new attendance
            alert('Attendance saved successfully!');
          
          // Check if there's an active record for today that might have another session to complete
          const today = new Date().toISOString().split('T')[0];
          const todayRecord = currentClass.attendanceRecords?.find(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === today;
          });
          
          const hasCompletedBoth = 
            todayRecord && 
            (todayRecord.lecture && todayRecord.lecture.length > 0) && 
            (todayRecord.lab && todayRecord.lab.length > 0);
          
          if (hasCompletedBoth) {
            // If both sessions are recorded, reset UI state completely
            setIsMarkingMode(false);
            setIsSelectingType(false);
            setCurrentSessionType(null);
            setCurrentDailyAttendance({});
          } else {
            // If we've just recorded one type, check if we should offer the other
            const otherType = currentSessionType === 'lecture' ? 'lab' : 'lecture';
            
            // Only prompt if the other session hasn't been marked yet
            const hasOtherSession = todayRecord && todayRecord[otherType] && todayRecord[otherType].length > 0;
            
            if (!hasOtherSession) {
              const shouldContinue = confirm(`Would you like to mark attendance for ${otherType} session now?`);
              
              if (shouldContinue) {
                // Start marking the other session type
                setCurrentSessionType(otherType);
                setIsMarkingMode(true);
                setIsSelectingType(false);
                setCurrentDailyAttendance({});
                
                // Initialize with empty attendance
                if (currentClass?.studentList) {
                  const initialAttendance = {};
                  currentClass.studentList.forEach(student => {
                    initialAttendance[student._id] = "absent";
                  });
                  setCurrentDailyAttendance(initialAttendance);
                  sortStudentList(currentClass.studentList, initialAttendance);
                }
              } else {
                // User declined, reset UI state
                setIsMarkingMode(false);
                setIsSelectingType(false);
                setCurrentSessionType(null);
                setCurrentDailyAttendance({});
              }
            } else {
              // Reset UI state
              setIsMarkingMode(false);
              setIsSelectingType(false);
              setCurrentSessionType(null);
              setCurrentDailyAttendance({});
            }
          }
          
          // Refresh class details to get the latest data
          dispatch(fetchClassDetails(id));
        }
        })
        .catch((err) => {
            alert(`Failed to save attendance: ${err.message || 'Unknown error'}`);
        });
  };

  // Add this helper function to determine if we have an active record for today
  const hasTodayActiveRecord = () => {
    if (!currentClass?.attendanceRecords) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return currentClass.attendanceRecords.some(record => {
      const recordDate = new Date(record.date).toISOString().split('T')[0];
      return recordDate === today && record.active;
    });
  };

  // Render the student attendance status with online indicator
  const renderStudentAttendanceStatus = (student, index) => {
    const isConnected = connectedStudents.has(student._id);
    const hasMarkedAttendance = realTimeAttendance[student._id]?.status === 'present';
    
    // Determine final status - giving priority to real-time updates
    const studentStatus = realTimeAttendance[student._id]?.status || currentDailyAttendance[student._id] || 'absent';
    
    return (
      <div key={student._id} className={`flex items-center justify-between p-5 gap-5 ${
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
            
            {/* Real-time attendance indicator */}
            {hasMarkedAttendance && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
              }`}>
                Marked
              </span>
            )}
          </div>
          <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{student.email}</p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <button
            type="button"
            className={`px-4 h-9 rounded-md text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              studentStatus === 'present'
                ? 'bg-green-600 text-white border-green-600 focus:ring-green-500 shadow-sm'
                : isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-green-500'
            } ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
            onClick={() => handleAttendanceChange(student._id, 'present')}
          >
            Present
          </button>
          <button
            type="button"
            className={`px-4 h-9 rounded-md text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              studentStatus === 'absent'
                ? 'bg-red-600 text-white border-red-600 focus:ring-red-500 shadow-sm'
                : isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 focus:ring-red-500'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-red-500'
            } ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
            onClick={() => handleAttendanceChange(student._id, 'absent')}
            disabled={realTimeAttendance[student._id]?.status === 'present'}
          >
            Absent
          </button>
        </div>
      </div>
    );
  };

  // Add a helper function to render attendance statistics
  const renderAttendanceStats = () => {
    if (!currentClass?.studentList?.length) return null;
    
    const totalStudents = currentClass.studentList.length;
    const presentCount = Object.values(currentDailyAttendance).filter(status => 
      status === 'present'
    ).length;
    
    // Also check real-time attendance for students who may have marked themselves present
    const realTimePresentCount = Object.values(realTimeAttendance)
      .filter(data => data?.status === 'present' && data?.sessionType === currentSessionType)
      .length;
    
    // Use the higher count (in case some students are in both)
    const finalPresentCount = Math.max(presentCount, realTimePresentCount);
    const absentCount = totalStudents - finalPresentCount;
    const attendancePercentage = totalStudents > 0 ? Math.round((finalPresentCount / totalStudents) * 100) : 0;
    
    return (
      <div className={`px-6 py-4 border-b ${
        isDarkMode 
          ? 'bg-gray-700/30 border-gray-700' 
          : 'bg-gray-100/50 border-gray-200'
      }`}>
        <div className="flex flex-wrap justify-between items-center">
          <div className="mb-2 sm:mb-0">
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Attendance Progress
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <div className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                <span className="font-medium">{finalPresentCount}</span> Present
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                <span className="font-medium">{absentCount}</span> Absent
              </div>
            </div>
          </div>
          
          <div>
            <div className="w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${attendancePercentage}%` }}
              ></div>
            </div>
            <p className={`text-xs mt-1 text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {attendancePercentage}% marked
            </p>
          </div>
        </div>
      </div>
    );
  };

  // --- Render Logic ---
  if (loading) return <div className={`flex justify-center items-center h-screen ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}><p>Loading...</p></div>;
  if (error) return <div className={`p-6 text-center ${isDarkMode ? 'text-red-400 bg-red-900/50 border border-red-700' : 'text-red-600 bg-red-100 border border-red-300'} rounded-lg max-w-md mx-auto mt-10`}>Error: {error}</div>;
  if (!currentClass) return <div className={`p-6 text-center ${isDarkMode ? 'text-gray-500 bg-gray-800' : 'text-gray-500 bg-gray-100'}`}>Class not found.</div>;

  return (
    <div className={`min-h-screen pb-24 pt-2 transition-colors duration-300 bg-transparent`}>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* --- Header --- */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className={`mr-3 p-2 rounded-full transition-colors duration-150 ${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
              aria-label="Go back"
            >
              <FiChevronLeft className="w-6 h-6" />
            </button>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{currentClass.className}</h1>
          </div>
          {isClassTeacher && (
            <Link
              to={`/edit-class/${id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm hover:bg-opacity-80 transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title="Edit Class Details"
            >
              <FiEdit className="w-4 h-4"/>
              Edit
            </Link>
          )}
        </div>

        {/* --- UPDATED: Class Info --- */}
        <div className={`mb-6 sm:mb-8 space-y-3 text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {/* Display Student Count */}
            <p className="flex items-center">
                <FiUsers className={`w-5 h-5 mr-2.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}/>
                <span className="font-medium mr-1.5">Students:</span> {currentClass?.studentList?.length || 0}
            </p>
        </div>

        {/* --- Attendance Section Card --- */}
        <div className={`rounded-lg shadow-md border overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* State 1: Initial View - Show "Start" button */}
          {!isSelectingType && !isMarkingMode && !hasActiveSession && (
            <div className="p-8 sm:p-10 text-center">
              <h2 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                {hasTodayActiveRecord() 
                  ? "Continue marking today's attendance" 
                  : "Ready to mark attendance?"}
              </h2>
                <button
                onClick={handleInitiateAttendance}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow hover:shadow-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                >
                {hasTodayActiveRecord() 
                  ? "Continue Attendance" 
                  : "Start Today's Attendance"}
                </button>
            </div>
          )}

          {/* State 2: Selecting Type */}
          {isSelectingType && !isMarkingMode && (
            <div className="p-6 sm:p-8">
                <h2 className={`text-lg font-semibold mb-5 text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Select Session Type</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
                    <button
                        onClick={() => handleSelectSessionType('lecture')}
                        className={`flex-1 font-medium py-3 px-6 rounded-lg transition-colors duration-150 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-blue-800/60 text-blue-200 hover:bg-blue-700/70' 
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                    >
                        Lecture
                    </button>
                    <button
                        onClick={() => handleSelectSessionType('lab')}
                        className={`flex-1 font-medium py-3 px-6 rounded-lg transition-colors duration-150 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 ${
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
                        onClick={handleCancelAttendanceProcess} // Cancel goes back to initial state
                        className={`text-sm font-medium ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
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
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                isDarkMode 
                  ? 'bg-gray-700/50 border-gray-700' 
                  : 'bg-gray-100/70 border-gray-200'
              }`}>
                  <h2 className={`text-xl font-semibold whitespace-nowrap capitalize ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    Attendance ({currentSessionType}) - {new Date().toLocaleDateString()} {/* Show type */}
                  </h2>
                  <button
                    onClick={handleGenerateFrequency}
                    className={`w-full sm:w-auto flex-shrink-0 font-medium py-2.5 px-5 rounded-md transition-colors duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 ${
                      isDarkMode 
                        ? 'bg-purple-800/60 text-purple-200 hover:bg-purple-700/70' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                    disabled={disabledButtons[currentClass._id]}
                  >
                    Special Frequency
                  </button>
              </div>

              {/* Attendance Statistics */}
              {renderAttendanceStats()}

              {/* Student List - Use sortedStudentList for rendering */}
              <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {sortedStudentList.length > 0 ? (
                  sortedStudentList.map((student, index) => renderStudentAttendanceStatus(student, index))
                ) : (
                  <p className={`text-center py-8 px-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No students enrolled in this class.</p>
                )}
              </div>

              {/* Action Buttons Footer - Show loading state */}
              {currentClass.studentList?.length > 0 && (
                  <div className={`px-6 py-5 border-t flex flex-col sm:flex-row justify-end items-center gap-4 ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-700' 
                      : 'bg-gray-100/70 border-gray-200'
                  }`}>
                    <button
                        type="button"
                        onClick={handleCancelAttendanceProcess} // Cancel goes back to initial state
                        className={`w-full sm:w-auto px-6 py-2.5 text-base font-medium border rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500 focus:ring-offset-gray-800' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-offset-white'
                        }`}
                        disabled={attendanceSaving}
                        title="Cancel Attendance Marking"
                    >
                        Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveAttendance}
                      className={`w-full sm:w-auto font-semibold py-2.5 px-6 rounded-md shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base bg-indigo-600 hover:bg-indigo-700 text-white ${
                        isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
                      }`}
                      disabled={attendanceSaving} // Disable button while saving
                    >
                      {attendanceSaving ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
              )}
              {/* Display specific save error or info message */}
              {attendanceError && (
                  <p className={`text-sm text-center pt-3 px-6 ${
                    attendanceError.includes('already been recorded') 
                      ? isDarkMode ? 'text-blue-400' : 'text-blue-600' 
                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {attendanceError.includes('already been recorded') 
                      ? 'Viewing existing attendance records' 
                      : `Error: ${attendanceError}`}
                  </p>
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
                  <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Frequency Sound</h2>
                  <button onClick={closeFrequencyPopup} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-100' : 'text-gray-500 hover:text-gray-800'}`}><FiX size={20}/></button>
                </div>
                <div className="p-6">
                  <div className={`mb-5 p-4 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-indigo-900/30 border-indigo-700/50' 
                      : 'bg-indigo-50 border-indigo-200'
                  }`}>
                    <h3 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Active Frequency</h3>
                    <span className={`text-3xl font-semibold font-mono ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      {classFrequencies[currentClass._id]?.[0] || '---'} Hz
                    </span>
                  </div>
                  <button
                    onClick={togglePlaySound}
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full shadow-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isPlaying 
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                        : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    } ${isDarkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                    aria-label={isPlaying ? 'Pause sound' : 'Play sound'}
                  >
                    {isPlaying ? <FiPause className="w-7 h-7" /> : <FiPlay className="w-7 h-7 pl-1" />}
                  </button>
                  <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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