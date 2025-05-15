import Class from "../models/class.model.js";
import mongoose from "mongoose";

// Utility function to find or create today's attendance record (UTC)
function findOrCreateTodayAttendanceRecord(classDoc) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  // First check if we already have a record for today
  let todayRecord = classDoc.attendanceRecords.find(record => {
    const recordDate = new Date(record.date);
    const recordDateUTC = new Date(Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate()));
    return recordDateUTC.getTime() === todayUTC.getTime();
  });

  // If no record exists, create a new one
  if (!todayRecord) {
    todayRecord = {
      date: todayUTC,
      lecture: { records: [], active: 'initial' },
      lab: { records: [], active: 'initial' }
    };
    classDoc.attendanceRecords.push(todayRecord);
  }

  // Ensure the record has the correct structure
  if (!todayRecord.lecture) {
    todayRecord.lecture = { records: [], active: 'initial' };
  }
  if (!todayRecord.lab) {
    todayRecord.lab = { records: [], active: 'initial' };
  }

  return todayRecord;
}

// Utility function to find today's attendance record (do not create)
function findTodayAttendanceRecord(classDoc) {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return classDoc.attendanceRecords.find(record => {
    const recordDate = new Date(record.date);
    const recordDateUTC = new Date(Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate()));
    return recordDateUTC.getTime() === todayUTC.getTime();
  });
}

export const handleAttendanceSocket = (socket, io) => {
  console.log(`Socket connected for attendance handling: ${socket.id}`);

  // User joins app and identifies themselves
  socket.on('identify', ({ userId, role }) => {
    socket.userData = { userId, role };
    console.log(`User identified: ${userId} (${role}) - Socket: ${socket.id}`);
  });

  // User joins a class room
  socket.on('joinClass', ({ userId, classId }) => {
    if (!userId || !classId) {
      console.error('joinClass: Missing userId or classId');
      return;
    }

    socket.join(`class:${classId}`);
    
    console.log(`User ${userId} joined class ${classId}`);
    
    // Notify others in the room
    socket.to(`class:${classId}`).emit('userJoined', { 
      userId,
      message: `User ${userId} joined the class`
    });
  });

  // User leaves a class room
  socket.on('leaveClass', ({ userId, classId }) => {
    if (!userId || !classId) {
      console.error('leaveClass: Missing userId or classId');
      return;
    }

    socket.leave(`class:${classId}`);
    console.log(`User ${userId} left class ${classId}`);
    
    // Notify others in the room
    socket.to(`class:${classId}`).emit('userLeft', { 
      userId,
      message: `User ${userId} left the class`
    });
  });

  // User joins a class room using new naming convention
  socket.on('student:joinClass', ({ userId, classId }) => {
    if (!userId || !classId) {
      console.error('student:joinClass: Missing userId or classId');
      return;
    }

    socket.join(`class:${classId}`);
    
    console.log(`Student ${userId} joined class ${classId}`);
    
    // Notify others in the room
    socket.to(`class:${classId}`).emit('userJoined', { 
      userId,
      message: `Student ${userId} joined the class`
    });
  });

  // User leaves a class room using new naming convention
  socket.on('student:leaveClass', ({ userId, classId }) => {
    if (!userId || !classId) {
      console.error('student:leaveClass: Missing userId or classId');
      return;
    }

    socket.leave(`class:${classId}`);
    console.log(`Student ${userId} left class ${classId}`);
    
    // Notify others in the room
    socket.to(`class:${classId}`).emit('userLeft', { 
      userId,
      message: `Student ${userId} left the class`
    });
  });

  // Teacher initiates attendance with frequency
  socket.on('initiateAttendance', async ({ classId, teacherId, sessionType, frequency }) => {
    console.log("initiateAttendance",{ classId, teacherId, sessionType, frequency });
    try {
      if (!classId || !teacherId || !sessionType) {
        console.error('initiateAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { message: 'Only teachers can initiate attendance' });
        return;
      }
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }

      // Use utility to find or create today's record
      let attendanceRecord = findOrCreateTodayAttendanceRecord(classDoc);

      // Check if the requested session type is already completed
      if (attendanceRecord[sessionType] && attendanceRecord[sessionType].active === 'completed') {
        socket.emit('attendance:error', { message: `${sessionType} attendance for today has already been completed and cannot be modified.` });
        return;
      }

      // Check if the session is already active
      if (attendanceRecord[sessionType] && attendanceRecord[sessionType].active === 'active') {
        // If there's an active session but it's stale (more than 2 hours old), end it
        const lastRecordTime = attendanceRecord[sessionType].records.length > 0 
          ? new Date(attendanceRecord[sessionType].records[attendanceRecord[sessionType].records.length - 1].recordedAt)
          : new Date(0);
        
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
        if (lastRecordTime < twoHoursAgo) {
          // Session is stale, mark it as completed
          attendanceRecord[sessionType].active = 'completed';
          await classDoc.save();
          
          // Start a new session
          attendanceRecord[sessionType].active = 'active';
          attendanceRecord[sessionType].records = []; // Clear old records
          
          // Initialize with all students marked as absent
          const studentList = classDoc.studentList || [];
          for (const studentId of studentList) {
            attendanceRecord[sessionType].records.push({
              studentId: new mongoose.Types.ObjectId(studentId),
              status: 'absent',
              recordedAt: new Date(),
              recordedBy: new mongoose.Types.ObjectId(teacherId)
            });
          }
          
          await classDoc.save();
          
          // Emit the new session start
          io.to(`class:${classId}`).emit('attendanceStarted', {
            classId,
            teacherId,
            sessionType,
            timestamp: new Date().toISOString(),
            message: `New ${sessionType} attendance session started`
          });
          
          return;
        }
        
        socket.emit('attendance:error', { message: `${sessionType} attendance is already active.` });
        return;
      }
      console.log("attendanceRecord",attendanceRecord);
      // Update existing record - set active state for the requested session
      attendanceRecord[sessionType].active = 'active';
      console.log("attendanceRecord",attendanceRecord);
      // Mark all students as absent initially only if there are no existing 
      console.log("attendanceRecord[sessionType].records",attendanceRecord[sessionType].records);
      if (!attendanceRecord[sessionType].records || attendanceRecord[sessionType].records.length === 0) {
        const studentList = classDoc.studentList || [];
        for (const studentId of studentList) {
          attendanceRecord[sessionType].records.push({
            studentId: new mongoose.Types.ObjectId(studentId),
            status: 'absent',
            recordedAt: new Date(),
            recordedBy: new mongoose.Types.ObjectId(teacherId)
          });
        }
        console.log(`[initiateAttendance] After marking all students absent:`, attendanceRecord[sessionType].records);
      }
      // Debug: Check if records array is empty after this block
      if (!attendanceRecord[sessionType].records || attendanceRecord[sessionType].records.length === 0) {
        console.warn(`[initiateAttendance] WARNING: records array is still empty after initialization for ${sessionType}`);
      }
      console.log("attendanceRecord",attendanceRecord);
      await classDoc.save();
      console.log("attendanceRecord",attendanceRecord);
      io.to(`class:${classId}`).emit('attendanceStarted', {
        classId,
        teacherId,
        sessionType,
        timestamp: new Date().toISOString(),
        message: `Attendance check initiated for ${sessionType}`
      });
      socket.emit('attendance:initiated', { 
        success: true,
        classId,
        sessionType,
        message: `Attendance for ${sessionType} initiated successfully`
      });
    } catch (error) {
      console.error('Error initiating attendance:', error);
      socket.emit('attendance:error', { message: error.message || 'Failed to initiate attendance' });
    }
  });

  // Student marks attendance
  socket.on('attendanceMarked', async ({ classId, studentId, studentName, status, sessionType }) => {
    try {
      if (!classId || !studentId || !status || !sessionType) {
        console.error('attendanceMarked: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }

      console.log(`Student ${studentId} marked attendance as ${status} in class ${classId} for ${sessionType}`);
      
      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }

      // Always use UTC midnight for today
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today
      const attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === todayUTC.getTime();
      });

      if (!attendanceRecord || !attendanceRecord[sessionType]?.active) {
        socket.emit('attendance:error', { message: 'No active attendance session for this class and session type' });
        return;
      }

      // Check if student is already marked
      const existingRecordIndex = attendanceRecord[sessionType].records.findIndex(
        record => record.studentId.toString() === studentId
      );

      const recordedBy = socket.userData?.role === 'teacher' ? socket.userData.userId : classDoc.teacherId;

      if (existingRecordIndex !== -1) {
        // Update existing record
        attendanceRecord[sessionType].records[existingRecordIndex] = {
          studentId: new mongoose.Types.ObjectId(studentId),
          status,
          recordedAt: new Date(),
          recordedBy: new mongoose.Types.ObjectId(recordedBy)
        };
      } else {
        // Add new record
        attendanceRecord[sessionType].records.push({
          studentId: new mongoose.Types.ObjectId(studentId),
          status,
          recordedAt: new Date(),
          recordedBy: new mongoose.Types.ObjectId(recordedBy)
        });
      }

      await classDoc.save();
      
      // Broadcast to all users in the class
      io.to(`class:${classId}`).emit('attendanceUpdate', {
        classId,
        studentId,
        studentName,
        status,
        sessionType,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error marking attendance:', error);
      socket.emit('attendance:error', { 
        message: error.message || 'Failed to mark attendance'
      });
    }
  });
  
  // Teacher starts attendance (using new naming convention)
  socket.on('teacher:startAttendance', async (data) => {
    try {
      console.log('Received teacher:startAttendance event:', data);
      const { classId, teacherId, sessionType, frequency } = data;
      if (!classId || !teacherId || !sessionType) {
        console.error('teacher:startAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { message: 'Only teachers can initiate attendance' });
        return;
      }
      console.log("teacher:startAttendance",{ classId, teacherId, sessionType, frequency });

      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }

      // Use utility to find today's record (do NOT create)
      let attendanceRecord = findTodayAttendanceRecord(classDoc);
      if (!attendanceRecord) {
        socket.emit('attendance:error', { message: 'No attendance session has been initialized for today. Please use the "initiateAttendance" action first.' });
        return;
      }

      // Check if the requested session type is already completed
      if (attendanceRecord[sessionType] && attendanceRecord[sessionType].active === 'completed') {
        socket.emit('attendance:error', { message: `${sessionType} attendance for today has already been completed and cannot be modified.` });
        return;
      }
      // Check if the session is already active
      if (attendanceRecord[sessionType] && attendanceRecord[sessionType].active === 'active') {
        socket.emit('attendance:error', { message: `${sessionType} attendance is already active.` });
        return;
      }
      // Update existing record - set active state for the requested session
      attendanceRecord[sessionType].active = 'active';
      // Mark all students as absent initially only if there are no existing records
      if (!attendanceRecord[sessionType].records || attendanceRecord[sessionType].records.length === 0) {
        const studentList = classDoc.studentList || [];
        for (const studentId of studentList) {
          attendanceRecord[sessionType].records.push({
            studentId: new mongoose.Types.ObjectId(studentId),
            status: 'absent',
            recordedAt: new Date(),
            recordedBy: new mongoose.Types.ObjectId(teacherId)
          });
        }
      }
      // Set frequency if provided
      if (Array.isArray(frequency) && frequency.length > 0) {
        classDoc.frequency = frequency;
      }
      await classDoc.save();
      io.to(`class:${classId}`).emit('attendanceStarted', {
        classId,
        teacherId,
        sessionType,
        timestamp: new Date().toISOString(),
        message: `Attendance check initiated for ${sessionType}`
      });
      socket.emit('attendance:initiated', { 
        success: true,
        classId,
        sessionType,
        message: `Attendance for ${sessionType} initiated successfully`
      });
    } catch (error) {
      console.error('Error in teacher:startAttendance:', error);
      socket.emit('attendance:error', { message: error.message || 'Failed to initiate attendance' });
    }
  });
  
  // Teacher ends attendance (using new naming convention)
  socket.on('teacher:endAttendance', async (data) => {
    try {
      console.log('Received teacher:endAttendance event:', data);
      const { classId, teacherId, sessionType } = data;
      if (!classId || !teacherId || !sessionType) {
        console.error('teacher:endAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { message: 'Only teachers can end attendance sessions' });
        return;
      }
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }
      // Always use UTC midnight for today, but do NOT create a new record
      const attendanceRecord = findTodayAttendanceRecord(classDoc);
      if (!attendanceRecord || !attendanceRecord[sessionType]) {
        socket.emit('attendance:error', { message: 'No attendance record found for this session' });
        return;
      }
      // Set active to completed to indicate session is completed
      attendanceRecord[sessionType].active = 'completed';
      await classDoc.save();
      // Broadcast to all users in the class
      io.to(`class:${classId}`).emit('attendanceEnded', {
        classId,
        sessionType,
        timestamp: new Date().toISOString(),
        message: `Attendance for ${sessionType} has been completed`
      });
      // Notify the teacher's client to navigate away
      socket.emit('attendance:endedAndNavigate', {
        success: true,
        classId,
        sessionType,
        message: `Attendance for ${sessionType} ended successfully, navigate away.`
      });
    } catch (error) {
      console.error('Error in teacher:endAttendance:', error);
      socket.emit('attendance:error', { message: error.message || 'Failed to end attendance session' });
    }
  });

  // Teacher ends attendance
  socket.on('endAttendance', async ({ classId, teacherId, sessionType }) => {
    try {
      if (!classId || !teacherId || !sessionType) {
        console.error('endAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { message: 'Only teachers can end attendance sessions' });
        return;
      }
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }
      // Always use UTC midnight for today, but do NOT create a new record
      const attendanceRecord = findTodayAttendanceRecord(classDoc);
      if (attendanceRecord && attendanceRecord[sessionType]) {
        attendanceRecord[sessionType].active = 'completed';
        await classDoc.save();
      }
      io.to(`class:${classId}`).emit('attendanceEnded', {
        classId,
        sessionType,
        timestamp: new Date().toISOString(),
        message: `Attendance for ${sessionType} has been completed`
      });
      // Notify the teacher's client to navigate away
      socket.emit('attendance:endedAndNavigate', {
        success: true,
        classId,
        sessionType,
        message: `Attendance for ${sessionType} ended successfully, navigate away.`
      });
    } catch (error) {
      console.error('Error ending attendance:', error);
      socket.emit('attendance:error', { message: error.message || 'Failed to end attendance session' });
    }
  });

  // Request to fetch attendance for a specific date and session type
  socket.on('fetchAttendance', async ({ classId, date, sessionType }) => {
    try {
      if (!classId || !date || !sessionType) {
        console.error('fetchAttendance: Missing required parameters');
        socket.emit('attendanceData', { 
          success: false, 
          message: 'Missing required parameters' 
        });
        return;
      }

      console.log(`Socket request to fetch attendance for class ${classId}, date ${date}, session ${sessionType}`);
      
      // Convert date string to Date object and normalize to midnight UTC
      const attendanceDate = new Date(date);
      if (isNaN(attendanceDate.getTime())) {
        socket.emit('attendanceData', { 
          success: false, 
          message: 'Invalid date format' 
        });
        return;
      }
      attendanceDate.setUTCHours(0, 0, 0, 0);

      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendanceData', { 
          success: false, 
          message: 'Class not found' 
        });
        return;
      }

      // Find the attendance record for this date
      const attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === attendanceDate.getTime();
      });

      if (!attendanceRecord) {
        socket.emit('attendanceData', {
          success: true,
          exists: false,
          classId,
          date: attendanceDate,
          sessionType,
          message: 'No attendance records found for this date and session',
          data: { records: [] }
        });
        return;
      }

      // Send the specific session type attendance data
      socket.emit('attendanceData', { 
        success: true,
        exists: true,
        classId,
        date: attendanceRecord.date,
        sessionType,
        message: `Attendance records for ${sessionType} on ${attendanceDate.toISOString().split('T')[0]}`,
        data: {
          active: attendanceRecord[sessionType].active,
          records: attendanceRecord[sessionType].records || []
        }
      });
      
    } catch (error) {
      console.error('Error fetching attendance data via socket:', error);
      socket.emit('attendanceData', { 
        success: false,
        classId,
        message: error.message || 'Failed to fetch attendance data'
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
}; 