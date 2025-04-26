import Class from "../models/class.model.js";
import mongoose from "mongoose";

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

      // Verify the user is a teacher
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { 
          message: 'Only teachers can initiate attendance'
        });
        return;
      }

      console.log(`Teacher ${teacherId} initiated attendance in class ${classId} for ${sessionType}`);
      
      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }

      // Check if teacher owns this class
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today or create new one
      let attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      if (!attendanceRecord) {
        // Create new attendance record for today
        attendanceRecord = {
          date: today,
          lecture: { records: [], active: sessionType === 'lecture' },
          lab: { records: [], active: sessionType === 'lab' }
        };
        classDoc.attendanceRecords.push(attendanceRecord);
      } else {
        // Update existing record
        attendanceRecord[sessionType].active = true;
      }

      // Set frequency if provided
      if (Array.isArray(frequency) && frequency.length > 0) {
        classDoc.frequency = frequency;
      }

      await classDoc.save();
      
      // Broadcast to all students in the class
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
      socket.emit('attendance:error', { 
        message: error.message || 'Failed to initiate attendance'
      });
    }
  });

  // Student marks attendance (using new naming convention)
  socket.on('student:markAttendance', async (data) => {
    try {
      console.log('Received student:markAttendance event:', data);
      
      // Extract required parameters
      const { classId, studentId, studentName, status = 'present', sessionType } = data;
      
      if (!classId || !studentId || !sessionType) {
        console.error('student:markAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }
      
      // Process exactly like attendanceMarked handler
      console.log(`Student ${studentId} marked attendance as ${status} in class ${classId} for ${sessionType}`);
      
      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today
      const attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      if (!attendanceRecord || !attendanceRecord[sessionType].active) {
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
      console.error('Error in student:markAttendance:', error);
      socket.emit('attendance:error', { 
        message: error.message || 'Failed to mark attendance'
      });
    }
  });
  
  // Teacher starts attendance (using new naming convention)
  socket.on('teacher:startAttendance', async (data) => {
    try {
      console.log('Received teacher:startAttendance event:', data);
      
      // Extract required parameters
      const { classId, teacherId, sessionType, frequency } = data;
      
      // Process the same as initiateAttendance
      if (!classId || !teacherId || !sessionType) {
        console.error('teacher:startAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }

      // Verify the user is a teacher
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { 
          message: 'Only teachers can initiate attendance'
        });
        return;
      }

      console.log(`Teacher ${teacherId} initiated attendance in class ${classId} for ${sessionType}`);
      
      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }

      // Check if teacher owns this class
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today or create new one
      let attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      if (!attendanceRecord) {
        // Create new attendance record for today
        attendanceRecord = {
          date: today,
          lecture: { records: [], active: sessionType === 'lecture' },
          lab: { records: [], active: sessionType === 'lab' }
        };
        classDoc.attendanceRecords.push(attendanceRecord);
      } else {
        // Update existing record
        attendanceRecord[sessionType].active = true;
      }

      // Set frequency if provided
      if (Array.isArray(frequency) && frequency.length > 0) {
        classDoc.frequency = frequency;
      }

      await classDoc.save();
      
      // Broadcast to all students in the class
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
      socket.emit('attendance:error', { 
        message: error.message || 'Failed to initiate attendance'
      });
    }
  });
  
  // Teacher ends attendance (using new naming convention)
  socket.on('teacher:endAttendance', async (data) => {
    try {
      console.log('Received teacher:endAttendance event:', data);
      
      // Extract required parameters
      const { classId, teacherId, sessionType } = data;
      
      // Process the same as endAttendance
      if (!classId || !teacherId || !sessionType) {
        console.error('teacher:endAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }

      // Verify the user is a teacher
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { 
          message: 'Only teachers can end attendance sessions'
        });
        return;
      }

      console.log(`Teacher ${teacherId} ending attendance in class ${classId} for ${sessionType}`);
      
      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }

      // Check if teacher owns this class
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today
      const attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      if (attendanceRecord && attendanceRecord[sessionType]) {
        attendanceRecord[sessionType].active = false;
        await classDoc.save();
      }

      // Broadcast to all users in the class
      io.to(`class:${classId}`).emit('attendanceEnded', {
        classId,
        sessionType,
        timestamp: new Date().toISOString(),
        message: `Attendance for ${sessionType} has ended`
      });

      socket.emit('attendance:ended', { 
        success: true,
        classId,
        sessionType,
        message: `Attendance for ${sessionType} ended successfully`
      });
    } catch (error) {
      console.error('Error in teacher:endAttendance:', error);
      socket.emit('attendance:error', { 
        message: error.message || 'Failed to end attendance session'
      });
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

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today
      const attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      if (!attendanceRecord || !attendanceRecord[sessionType].active) {
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

  // Teacher ends attendance
  socket.on('endAttendance', async ({ classId, teacherId, sessionType }) => {
    try {
      if (!classId || !teacherId || !sessionType) {
        console.error('endAttendance: Missing required parameters');
        socket.emit('attendance:error', { message: 'Missing required parameters' });
        return;
      }

      // Verify the user is a teacher
      if (socket.userData?.role !== 'teacher') {
        socket.emit('attendance:error', { 
          message: 'Only teachers can end attendance sessions'
        });
        return;
      }

      console.log(`Teacher ${teacherId} ending attendance in class ${classId} for ${sessionType}`);
      
      // Find the class
      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        socket.emit('attendance:error', { message: 'Class not found' });
        return;
      }

      // Check if teacher owns this class
      if (classDoc.teacherId.toString() !== teacherId) {
        socket.emit('attendance:error', { message: 'Not authorized to manage this class' });
        return;
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find attendance record for today
      const attendanceRecord = classDoc.attendanceRecords.find(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });

      if (attendanceRecord && attendanceRecord[sessionType]) {
        attendanceRecord[sessionType].active = false;
        await classDoc.save();
      }

      // Broadcast to all users in the class
      io.to(`class:${classId}`).emit('attendanceEnded', {
        classId,
        sessionType,
        timestamp: new Date().toISOString(),
        message: `Attendance for ${sessionType} has ended`
      });

      socket.emit('attendance:ended', { 
        success: true,
        classId,
        sessionType,
        message: `Attendance for ${sessionType} ended successfully`
      });

    } catch (error) {
      console.error('Error ending attendance:', error);
      socket.emit('attendance:error', { 
        message: error.message || 'Failed to end attendance session'
      });
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