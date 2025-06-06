import { io } from 'socket.io-client';

// Get API base URL from environment or default to localhost
const API_URL = window.location.hostname === 'electrothon.vercel.app' 
  ? 'https://35-154-255-213.nip.io' // AWS backend URL with HTTPS
  : 'http://localhost:5014'; // Local development URL

// Create Socket.io instance with connection options
let socket;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize and connect to Socket.io server
 * @param {Object} user - User object with _id and role properties
 * @returns {Object} - Socket.io instance
 */
export const initializeSocket = (user) => {
  if (!socket) {
    const socketOptions = {
      autoConnect: true,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      secure: true, // Enable secure connection
      rejectUnauthorized: false, // Allow self-signed certificates
    };

    console.log('Connecting to socket server:', API_URL, socketOptions);
    socket = io(API_URL, socketOptions);

    // Add connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected successfully');
      
      // Identify user to server if we have user info
      if (user?.user?._id) {
        socket.emit('identify', {
          userId: user.user._id,
          role: user.user.role
        });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    // Handle attendance specific events
    socket.on('attendance:error', (data) => {
      console.error('Attendance error:', data);
      // You can add custom error handling here if needed
    });
    
    socket.on('attendanceStarted', (data) => {
      console.log('Attendance started:', data);
      // You can add custom handling here if needed
    });
    
    socket.on('attendanceEnded', (data) => {
      console.log('Attendance ended:', data);
      // You can add custom handling here if needed
    });
  }
  
  return socket;
};

/**
 * Join a class room for real-time updates
 * @param {string} classId - ID of class to join
 * @param {string} userId - User ID
 */
export const joinClassRoom = (classId, userId) => {
  if (!socket?.connected || !classId || !userId) return;
  
  // Using new naming convention (student:joinClass)
  socket.emit('student:joinClass', {
    classId,
    userId
  });
  
  // For backward compatibility, also emit the old event
  socket.emit('joinClass', {
    classId,
    userId
  });
};

/**
 * Leave a class room
 * @param {string} classId - ID of class to leave
 * @param {string} userId - User ID
 */
export const leaveClassRoom = (classId, userId) => {
  if (!socket?.connected || !classId || !userId) return;
  
  // Using new naming convention (student:leaveClass)
  socket.emit('student:leaveClass', {
    classId,
    userId
  });
  
  // For backward compatibility, also emit the old event
  socket.emit('leaveClass', {
    classId,
    userId
  });
};

/**
 * Teacher initiates attendance with frequency
 * @param {string} classId - ID of class
 * @param {Array|Number} frequency - Frequency value(s)
 * @param {string} teacherId - Teacher's user ID
 * @param {string} sessionType - Type of session ('lecture' or 'lab')
 */
export const initiateAttendance = async(classId, frequency, teacherId, sessionType = 'lecture') => {
  if (!socket?.connected || !classId || !teacherId) return;
   // For backward compatibility, also emit the old event with all parameters
    await socket.emit('initiateAttendance', {
    classId,
    frequency,
    teacherId,
    sessionType,
    timestamp: new Date().toISOString(),
    message: `Attendance check initiated by teacher for ${sessionType}`
  });



  // Using new naming convention (teacher:startAttendance)
  socket.emit('teacher:startAttendance', {
    classId,
    teacherId,
    sessionType
  });
  
 
};

/**
 * Teacher ends attendance session
 * @param {string} classId - ID of class
 * @param {string} teacherId - Teacher's user ID
 * @param {string} sessionType - Type of session ('lecture' or 'lab')
 */
export const endAttendance = (classId, teacherId, sessionType = 'lecture') => {
  if (!socket?.connected || !classId || !teacherId) return;
  
  // Using new naming convention (teacher:endAttendance)
  socket.emit('teacher:endAttendance', {
    classId,
    teacherId,
    sessionType
  });
  
  // For backward compatibility, also emit the old event
  socket.emit('endAttendance', {
    classId,
    teacherId,
    sessionType
  });
};

/**
 * Student marks attendance
 * @param {string} classId - ID of class
 * @param {string} studentId - Student's user ID
 * @param {string} studentName - Student's name
 * @param {string} status - Status ('present' or 'absent')
 * @param {string} sessionType - Type of session ('lecture' or 'lab')
 */
export const markAttendance = (classId, studentId, studentName, status = 'present', sessionType = 'lecture') => {
  if (!socket?.connected || !classId || !studentId) {
    console.error("Cannot mark attendance: socket not connected or missing parameters");
    return false;
  }
  
  console.log(`Emitting attendance marked for ${studentName} (${studentId}) in class ${classId} - ${sessionType}`);
  
  // Using new naming convention (student:markAttendance)
  socket.emit('student:markAttendance', {
    classId,
    studentId,
    studentName,
    status,
    sessionType
  });
  
  // For backward compatibility, also emit the old event
  socket.emit('attendanceMarked', {
    classId,
    studentId,
    studentName,
    status,
    sessionType,
    timestamp: new Date().toISOString()
  });
  
  return true;
};

/**
 * Get the Socket.io instance
 * @returns {Object|null} - Socket.io instance or null if not initialized
 */
export const getSocket = () => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

/**
 * Request attendance data for a specific date and session type
 * @param {string} classId - ID of class
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} sessionType - Session type ('lecture' or 'lab')
 * @returns {Promise} - Promise that resolves with attendance data
 */
export const fetchAttendanceData = (classId, date, sessionType) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected || !classId || !date || !sessionType) {
      reject(new Error('Missing required parameters or socket not connected'));
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
}; 