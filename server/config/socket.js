import { Server } from 'socket.io';
import { fetchAttendanceForSocket } from '../controllers/class.controllers.js';

// Socket.io connection handler
let io;
// Map to track connected users
let users = new Map(); // userId -> socketId
let classRooms = new Map(); // classId -> Set of userIds

// Initialize socket server
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'https://electrothon.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
        'https://localhost',
        'capacitor://localhost',
        'http://localhost',
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Store connected users and their socket IDs
  users = new Map(); // userId -> socketId
  classRooms = new Map(); // classId -> Set of userIds

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins app and identifies themselves
    socket.on('identify', ({ userId, role }) => {
      users.set(userId, socket.id);
      console.log(`User identified: ${userId} (${role}) - Socket: ${socket.id}`);
    });

    // User joins a class room
    socket.on('joinClass', ({ userId, classId }) => {
      socket.join(`class:${classId}`);
      
      // Add user to class room mapping
      if (!classRooms.has(classId)) {
        classRooms.set(classId, new Set());
      }
      classRooms.get(classId).add(userId);
      
      console.log(`User ${userId} joined class ${classId}`);
      
      // Notify others in the room
      socket.to(`class:${classId}`).emit('userJoined', { 
        userId,
        count: classRooms.get(classId).size
      });
    });

    // User leaves a class room
    socket.on('leaveClass', ({ userId, classId }) => {
      socket.leave(`class:${classId}`);
      
      // Remove user from class room mapping
      if (classRooms.has(classId)) {
        classRooms.get(classId).delete(userId);
        
        // Cleanup empty rooms
        if (classRooms.get(classId).size === 0) {
          classRooms.delete(classId);
        }
      }
      
      console.log(`User ${userId} left class ${classId}`);
      
      // Notify others in the room
      socket.to(`class:${classId}`).emit('userLeft', { 
        userId,
        count: classRooms.get(classId)?.size || 0
      });
    });

    // Teacher initiates attendance with frequency
    socket.on('initiateAttendance', ({ classId, frequency, teacherId, sessionType }) => {
      console.log(`Teacher ${teacherId} initiated attendance in class ${classId} with frequency ${frequency} for ${sessionType}`);
      
      // Broadcast to all students in the class
      io.to(`class:${classId}`).emit('attendanceStarted', {
        classId,
        frequency,
        teacherId,
        sessionType
      });
    });

    // Student marks attendance
    socket.on('attendanceMarked', ({ classId, studentId, status, studentName, sessionType }) => {
      console.log(`Student ${studentId} marked attendance as ${status} in class ${classId} for ${sessionType}`);
      
      // Broadcast to teacher and other students
      io.to(`class:${classId}`).emit('attendanceUpdate', {
        classId,
        studentId,
        studentName,
        status,
        sessionType,
        timestamp: new Date().toISOString()
      });
    });

    // Request to fetch attendance for a specific date and session type
    socket.on('fetchAttendance', async ({ classId, date, sessionType }) => {
      try {
        console.log(`Socket request to fetch attendance for class ${classId}, date ${date}, session ${sessionType}`);
        
        const attendanceData = await fetchAttendanceForSocket(classId, date, sessionType);
        
        // Send the data back to the requester only
        socket.emit('attendanceData', { 
          success: true,
          classId,
          ...attendanceData 
        });
        
      } catch (error) {
        console.error('Error fetching attendance data via socket:', error.message);
        socket.emit('attendanceData', { 
          success: false,
          classId,
          message: error.message || 'Failed to fetch attendance data'
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Find and remove user from users map
      let disconnectedUserId = null;
      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          users.delete(userId);
          break;
        }
      }
      
      // Remove user from all class rooms
      if (disconnectedUserId) {
        for (const [classId, userSet] of classRooms.entries()) {
          if (userSet.has(disconnectedUserId)) {
            userSet.delete(disconnectedUserId);
            
            // Notify room members of departure
            socket.to(`class:${classId}`).emit('userLeft', {
              userId: disconnectedUserId,
              count: userSet.size
            });
            
            // Cleanup empty rooms
            if (userSet.size === 0) {
              classRooms.delete(classId);
            }
          }
        }
      }
    });
  });

  return io;
};

// Helper function to get the socket.io instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Enhance emitToClass function for more reliable notifications
export const emitToClass = (classId, event, data) => {
  try {
    // Check if Socket.io is initialized
    if (!io) {
      console.error('Socket.io not initialized when attempting to emit event:', event);
      return null;
    }

    // Generate unique notification ID to track delivery
    const notificationId = `${event}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Add timestamp if not already present
    if (!data.timestamp) {
      data.timestamp = new Date().toISOString();
    }

    // Add notification ID to data
    data.notificationId = notificationId;

    // Get room name for this class
    const roomName = `class:${classId}`;
    
    // Log details about this emission
    const connectedClients = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`[SOCKET] Emitting '${event}' to class ${classId} (${connectedClients} connected clients) with data:`, 
      JSON.stringify({
        notificationId,
        event,
        priority: data.priority || 'normal',
        message: data.message,
        timestamp: data.timestamp
      })
    );

    // Emit to all clients in the room
    io.to(roomName).emit(event, data);

    // For important events, try to emit directly to specific user sockets as well
    // This adds redundancy for critical notifications
    if (['attendanceStarted', 'attendanceEnded'].includes(event) || data.priority === 'high') {
      // Try to send directly to all students in the class
      const userSockets = getUserSocketsInClass(classId);
      if (userSockets && userSockets.length > 0) {
        console.log(`[SOCKET] Also sending direct notifications to ${userSockets.length} user sockets`);
        userSockets.forEach(socket => {
          socket.emit(event, {
            ...data,
            direct: true // Mark this as a direct notification
          });
        });
      }
    }

    return notificationId;
  } catch (error) {
    console.error('[SOCKET] Error emitting to class:', error);
    return null;
  }
};

// Helper function to get all socket connections for users in a specific class
const getUserSocketsInClass = (classId) => {
  try {
    if (!io || !classRooms.has(classId)) return [];
    
    // Get the set of users in this class
    const usersInClass = classRooms.get(classId);
    if (!usersInClass || usersInClass.size === 0) return [];
    
    const relevantSockets = [];
    
    // For each user in the class, find their socket if connected
    for (const userId of usersInClass) {
      const socketId = users.get(userId);
      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          relevantSockets.push(socket);
        }
      }
    }
    
    console.log(`[SOCKET] Found ${relevantSockets.length} active sockets for class ${classId} out of ${usersInClass.size} class members`);
    return relevantSockets;
  } catch (error) {
    console.error('[SOCKET] Error getting user sockets in class:', error);
    return [];
  }
};

// Helper function to emit to specific user
export const emitToUser = (userId, event, data) => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  const socketId = users.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}; 