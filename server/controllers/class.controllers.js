import AppError from "../utils/error.utils.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import { emitToClass } from '../config/socket.js';
import expressAsyncHandler from 'express-async-handler';
const asyncHandler = expressAsyncHandler;



// Create a class by a teacher and for now it is using the student list and selecting that student 
// TODO: make the use of class code to join and get the resources.
export const registerClass = async (req, res, next) => 
  {
    console.log("Received class data:", req.body);
    console.log("User:", req.user);
  try {
    // --- Updated fields from req.body ---
    const { className, schedule, classCode, batch, studentIds } = req.body;
    console.log("Received class data:", req.body);
    const createdBy = req.user?.id; // Assuming auth middleware adds user to req

    // --- Updated Validations ---
    if (!className || !schedule || !classCode || !batch || !createdBy) {
      return next(new AppError("ClassName, Schedule, ClassCode, Batch, and Creator ID are required", 400));
    }

    // Verify if the creator exists and is a teacher (assuming only teachers create classes)
    // Note: The schema requires teacherId, so we need that too. 
    // Let's assume createdBy IS the teacherId for simplicity here.
    // If not, you'll need to pass teacherId separately or adjust logic.
    const teacher = await User.findById(createdBy);
    if (!teacher || teacher.role !== "teacher") {
      return next(
        new AppError("Invalid Creator ID or user is not a teacher", 400)
      );
    }
    const teacherId = createdBy; // Assign teacherId based on creator

    // Validate student IDs if provided (remains the same)
    if (studentIds && studentIds.length > 0) {
      const students = await User.find({ 
        _id: { $in: studentIds },
        role: "student" 
      });
      
      if (students.length !== studentIds.length) {
        return next(new AppError("One or more student IDs are invalid", 400));
      }
    }

    // --- Updated Class.create call ---
    const newClass = await Class.create({
      className,
      schedule,
      classCode, // Added
      batch,     // Added
      teacherId, // Using creator as teacher for now
      createdBy, // Added
      studentList: studentIds || [],
      frequency: [], // Initialize as empty
      attendanceRecords: [] // Initialize as empty
      // Removed: classType, time, status implicitly
    });

    // Update classId for all students (remains the same)
    if (studentIds && studentIds.length > 0) {
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $push: { classId: newClass._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: "Class registered successfully",
      data: newClass,
    });
  } catch (error) {
    // Handle potential duplicate key error for classCode
    if (error.code === 11000 && error.keyPattern?.classCode) {
        return next(new AppError(`Class code '${error.keyValue.classCode}' already exists.`, 409)); // 409 Conflict
    }
    if (error.name === 'ValidationError') {
        return next(new AppError(error.message, 400));
    }
    console.error("Error registering class:", error); // Log the actual error
    next(new AppError("Failed to register class", 500));
  }
};

// this is an important function for auto listening the route of the student side properly 
export const generateAttendance = async (req, res) => {
  try {
    const { classId, teacherId, frequency, autoActivate = false } = req.body;

    // Validate that required fields are present
    if (!classId || !teacherId || !frequency) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: classId, teacherId, or frequency",
      });
    }

    // Find the class to verify it exists and the teacher owns it
    const classToUpdate = await Class.findById(classId);

    if (!classToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Optional: Verify teacher has permission (adjust as needed for your schema)
    if (classToUpdate.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to generate frequency for this class",
      });
    }

    // Update the frequency array in the class document
    classToUpdate.frequency = Array.isArray(frequency) ? frequency : [frequency]; 
    classToUpdate.frequencyUpdatedAt = new Date(); // Timestamp the update

    // Save the updated class document
    await classToUpdate.save();
    console.log(`Frequency ${frequency} saved for class ${classId}`);

    // Get student IDs for notification
    const studentIds = classToUpdate.studentList || [];
    const studentCount = studentIds.length;

    // Emit real-time Socket.io event to notify students
    emitToClass(classId, 'attendanceStarted', {
      classId,
      frequency,
      teacherId,
      className: classToUpdate.className,
      timestamp: new Date().toISOString(),
      autoDetect: autoActivate, // Pass the autoActivate flag to students
      message: `Attendance check initiated by teacher for ${classToUpdate.className}`
    });

    return res.status(200).json({
      success: true,
      message: `Frequency generated and broadcast to ${studentCount} students`,
      frequency,
      studentsNotified: studentCount
    });
  } catch (error) {
    console.error("Error generating frequency:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getClassfrequency = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const classDetails = await Class.findById(classId);
    
    if (!classDetails) {
      return next(new AppError("Class not found", 404));
    }

    // Return the frequency array and timestamp
    res.status(200).json({
      success: true,
      frequency: classDetails.frequency || [],
      updatedAt: classDetails.frequencyUpdatedAt || null
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

// Get classes for a teacher
export const getTeacherClasses = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    
    // Verify if the teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return next(new AppError("Invalid Teacher ID or user is not a teacher", 400));
    }
    
    // Find all classes where this teacher is assigned
    // --- Updated .select() --- 
    const classes = await Class.find({ teacherId })
      .populate('studentList', 'fullName email')
      .select('className schedule classCode batch studentList status'); // Replaced time with schedule, added classCode, batch
    
    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

// Get classes for a student
export const getStudentClasses = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    // Verify if the student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return next(new AppError("Invalid Student ID or user is not a student", 400));
    }
    
    // Find the class this student is part of
    // --- Updated .select() --- 
    const classes = await Class.find({ studentList: studentId })
      .populate('teacherId', 'fullName email')
      .select('className schedule classCode batch teacherId'); // Replaced time with schedule, added classCode, batch, teacherId
    
    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

// <<< NEW FUNCTION to get details for a specific class >>>
// I am using this eorute to get the detail fo the class before editing the class details

export const getClassDetails = async (req, res, next) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return next(new AppError("Class ID is required", 400));
    }

    // Find the class by ID and populate studentList and teacherId
    const classDetails = await Class.findById(classId)
      .populate('studentList', 'fullName email _id') // Select fields you need for students
      .populate('teacherId', 'fullName email _id'); // Select fields you need for the teacher

    if (!classDetails) {
      return next(new AppError("Class not found", 404));
    }

    res.status(200).json({
      success: true,
      class: classDetails, // Return the populated class details
    });

  } catch (error) {
    // Handle potential CastError if classId is not a valid ObjectId format
    if (error.name === 'CastError') {
       return next(new AppError(`Invalid Class ID format: `, 400));
    }
    return next(new AppError(error.message, 500));
  }
};

// <<< NEW FUNCTION to save daily attendance >>>
export const saveDailyAttendance = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { date, sessionType, attendanceList, recordedBy, markCompleted = true } = req.body;

    if (!classId || !date || !sessionType || !attendanceList || !recordedBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!['lecture', 'lab'].includes(sessionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session type. Must be 'lecture' or 'lab'",
      });
    }

    // Find the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Convert date string to Date object and normalize to midnight UTC
    const recordDate = new Date(date);
    recordDate.setUTCHours(0, 0, 0, 0);

    // Format the attendance records with required fields
    const formattedAttendance = attendanceList.map(item => ({
      studentId: item.studentId,
      status: item.status,
      recordedBy,
      recordedAt: new Date()
    }));

    // Check if there's already a record for this date
    const existingRecordIndex = classDoc.attendanceRecords.findIndex(
      record => {
        const recordDateObj = new Date(record.date);
        recordDateObj.setUTCHours(0, 0, 0, 0);
        return recordDateObj.getTime() === recordDate.getTime();
      }
    );

    if (existingRecordIndex !== -1) {
      const record = classDoc.attendanceRecords[existingRecordIndex];

      // Convert flat arrays to objects if needed (for compatibility with schema change)
      if (Array.isArray(record.lecture)) {
        record.lecture = { records: record.lecture, active: !markCompleted && sessionType === 'lecture' };
      } else if (!record.lecture) {
        record.lecture = { records: [], active: !markCompleted && sessionType === 'lecture' };
      }

      if (Array.isArray(record.lab)) {
        record.lab = { records: record.lab, active: !markCompleted && sessionType === 'lab' };
      } else if (!record.lab) {
        record.lab = { records: [], active: !markCompleted && sessionType === 'lab' };
      }
      
      // Check if this session type already has records
      if (record[sessionType].records && record[sessionType].records.length > 0) {
        // Return the existing records so client can display them
        const existingAttendance = record;
        
        // Populate student details for UI display
        const populatedRecords = await Class.populate(classDoc, {
          path: `attendanceRecords.${sessionType}.records.studentId`,
          select: 'firstName lastName email',
        });
        
        return res.status(200).json({
          success: true,
          alreadyRecorded: true,
          message: `${sessionType} attendance has already been recorded for this date`,
          data: {
            date: existingAttendance.date,
            sessionType,
            attendanceRecords: populatedRecords.attendanceRecords[existingRecordIndex][sessionType].records
          }
        });
      }
      
      // If we reach here, this session type hasn't been recorded yet for today
      record[sessionType].records = formattedAttendance;
      
      // Set active status based on markCompleted flag for this specific session type
      if (markCompleted) {
        record[sessionType].active = false;
        console.log(`Marking ${sessionType} session for ${date} as inactive (completed)`);
      }
      
    } else {
      // Create a new record for this date with the session-specific active flag
      const newAttendanceRecord = {
        date: recordDate,
        lecture: { 
          records: sessionType === 'lecture' ? formattedAttendance : [],
          active: sessionType === 'lecture' ? !markCompleted : true
        },
        lab: { 
          records: sessionType === 'lab' ? formattedAttendance : [],
          active: sessionType === 'lab' ? !markCompleted : true
        }
      };
      
      classDoc.attendanceRecords.push(newAttendanceRecord);
    }

    await classDoc.save();

    // Emit attendance ended event when we save and complete a session
    if (markCompleted) {
      emitToClass(classId, 'attendanceEnded', {
        classId,
        sessionType,
        message: `Attendance for ${sessionType} has ended`,
        timestamp: new Date().toISOString(),
        priority: 'high' // Mark as high priority
      });
    }

    return res.status(200).json({
        success: true,
      message: "Attendance saved successfully",
      active: !markCompleted // Return the current active state
    });
  } catch (error) {
    next(error);
  }
};

// --- NEW THUNK for student marking >>>
export const markStudentPresentByFrequency = asyncHandler(async (req, res) => {
  console.log("markStudentPresentByFrequency",req.body);
  const { classId, studentId, detectedFrequency, sessionType: requestedSessionType } = req.body;

  // Input validation
  if (!classId || !studentId || !detectedFrequency || !requestedSessionType) {
    return res.status(400).json({ message: 'All fields required' });
  }

  try {
    // Find the class document
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if the frequency matches
    const frequencyThreshold = 10;
    const storedFrequency = Array.isArray(classDoc.frequency) && classDoc.frequency.length > 0 
      ? classDoc.frequency[0] 
      : null;
    
    if (!storedFrequency || Math.abs(storedFrequency - detectedFrequency) > frequencyThreshold) {
      return res.status(400).json({
        message: 'Frequency does not match',
        expected: storedFrequency,
        detected: detectedFrequency
      });
    }

    // Verify student is enrolled in the class
    const enrolledStudent = classDoc.studentList.find(s => s.toString() === studentId);
    if (!enrolledStudent) {
      return res.status(403).json({ message: 'Student not enrolled in this class' });
    }

    // Find student details for the notification
    const student = await User.findById(studentId).select('fullName');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Find today's attendance record
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0); // Normalize date to midnight UTC

    // Find if there's an attendance record for today
    let attendanceRecord = classDoc.attendanceRecords.find(
      record => new Date(record.date).toISOString().split('T')[0] === todayDate.toISOString().split('T')[0]
    );

    // If no attendance record exists, or session type isn't specified, return an error
    if (!attendanceRecord) {
      return res.status(400).json({ message: 'No attendance session found for today' });
    }

    // Convert flat arrays to objects if needed (for compatibility with schema change)
    if (Array.isArray(attendanceRecord.lecture)) {
      attendanceRecord.lecture = { records: attendanceRecord.lecture, active: true };
    } else if (!attendanceRecord.lecture) {
      attendanceRecord.lecture = { records: [], active: false };
    }

    if (Array.isArray(attendanceRecord.lab)) {
      attendanceRecord.lab = { records: attendanceRecord.lab, active: true };
    } else if (!attendanceRecord.lab) {
      attendanceRecord.lab = { records: [], active: false };
    }

    // Determine which session type to use - look for the one that's active
    let sessionType = null;
    if (requestedSessionType && ['lecture', 'lab'].includes(requestedSessionType)) {
      // If a specific type is requested, use that if it's active
      if (attendanceRecord[requestedSessionType].active) {
        sessionType = requestedSessionType;
      } else {
        return res.status(400).json({ 
          message: `The ${requestedSessionType} session is not currently active`
        });
      }
    } else {
      // If no session type specified, look for any active session
      if (attendanceRecord.lecture.active) {
        sessionType = 'lecture';
      } else if (attendanceRecord.lab.active) {
        sessionType = 'lab';
      } else {
        return res.status(400).json({ message: 'No active attendance session found' });
      }
    }

    console.log(`Using session type: ${sessionType} for attendance marking`);
    
    // Create the student attendance object with the required fields
    const studentAttendance = {
                studentId: studentId,
                status: 'present',
                recordedBy: classDoc.teacherId, // Teacher ID as the recorder
                recordedAt: new Date()
            };

    // Check if this student already has an attendance record for this session
    const existingRecordIndex = attendanceRecord[sessionType].records.findIndex(
      record => record.studentId.toString() === studentId
    );

    if (existingRecordIndex === -1) {
      // Add the new record to the existing session array
      attendanceRecord[sessionType].records.push(studentAttendance);

      await classDoc.save();

      // Emit to the class for real-time updates
      emitToClass(classId, 'attendanceUpdate', {
        classId,
        studentId,
        studentName: student.fullName,
        status: 'present',
        sessionType: sessionType,
        timestamp: new Date().toISOString(),
        priority: 'high' // Mark as important
      });

      res.status(200).json({ 
        message: 'Attendance marked successfully',
        sessionType: sessionType 
      });
    } else {
      // Student already marked
      res.status(200).json({
        message: 'Attendance already recorded for this student',
        sessionType: sessionType
      });
    }
  } catch (error) {
    console.error('Error marking attendance by frequency:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new function to start an attendance session
export const  startAttendanceSession = asyncHandler(async (req, res) => {
  const { classId, sessionType } = req.body;
  const teacherId = req.user?.id;

  // Validate inputs
  if (!classId || !sessionType || !['lecture', 'lab'].includes(sessionType)) {
    return res.status(400).json({ 
      success: false,
      message: 'Class ID and valid session type (lecture or lab) are required' 
    });
  }

  try {
    // Find the class
    const classDoc = await Class.findById(classId);
    console.log("Class Doc:", classDoc);
    if (!classDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Class not found' 
      });
    }

    // Verify teacher has permission
    if (classDoc.teacherId.toString() !== teacherId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to manage attendance for this class' 
      });
    }

    // Check if there's already an attendance record for today with this session type
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let todayRecord = classDoc.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setUTCHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

    // Check if session is already recorded and has students marked
    if (todayRecord && 
        todayRecord[sessionType] && 
        todayRecord[sessionType].records && 
        todayRecord[sessionType].records.length > 0) {
      
      // If there are already records, just reactivate the session
      todayRecord[sessionType].active = true;
      await classDoc.save();
      
      return res.status(200).json({ 
        success: true, 
        message: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} attendance session reactivated`,
        sessionData: {
          sessionType,
          startedAt: new Date().toISOString(),
          hasExistingRecords: true
        }
      });
    }

    // Handle cases where the record exists but no specific session or convert flat arrays
    if (todayRecord) {
      // Handle cases where the schema was recently updated
      if (Array.isArray(todayRecord.lecture)) {
        todayRecord.lecture = { 
          records: todayRecord.lecture,
          active: sessionType === 'lecture'
        };
      } else if (!todayRecord.lecture) {
        todayRecord.lecture = { records: [], active: sessionType === 'lecture' };
      } else {
        // Just update the active flag
        todayRecord.lecture.active = sessionType === 'lecture';
      }

      if (Array.isArray(todayRecord.lab)) {
        todayRecord.lab = { 
          records: todayRecord.lab,
          active: sessionType === 'lab'
        };
      } else if (!todayRecord.lab) {
        todayRecord.lab = { records: [], active: sessionType === 'lab' };
      } else {
        // Just update the active flag
        todayRecord.lab.active = sessionType === 'lab';
      }
    } else {
      // Create a new attendance record for today with the specific session active
      todayRecord = {
        date: today,
        lecture: { 
          records: [],
          active: sessionType === 'lecture'
        },
        lab: { 
          records: [],
          active: sessionType === 'lab'
        }
      };
      classDoc.attendanceRecords.push(todayRecord);
    }

    await classDoc.save();

    // Emit to all students that attendance has started - with important session type info
    emitToClass(classId, 'attendanceStarted', {
      classId,
      sessionType,
      teacherId,
      message: `Attendance for ${sessionType} has started`,
      timestamp: new Date().toISOString(),
      priority: 'high' // Mark this as high priority
    });

    return res.status(200).json({
            success: true,
            message: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} attendance session started`,
            sessionData: {
            sessionType,
            startedAt: new Date().toISOString()
      }
        });

    } catch (error) {
    console.error('Error starting attendance session:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add a function to end an attendance session
export const endAttendanceSession = asyncHandler(async (req, res) => {
  const { classId, sessionType } = req.body;
  const teacherId = req.user?.id;

  // Validate inputs
  if (!classId || !sessionType || !['lecture', 'lab'].includes(sessionType)) {
    return res.status(400).json({ 
      success: false,
      message: 'Class ID and session type are required' 
    });
  }

  try {
    // Find the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Class not found' 
      });
    }

    // Verify teacher has permission
    if (classDoc.teacherId.toString() !== teacherId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to manage attendance for this class' 
      });
    }

    // Check if there's an active session of the specified type
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let todayRecord = classDoc.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setUTCHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

    if (!todayRecord || !todayRecord[sessionType] || !todayRecord[sessionType].active) {
      return res.status(400).json({ 
        success: false, 
        message: `No active ${sessionType} attendance session found for today` 
      });
    }

    // Mark the session as inactive
    todayRecord[sessionType].active = false;
    await classDoc.save();

    // Emit to all students that attendance has ended
    emitToClass(classId, 'attendanceEnded', {
      classId,
      sessionType,
      message: `Attendance for ${sessionType} has ended`,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} attendance session ended`,
      sessionData: {
        sessionType,
        endedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error ending attendance session:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// <<< UPDATED FUNCTION to edit class details >>>
export const editClassDetails = async (req, res, next) => {
    try {
        console.log("Editing class details - Req Params:", req.params); // Added for testing
        console.log("Editing class details - Req Body:", req.body); // Added for testing
        const { classId } = req.params;
        // --- Updated fields allowed for update --- 
        const { className, schedule, batch,status } = req.body;
        const userId = req.user?.id; // ID of user making the request

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return next(new AppError("Invalid Class ID format", 400));
        }
        if (!userId) {
            return next(new AppError("Authentication required", 401));
        }

        // Find the class
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return next(new AppError("Class not found", 404));
        }

        // --- Authorization: Check if the authenticated user is the teacher of this class ---
        if (classDoc.teacherId.toString() !== userId) {
            return next(new AppError("You are not authorized to edit this class", 403));
        }

        // Build the update object with only the fields provided
        const updates = {};
        if (className !== undefined) updates.className = className; // Allow empty string if intended
        if (schedule !== undefined) updates.schedule = schedule;  
        if (batch !== undefined) updates.batch = batch;
        if (status !== undefined) updates.status = status;
        // Removed: classType, time, status
        // Excluded: classCode, teacherId, createdBy, studentList (manage students separately)

        if (Object.keys(updates).length === 0) {
            return next(new AppError("No valid fields provided for update", 400));
        }

        // Perform the update
        const updatedClass = await Class.findByIdAndUpdate(classId, { $set: updates }, { new: true, runValidators: true });

        if (!updatedClass) {
             // Should not happen if findById found it, but good practice
             return next(new AppError("Failed to update class", 500));
        }

        res.status(200).json({
            success: true,
            message: "Class details updated successfully",
            class: updatedClass,
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            return next(new AppError(error.message, 400));
        }
        console.error("Error editing class:", error); // Log error
        next(new AppError(error.message || "Failed to update class details", 500));
    }
};

/**
 * @desc    Get schedule for all classes taught by the logged-in teacher
 * @route   GET /api/classes/my-schedule
 * @access  Private (Teacher)
 */
export const getTeacherSchedule = async (req, res, next) => {
   try {
     // req.user should be populated by authentication middleware (e.g., verifyJWT)
     const teacherId = req.user?.id;
     console.log("Teacher ID:", teacherId);
 
     // --- Enhanced Authentication Check ---
     // Ensure the user object and ID are present from the token verification middleware
     if (!teacherId) {
         console.warn("[getTeacherSchedule] Unauthorized: No teacher ID found in req.user.");
         // Use next() to pass the error to the central error handler
         return next(new AppError('Not authorized, user ID not found in token', 401));
     }
 
     console.log(`[getTeacherSchedule] Fetching schedule for teacherId: ${teacherId}`);
 
     // --- Database Query ---
     // No try...catch needed here because asyncHandler wraps it
     const classes = await Class.find({ teacherId: teacherId })
                                .select('className schedule status') // Select only needed fields
                                .sort({ createdAt: -1 }) // Optional: Sort by creation date or className
                                .lean(); // Use .lean() for plain JS objects
 
     // --- Response ---
     // find() returns an empty array [] if no documents match, not null/undefined.
     // It's standard REST practice to return 200 OK with an empty array in this case.
     // No need for a specific 'not found' error here unless explicitly desired.
     console.log(`[getTeacherSchedule] Found ${classes.length} classes for teacher ${teacherId}.`);
 
     res.status(200).json({
         success: true, // Add success flag for consistency
         count: classes.length,
         data: classes || [], // Ensure we always return an array, even if classes is null/undefined
     });
   } catch (error) {
    
    console.error("Error fetching teacher schedule:", error);
    next(new AppError(error.message || "Failed to fetch teacher schedule", 500));
   }
};

// Get attendance records for a specific date and session type
export const getAttendanceByDateAndType = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { date, sessionType } = req.query;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return next(new AppError("Invalid Class ID format", 400));
    }
    
    if (!date || !sessionType || !['lecture', 'lab'].includes(sessionType)) {
      return next(new AppError("Date and valid session type (lecture/lab) are required", 400));
    }

    // Convert date string to Date object and normalize to midnight UTC
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return next(new AppError("Invalid date format", 400));
    }
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Find the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return next(new AppError("Class not found", 404));
    }

    // Find the attendance record for this date
    const attendanceRecord = classDoc.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setUTCHours(0, 0, 0, 0);
      return recordDate.getTime() === attendanceDate.getTime();
    });

    if (!attendanceRecord) {
      return res.status(200).json({
        success: true,
        message: "No attendance records found for this date",
        data: { date: attendanceDate, sessionType, attendanceRecords: [] }
      });
    }

    // Populate student details
    await Class.populate(attendanceRecord, {
      path: `${sessionType}.studentId`,
      select: 'fullName email'
    });

    // Return the specific session type attendance
    return res.status(200).json({
      success: true,
      message: `Attendance records for ${sessionType} on ${attendanceDate.toISOString().split('T')[0]}`,
      data: {
        date: attendanceRecord.date,
        sessionType,
        attendanceRecords: attendanceRecord[sessionType] || []
      }
    });

  } catch (error) {
    return next(new AppError(error.message || "Failed to fetch attendance records", 500));
  }
};

// Socket handler for fetching attendance - can be used in socket middleware
export const fetchAttendanceForSocket = async (classId, date, sessionType) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new Error("Invalid Class ID format");
    }
    
    if (!date || !sessionType || !['lecture', 'lab'].includes(sessionType)) {
      throw new Error("Date and valid session type (lecture/lab) are required");
    }

    // Convert date string to Date object and normalize to midnight UTC
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      throw new Error("Invalid date format");
    }
    attendanceDate.setUTCHours(0, 0, 0, 0);

    // Find the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new Error("Class not found");
    }

    // Find the attendance record for this date
    const attendanceRecord = classDoc.attendanceRecords.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setUTCHours(0, 0, 0, 0);
      return recordDate.getTime() === attendanceDate.getTime();
    });

    if (!attendanceRecord) {
      return {
        success: true,
        message: "No attendance records found for this date",
        data: { date: attendanceDate, sessionType, attendanceRecords: [] }
      };
    }

    // Return the specific session type attendance
    return {
      success: true,
      message: `Attendance records for ${sessionType} on ${attendanceDate.toISOString().split('T')[0]}`,
      data: {
        date: attendanceRecord.date,
        sessionType,
        attendanceRecords: attendanceRecord[sessionType] || []
      }
    };

  } catch (error) {
    throw new Error(error.message || "Failed to fetch attendance records");
    }
};

// Get ongoing attendance data for a specific class and session type
export const getOngoingAttendance = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { sessionType } = req.query; // 'lecture' or 'lab'
    
    if (!classId) {
      return next(new AppError("Class ID is required", 400));
    }
    
    // Find the class
    const classDetails = await Class.findById(classId)
      .populate({
        path: 'studentList',
        select: 'fullName email _id'
      });
    
    if (!classDetails) {
      return next(new AppError("Class not found", 404));
    }
    
    // Default to lecture if no session type specified
    const targetSessionType = sessionType || 'lecture';
    
    // Check if there's a record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    
    // Find today's attendance record
    const todayRecord = classDetails.attendanceRecords?.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    
    // Determine if the specified session is active
    const hasActiveSession = todayRecord ? 
      (todayRecord[targetSessionType] && todayRecord[targetSessionType].active) : false;
    
    // Get the active session type (lecture or lab)
    let activeSessionType = null;
    if (todayRecord) {
      if (todayRecord.lecture && todayRecord.lecture.active) {
        activeSessionType = 'lecture';
      } else if (todayRecord.lab && todayRecord.lab.active) {
        activeSessionType = 'lab';
      }
    }
    
    // Use the active session type if no specific type was requested
    const finalSessionType = sessionType || activeSessionType || 'lecture';
    
    // Initialize response structure
    let attendanceData = {
      classId,
      className: classDetails.className,
      sessionType: finalSessionType,
      date: today,
      hasActiveSession: hasActiveSession,
      activeSessionType: activeSessionType,
      studentsCount: classDetails.studentList?.length || 0,
      records: []
    };
    
    // If there's a record for today with the target session type
    if (todayRecord) {
      const sessionData = todayRecord[finalSessionType];
      
      if (sessionData && sessionData.records && sessionData.records.length > 0) {
        // Format the attendance records for the response
        attendanceData.records = sessionData.records.map(record => {
          const studentId = typeof record.studentId === 'object' ? record.studentId._id : record.studentId;
          const student = classDetails.studentList.find(s => s._id.toString() === studentId.toString());
          
          return {
            studentId,
            studentName: student?.fullName || 'Unknown Student',
            status: record.status,
            recordedAt: record.recordedAt
          };
        });
        
        // Add attendance statistics
        const presentCount = attendanceData.records.filter(r => r.status === 'present').length;
        const absentCount = attendanceData.records.filter(r => r.status === 'absent').length;
        
        attendanceData.stats = {
          present: presentCount,
          absent: absentCount,
          total: presentCount + absentCount
        };
        
        attendanceData.isActive = sessionData.active || false;
      }
    }
    
    // Return attendance data
    res.status(200).json({
      success: true,
      data: attendanceData
    });
    
  } catch (error) {
    console.error("Error fetching ongoing attendance:", error);
    return next(new AppError(error.message || "Failed to fetch attendance data", 500));
    }
};