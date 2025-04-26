import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { initializeSocket, getSocket, disconnectSocket } from './socket';

/**
 * React hook for managing attendance socket connections and events
 * @param {string} classId - ID of the class
 * @param {string} userId - ID of the current user
 * @param {string} role - Role of the current user ('teacher' or 'student')
 * @returns {object} Socket methods and state for attendance management
 */
const useAttendanceSocket = (classId, userId, role) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [attendanceActive, setAttendanceActive] = useState(false);
  const [activeSessionType, setActiveSessionType] = useState(null);
  const [attendanceUpdates, setAttendanceUpdates] = useState([]);
  const [error, setError] = useState(null);
  
  const user = useSelector((state) => state.user);

  // Initialize socket connection
  useEffect(() => {
    if (!classId || !userId) return;
    
    // Get or initialize socket
    const socketInstance = getSocket() || initializeSocket(user);
    setSocket(socketInstance);
    
    // Set up connection events
    const handleConnect = () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
      
      // Identify user
      socketInstance.emit('identify', { userId, role });
      
      // Join class room
      socketInstance.emit('joinClass', { userId, classId });
    };
    
    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    };
    
    const handleError = (err) => {
      console.error('Socket error:', err);
      setError(err);
    };
    
    // Set up listeners
    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleError);
    
    // If already connected, join the class
    if (socketInstance.connected) {
      socketInstance.emit('identify', { userId, role });
      socketInstance.emit('joinClass', { userId, classId });
      setConnected(true);
    }
    
    // Clean up
    return () => {
      if (socketInstance) {
        // Leave the class room before cleanup
        socketInstance.emit('leaveClass', { userId, classId });
        
        // Remove listeners
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
        socketInstance.off('connect_error', handleError);
      }
    };
  }, [classId, userId, role, user]);
  
  // Set up attendance event listeners
  useEffect(() => {
    if (!socket || !connected) return;
    
    // Listen for attendance start
    const handleAttendanceStarted = (data) => {
      console.log('Attendance started:', data);
      if (data.classId === classId) {
        setAttendanceActive(true);
        setActiveSessionType(data.sessionType);
      }
    };
    
    // Listen for attendance end
    const handleAttendanceEnded = (data) => {
      console.log('Attendance ended:', data);
      if (data.classId === classId) {
        setAttendanceActive(false);
        setActiveSessionType(null);
      }
    };
    
    // Listen for attendance updates
    const handleAttendanceUpdate = (data) => {
      console.log('Attendance update:', data);
      if (data.classId === classId) {
        setAttendanceUpdates(prev => [...prev, data]);
      }
    };
    
    // Listen for errors
    const handleAttendanceError = (data) => {
      console.error('Attendance error:', data);
      setError(data.message);
    };
    
    // Set up listeners
    socket.on('attendanceStarted', handleAttendanceStarted);
    socket.on('attendanceEnded', handleAttendanceEnded);
    socket.on('attendanceUpdate', handleAttendanceUpdate);
    socket.on('attendance:error', handleAttendanceError);
    
    // Clean up
    return () => {
      socket.off('attendanceStarted', handleAttendanceStarted);
      socket.off('attendanceEnded', handleAttendanceEnded);
      socket.off('attendanceUpdate', handleAttendanceUpdate);
      socket.off('attendance:error', handleAttendanceError);
    };
  }, [socket, connected, classId]);
  
  // Teacher: Start attendance session
  const startAttendance = useCallback((sessionType = 'lecture', frequency = []) => {
    if (!socket || !connected || role !== 'teacher') {
      setError('Cannot start attendance: not connected or not a teacher');
      return false;
    }
    
    socket.emit('initiateAttendance', {
      classId,
      teacherId: userId,
      sessionType,
      frequency
    });
    
    return true;
  }, [socket, connected, classId, userId, role]);
  
  // Teacher: End attendance session
  const endAttendance = useCallback((sessionType = 'lecture') => {
    if (!socket || !connected || role !== 'teacher') {
      setError('Cannot end attendance: not connected or not a teacher');
      return false;
    }
    
    socket.emit('endAttendance', {
      classId,
      teacherId: userId,
      sessionType
    });
    
    return true;
  }, [socket, connected, classId, userId, role]);
  
  // Student: Mark attendance
  const markAttendance = useCallback((studentName, status = 'present', sessionType = 'lecture') => {
    if (!socket || !connected) {
      setError('Cannot mark attendance: not connected');
      return false;
    }
    
    socket.emit('attendanceMarked', {
      classId,
      studentId: userId,
      studentName,
      status,
      sessionType: sessionType || activeSessionType || 'lecture'
    });
    
    return true;
  }, [socket, connected, classId, userId, activeSessionType]);
  
  // Fetch attendance data for a specific date
  const fetchAttendance = useCallback((date, sessionType = 'lecture') => {
    return new Promise((resolve, reject) => {
      if (!socket || !connected) {
        reject(new Error('Cannot fetch attendance: not connected'));
        return;
      }
      
      // Set up a one-time listener for the response
      socket.once('attendanceData', (data) => {
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.message || 'Failed to fetch attendance data'));
        }
      });
      
      // Request the data
      socket.emit('fetchAttendance', {
        classId,
        date,
        sessionType
      });
      
      // Set a timeout in case the server doesn't respond
      setTimeout(() => {
        socket.off('attendanceData'); // Clean up the listener
        reject(new Error('Timeout while waiting for attendance data'));
      }, 10000); // 10 second timeout
    });
  }, [socket, connected, classId]);
  
  // Clear attendance updates
  const clearAttendanceUpdates = useCallback(() => {
    setAttendanceUpdates([]);
  }, []);
  
  return {
    connected,
    attendanceActive,
    activeSessionType,
    attendanceUpdates,
    error,
    startAttendance,
    endAttendance,
    markAttendance,
    fetchAttendance,
    clearAttendanceUpdates
  };
};

export default useAttendanceSocket; 