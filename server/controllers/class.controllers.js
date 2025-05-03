import AppError from "../utils/error.utils.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import { emitToClass } from '../config/socket.js';
import expressAsyncHandler from 'express-async-handler';
const asyncHandler = expressAsyncHandler;

// Helper function to generate random passcode
const generateClassPasscode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let passcode = '';
    for (let i = 0; i < 8; i++) {
        passcode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return passcode;
};

// Create a class by a teacher and for now it is using the student list and selecting that student 
// TODO: make the use of class code to join and get the resources.
export const registerClass = async (req, res, next) => {
    try {
        console.log("Received class data:", req.body);
        console.log("User:", req.user);
        const { className, schedule, classCode, batch } = req.body;
        const createdBy = req.user?.id;

        // Validate required fields
        if (!className || !schedule || !classCode || !batch || !createdBy) {
            return next(new AppError("ClassName, Schedule, ClassCode, Batch, and Creator ID are required", 400));
        }

        // Verify if the creator exists and is a teacher
        const teacher = await User.findById(createdBy);
        if (!teacher || teacher.role !== "teacher") {
            return next(new AppError("Invalid Creator ID or user is not a teacher", 400));
        }

        // Generate a unique class passcode
        let classPasscode;
        let isUnique = false;
        while (!isUnique) {
            classPasscode = generateClassPasscode();
            const existingClass = await Class.findOne({ classPasscode });
            if (!existingClass) {
                isUnique = true;
            }
        }

        // Create the new class with the generated passcode
        const newClass = await Class.create({
            className,
            schedule,
            classCode,
            batch,
            teacherId: createdBy,
            createdBy,
            classPasscode,
            studentList: [], // Initialize with empty array
            frequency: [],
            attendanceRecords: []
        });

        res.status(201).json({
            success: true,
            message: "Class registered successfully",
            data: newClass,
        });
    } catch (error) {
        // Handle potential duplicate key error for classCode
        if (error.code === 11000 && error.keyPattern?.classCode) {
            return next(new AppError(`Class code '${error.keyValue.classCode}' already exists.`, 409));
        }
        if (error.name === 'ValidationError') {
            return next(new AppError(error.message, 400));
        }
        console.error("Error registering class:", error);
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
        record.lecture = { records: record.lecture, active: 'completed' };
      } else if (!record.lecture) {
        record.lecture = { records: [], active: 'completed' };
      }

      if (Array.isArray(record.lab)) {
        record.lab = { records: record.lab, active: 'completed' };
      } else if (!record.lab) {
        record.lab = { records: [], active: 'completed' };
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
        record[sessionType].active = 'completed';
        console.log(`Marking ${sessionType} session for ${date} as completed`);
      }
      
    } else {
      // Do NOT create a new record here!
      return res.status(400).json({
        success: false,
        message: "No attendance session started for today. Please start attendance via the app first."
      });
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
      attendanceRecord.lecture = { records: attendanceRecord.lecture, active: 'active' };
    } else if (!attendanceRecord.lecture) {
      attendanceRecord.lecture = { records: [], active: 'completed' };
    }

    if (Array.isArray(attendanceRecord.lab)) {
      attendanceRecord.lab = { records: attendanceRecord.lab, active: 'active' };
    } else if (!attendanceRecord.lab) {
      attendanceRecord.lab = { records: [], active: 'completed' };
    }

    // Determine which session type to use - look for the one that's active
    let sessionType = null;
    if (requestedSessionType && ['lecture', 'lab'].includes(requestedSessionType)) {
      // If a specific type is requested, use that if it's active
      if (attendanceRecord[requestedSessionType].active === 'active') {
        sessionType = requestedSessionType;
      } else {
        return res.status(400).json({ 
          message: `The ${requestedSessionType} session is not currently active`
        });
      }
    } else {
      // If no session type specified, look for any active session
      if (attendanceRecord.lecture.active === 'active') {
        sessionType = 'lecture';
      } else if (attendanceRecord.lab.active === 'active') {
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
      todayRecord[sessionType].active = 'active';
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
          active: sessionType === 'lecture' ? 'active' : 'completed'
        };
      } else if (!todayRecord.lecture) {
        todayRecord.lecture = { records: [], active: sessionType === 'lecture' ? 'active' : 'completed' };
      } else {
        // Just update the active flag
        todayRecord.lecture.active = sessionType === 'lecture' ? 'active' : 'completed';
      }

      if (Array.isArray(todayRecord.lab)) {
        todayRecord.lab = { 
          records: todayRecord.lab,
          active: sessionType === 'lab' ? 'active' : 'completed'
        };
      } else if (!todayRecord.lab) {
        todayRecord.lab = { records: [], active: sessionType === 'lab' ? 'active' : 'completed' };
      } else {
        // Just update the active flag
        todayRecord.lab.active = sessionType === 'lab' ? 'active' : 'completed';
      }
    } else {
      // Create a new attendance record for today with the specific session active
      todayRecord = {
        date: today,
        lecture: { 
          records: [],
          active: sessionType === 'lecture' ? 'active' : 'completed'
        },
        lab: { 
          records: [],
          active: sessionType === 'lab' ? 'active' : 'completed'
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
    todayRecord[sessionType].active = 'completed';
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
    const { sessionType } = req.query;

    if (!classId) {
      return next(new AppError("Class ID is required", 400));
    }

    // Find the class with populated student list
    const classDetails = await Class.findById(classId)
      .populate('studentList', 'fullName email')
      .lean();

    if (!classDetails) {
      return next(new AppError("Class not found", 404));
    }

    // Get today's date in UTC
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Log all attendanceRecords for debugging
    if (classDetails.attendanceRecords && classDetails.attendanceRecords.length > 0) {
      console.log(`[getOngoingAttendance] attendanceRecords count: ${classDetails.attendanceRecords.length}`);
      classDetails.attendanceRecords.forEach((record, idx) => {
        const recordDate = new Date(record.date);
        const recordDateUTC = new Date(Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate()));
        console.log(`[getOngoingAttendance] Record #${idx} raw date:`, record.date, typeof record.date);
        console.log(`[getOngoingAttendance] Record #${idx} UTC normalized date:`, recordDateUTC, recordDateUTC.getTime());
        console.log(`[getOngoingAttendance] Compare recordDateUTC.getTime() === todayUTC.getTime():`, recordDateUTC.getTime() === todayUTC.getTime());
      });
    } else {
      console.log("[getOngoingAttendance] No attendanceRecords found.");
    }

    // Find today's attendance record (using UTC normalization)
    const todayRecord = classDetails.attendanceRecords?.find(record => {
      const recordDate = new Date(record.date);
      const recordDateUTC = new Date(Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate()));
      return recordDateUTC.getTime() === todayUTC.getTime();
    });

    // Determine if the specified session is active
    const hasActiveSession = todayRecord ? 
      (todayRecord[sessionType] && todayRecord[sessionType].active === 'active') : false;

    // Get the active session type (lecture or lab)
    let activeSessionType = null;
    if (todayRecord) {
      if (todayRecord.lecture && todayRecord.lecture.active === 'active') {
        activeSessionType = 'lecture';
      } else if (todayRecord.lab && todayRecord.lab.active === 'active') {
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
      date: todayUTC,
      hasActiveSession: hasActiveSession,
      activeSessionType: activeSessionType,
      studentsCount: classDetails.studentList?.length || 0,
      records: []
    };

    // If there's a record for today with the target session type
    if (todayRecord && todayRecord[finalSessionType]) {
      const sessionData = todayRecord[finalSessionType];
      console.log(`[getOngoingAttendance] Session data for ${finalSessionType}:`, sessionData);

      if (sessionData.records && sessionData.records.length > 0) {
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
        attendanceData.isActive = sessionData.active === 'active';
      } else {
        // No records for this session today, return all absent
        attendanceData.records = classDetails.studentList.map(student => ({
          studentId: student._id,
          studentName: student.fullName,
          status: 'absent',
          recordedAt: null
        }));
        attendanceData.stats = {
          present: 0,
          absent: attendanceData.records.length,
          total: attendanceData.records.length
        };
        attendanceData.isActive = sessionData.active === 'active';
      }
    } else {
      // No record for today, return all absent
      attendanceData.records = classDetails.studentList.map(student => ({
        studentId: student._id,
        studentName: student.fullName,
        status: 'absent',
        recordedAt: null
      }));
      attendanceData.stats = {
        present: 0,
        absent: attendanceData.records.length,
        total: attendanceData.records.length
      };
      attendanceData.isActive = false;
    }

    return res.status(200).json({
      success: true,
      data: attendanceData
    });
  } catch (error) {
    console.error('Error in getOngoingAttendance:', error);
    return next(new AppError(error.message || 'Failed to fetch ongoing attendance', 500));
  }
};

// Get total attendance for a student across all classes
export const getStudentTotalAttendance = asyncHandler(async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find all classes where this student is enrolled
    const classes = await Class.find({ 
      studentList: studentId,
      status: { $ne: 'ended' } // Only consider active and inactive classes
    });

    // Initialize response data structure
    const attendanceData = {
      totalClasses: classes.length,
      classesAttendance: [],
      overallStats: {
        totalLectures: 0,
        totalLabs: 0,
        presentLectures: 0,
        presentLabs: 0,
        attendancePercentage: 0
      }
    };

    // Process each class
    for (const classObj of classes) {
      const classAttendance = {
        classId: classObj._id,
        className: classObj.className,
        classCode: classObj.classCode,
        lectures: {
          total: 0,
          present: 0,
          percentage: 0
        },
        labs: {
          total: 0,
          present: 0,
          percentage: 0
        }
      };

      // Process attendance records for this class
      classObj.attendanceRecords.forEach(record => {
        // Process lecture attendance
        if (record.lecture && record.lecture.records) {
          classAttendance.lectures.total++;
          attendanceData.overallStats.totalLectures++;
          
          const studentRecord = record.lecture.records.find(r => 
            r.studentId.toString() === studentId && r.status === 'present'
          );
          
          if (studentRecord) {
            classAttendance.lectures.present++;
            attendanceData.overallStats.presentLectures++;
          }
        }

        // Process lab attendance
        if (record.lab && record.lab.records) {
          classAttendance.labs.total++;
          attendanceData.overallStats.totalLabs++;
          
          const studentRecord = record.lab.records.find(r => 
            r.studentId.toString() === studentId && r.status === 'present'
          );
          
          if (studentRecord) {
            classAttendance.labs.present++;
            attendanceData.overallStats.presentLabs++;
          }
        }
      });

      // Calculate percentages for this class
      if (classAttendance.lectures.total > 0) {
        classAttendance.lectures.percentage = (classAttendance.lectures.present / classAttendance.lectures.total) * 100;
      }
      if (classAttendance.labs.total > 0) {
        classAttendance.labs.percentage = (classAttendance.labs.present / classAttendance.labs.total) * 100;
      }

      attendanceData.classesAttendance.push(classAttendance);
    }

    // Calculate overall attendance percentage
    const totalSessions = attendanceData.overallStats.totalLectures + attendanceData.overallStats.totalLabs;
    const totalPresent = attendanceData.overallStats.presentLectures + attendanceData.overallStats.presentLabs;
    
    if (totalSessions > 0) {
      attendanceData.overallStats.attendancePercentage = (totalPresent / totalSessions) * 100;
    }

    res.status(200).json({
      success: true,
      data: attendanceData
    });

  } catch (error) {
    console.error('Error fetching total attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data',
      error: error.message
    });
  }
});

export const joinClass = async (req, res, next) => {
  try {
    const { classPasscode, studentId } = req.body;
    console.log("=== JOIN CLASS CONTROLLER START ===");
    console.log("Request Body:", {
      classPasscode,
      studentId
    });

    // Find the class with the given passcode
    const classToJoin = await Class.findOne({ classPasscode });
    console.log("Class Search Result:", classToJoin ? {
      _id: classToJoin._id,
      className: classToJoin.className,
      studentList: classToJoin.studentList.length
    } : "No class found");

    if (!classToJoin) {
      console.log("Error: Invalid class passcode");
      return res.status(404).json({
        success: false,
        message: "Invalid class passcode",
      });
    }

    // Check if student is already in the class
    const isStudentEnrolled = classToJoin.studentList.includes(studentId);
    console.log("Student Enrollment Check:", {
      studentId,
      isAlreadyEnrolled: isStudentEnrolled
    });

    if (isStudentEnrolled) {
      console.log("Error: Student already enrolled");
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this class",
      });
    }

    // Add student to the class
    classToJoin.studentList.push(studentId);
    const savedClass = await classToJoin.save();
    console.log("Updated Class:", {
      _id: savedClass._id,
      newStudentCount: savedClass.studentList.length,
      lastAddedStudent: studentId
    });

    // Add class to student's classId array
    const updatedStudent = await User.findByIdAndUpdate(
      studentId,
      { $addToSet: { classId: classToJoin._id } },
      { new: true }
    );
    console.log("Updated Student:", {
      _id: updatedStudent._id,
      classCount: updatedStudent.classId.length,
      lastAddedClass: classToJoin._id
    });

    console.log("=== JOIN CLASS CONTROLLER SUCCESS ===");
    res.status(200).json({
      success: true,
      message: "Successfully joined the class",
      data: classToJoin,
    });
  } catch (error) {
    console.log("=== JOIN CLASS CONTROLLER ERROR ===");
    console.error("Error Details:", {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to join class",
    });
  }
};

/**
 * @desc    Get all teachers with their classes for a specific school code
 * @route   GET /api/users/teachers/school/:schoolCode
 * @access  Private
 */
export const getTeachersBySchoolCode = asyncHandler(async (req, res) => {
  try {
    const { schoolCode } = req.params;
    console.log("schoolCode",schoolCode);
    
    // Validate school code
    if (!schoolCode) {
      return next(new AppError("School code is required", 400));
    }

    // Find all active teachers with the same school code
    const teachers = await User.find({ 
      role: 'teacher',
      schoolCode: schoolCode,
    }).select('fullName email _id');
    console.log("teachers",teachers);

    if (!teachers || teachers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No teachers found for this school code",
        data: []
      });
    }

    // For each teacher, populate their active classes
    const teachersWithClasses = await Promise.all(
      teachers.map(async (teacher) => {
        const classes = await Class.find({ 
          teacherId: teacher._id,
          status: 'active'
        }).select('className classCode batch schedule');
        console.log("classes",classes);
        return {
          teacherId: teacher._id,
          fullName: teacher.fullName,
          email: teacher.email,
          classes
        };
      })
    );

    res.status(200).json({
      success: true,
      count: teachersWithClasses.length,
      data: teachersWithClasses
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return next(new AppError(error.message || "Failed to fetch teachers", 500));
  }
});

/**
 * @desc    Get attendance statistics for a specific class
 * @route   GET /api/classes/:classId/attendance-stats
 * @access  Private (Teacher)
 */
export const getClassAttendanceStats = asyncHandler(async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user?.id;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Class ID format"
      });
    }

    // Find the class and verify teacher ownership
    const classDoc = await Class.findById(classId)
      .populate('studentList', 'fullName email _id')
      .populate('teacherId', 'fullName email');

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Verify teacher has permission
    if (classDoc.teacherId.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view statistics for this class"
      });
    }

    // Initialize statistics
    const stats = {
      // Basic Class Information
      classInfo: {
        className: classDoc.className,
        classCode: classDoc.classCode,
        batch: classDoc.batch,
        status: classDoc.status,
        teacherName: classDoc.teacherId.fullName,
        schedule: classDoc.schedule
      },

      // Student Statistics
      studentStats: {
        totalStudents: classDoc.studentList.length,
        activeStudents: 0,
        newStudents: 0,
        studentList: classDoc.studentList.map(student => ({
          id: student._id,
          name: student.fullName,
          email: student.email
        }))
      },

      // Attendance Overview
      attendanceOverview: {
        totalLectures: 0,
        totalLabs: 0,
        totalSessions: 0,
        overallAttendance: {
          lectures: { present: 0, total: 0, percentage: 0 },
          labs: { present: 0, total: 0, percentage: 0 },
          combined: { present: 0, total: 0, percentage: 0 }
        },
        recentAttendance: {
          last7Days: { present: 0, total: 0, percentage: 0 },
          last30Days: { present: 0, total: 0, percentage: 0 }
        }
      },

      // Performance Metrics
      performanceMetrics: {
        averageAttendance: 0,
        attendanceTrend: [],
        topPerformingStudents: [],
        studentsNeedingAttention: []
      },

      // Schedule Analysis
      scheduleAnalysis: {
        totalScheduledSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        sessionDistribution: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0
        }
      },

      // Detailed Records
      attendanceRecords: [],
      studentAttendanceDetails: []
    };

    // Process schedule analysis
    classDoc.schedule.forEach(slot => {
      stats.scheduleAnalysis.sessionDistribution[slot.day.toLowerCase()]++;
      stats.scheduleAnalysis.totalScheduledSessions += slot.timing.length;
    });

    // Process each attendance record
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    classDoc.attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date);
      const dateStr = recordDate.toISOString().split('T')[0];
      
      // Process lecture attendance
      if (record.lecture && record.lecture.records) {
        stats.attendanceOverview.totalLectures++;
        const presentCount = record.lecture.records.filter(r => r.status === 'present').length;
        stats.attendanceOverview.overallAttendance.lectures.present += presentCount;
        stats.attendanceOverview.overallAttendance.lectures.total += record.lecture.records.length;
        
        // Check if within last 7 or 30 days
        if (recordDate >= sevenDaysAgo) {
          stats.attendanceOverview.recentAttendance.last7Days.present += presentCount;
          stats.attendanceOverview.recentAttendance.last7Days.total += record.lecture.records.length;
        }
        if (recordDate >= thirtyDaysAgo) {
          stats.attendanceOverview.recentAttendance.last30Days.present += presentCount;
          stats.attendanceOverview.recentAttendance.last30Days.total += record.lecture.records.length;
        }
      }

      // Process lab attendance
      if (record.lab && record.lab.records) {
        stats.attendanceOverview.totalLabs++;
        const presentCount = record.lab.records.filter(r => r.status === 'present').length;
        stats.attendanceOverview.overallAttendance.labs.present += presentCount;
        stats.attendanceOverview.overallAttendance.labs.total += record.lab.records.length;
        
        // Check if within last 7 or 30 days
        if (recordDate >= sevenDaysAgo) {
          stats.attendanceOverview.recentAttendance.last7Days.present += presentCount;
          stats.attendanceOverview.recentAttendance.last7Days.total += record.lab.records.length;
        }
        if (recordDate >= thirtyDaysAgo) {
          stats.attendanceOverview.recentAttendance.last30Days.present += presentCount;
          stats.attendanceOverview.recentAttendance.last30Days.total += record.lab.records.length;
        }
      }

      // Add to attendance records
      stats.attendanceRecords.push({
        date: dateStr,
        lecture: record.lecture ? {
          total: record.lecture.records.length,
          present: record.lecture.records.filter(r => r.status === 'present').length,
          active: record.lecture.active
        } : null,
        lab: record.lab ? {
          total: record.lab.records.length,
          present: record.lab.records.filter(r => r.status === 'present').length,
          active: record.lab.active
        } : null
      });
    });

    // Calculate total sessions
    stats.attendanceOverview.totalSessions = 
      stats.attendanceOverview.totalLectures + stats.attendanceOverview.totalLabs;

    // Calculate overall attendance percentages
    const calculatePercentage = (present, total) => 
      total > 0 ? (present / total) * 100 : 0;

    stats.attendanceOverview.overallAttendance.lectures.percentage = 
      calculatePercentage(
        stats.attendanceOverview.overallAttendance.lectures.present,
        stats.attendanceOverview.overallAttendance.lectures.total
      );

    stats.attendanceOverview.overallAttendance.labs.percentage = 
      calculatePercentage(
        stats.attendanceOverview.overallAttendance.labs.present,
        stats.attendanceOverview.overallAttendance.labs.total
      );

    // Calculate combined attendance
    stats.attendanceOverview.overallAttendance.combined.present = 
      stats.attendanceOverview.overallAttendance.lectures.present + 
      stats.attendanceOverview.overallAttendance.labs.present;
    
    stats.attendanceOverview.overallAttendance.combined.total = 
      stats.attendanceOverview.overallAttendance.lectures.total + 
      stats.attendanceOverview.overallAttendance.labs.total;
    
    stats.attendanceOverview.overallAttendance.combined.percentage = 
      calculatePercentage(
        stats.attendanceOverview.overallAttendance.combined.present,
        stats.attendanceOverview.overallAttendance.combined.total
      );

    // Calculate recent attendance percentages
    stats.attendanceOverview.recentAttendance.last7Days.percentage = 
      calculatePercentage(
        stats.attendanceOverview.recentAttendance.last7Days.present,
        stats.attendanceOverview.recentAttendance.last7Days.total
      );

    stats.attendanceOverview.recentAttendance.last30Days.percentage = 
      calculatePercentage(
        stats.attendanceOverview.recentAttendance.last30Days.present,
        stats.attendanceOverview.recentAttendance.last30Days.total
      );

    // Calculate individual student statistics
    stats.studentAttendanceDetails = classDoc.studentList.map(student => {
      const studentStats = {
        studentId: student._id,
        fullName: student.fullName,
        email: student.email,
        lectures: { present: 0, total: 0, percentage: 0 },
        labs: { present: 0, total: 0, percentage: 0 },
        combined: { present: 0, total: 0, percentage: 0 },
        lastAttendance: null,
        attendanceStreak: 0,
        needsAttention: false
      };

      let currentStreak = 0;
      let maxStreak = 0;
      let lastAttendanceDate = null;

      classDoc.attendanceRecords.forEach(record => {
        const recordDate = new Date(record.date);
        
        // Process lecture attendance
        if (record.lecture && record.lecture.records) {
          studentStats.lectures.total++;
          const studentRecord = record.lecture.records.find(r => 
            r.studentId.toString() === student._id.toString() && r.status === 'present'
          );
          if (studentRecord) {
            studentStats.lectures.present++;
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
            lastAttendanceDate = recordDate;
          } else {
            currentStreak = 0;
          }
        }

        // Process lab attendance
        if (record.lab && record.lab.records) {
          studentStats.labs.total++;
          const studentRecord = record.lab.records.find(r => 
            r.studentId.toString() === student._id.toString() && r.status === 'present'
          );
          if (studentRecord) {
            studentStats.labs.present++;
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
            lastAttendanceDate = recordDate;
          } else {
            currentStreak = 0;
          }
        }
      });

      // Calculate combined attendance
      studentStats.combined.present = 
        studentStats.lectures.present + studentStats.labs.present;
      studentStats.combined.total = 
        studentStats.lectures.total + studentStats.labs.total;
      studentStats.combined.percentage = 
        calculatePercentage(studentStats.combined.present, studentStats.combined.total);

      // Calculate individual percentages
      studentStats.lectures.percentage = 
        calculatePercentage(studentStats.lectures.present, studentStats.lectures.total);
      studentStats.labs.percentage = 
        calculatePercentage(studentStats.labs.present, studentStats.labs.total);

      // Set last attendance date
      studentStats.lastAttendance = lastAttendanceDate?.toISOString().split('T')[0] || null;
      studentStats.attendanceStreak = maxStreak;

      // Determine if student needs attention
      studentStats.needsAttention = 
        studentStats.combined.percentage < 70 || 
        (lastAttendanceDate && (now - lastAttendanceDate) > 7 * 24 * 60 * 60 * 1000);

      return studentStats;
    });

    // Sort and identify top performing students and those needing attention
    const sortedStudents = [...stats.studentAttendanceDetails].sort(
      (a, b) => b.combined.percentage - a.combined.percentage
    );

    stats.performanceMetrics.topPerformingStudents = 
      sortedStudents.slice(0, 3).map(student => ({
        id: student.studentId,
        name: student.fullName,
        attendance: student.combined.percentage
      }));

    stats.performanceMetrics.studentsNeedingAttention = 
      sortedStudents
        .filter(student => student.needsAttention)
        .map(student => ({
          id: student.studentId,
          name: student.fullName,
          attendance: student.combined.percentage,
          lastAttendance: student.lastAttendance
        }));

    // Calculate average attendance
    stats.performanceMetrics.averageAttendance = 
      stats.studentAttendanceDetails.reduce(
        (sum, student) => sum + student.combined.percentage, 
        0
      ) / stats.studentAttendanceDetails.length;

    // Sort attendance records by date (newest first)
    stats.attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Sort student stats by name
    stats.studentAttendanceDetails.sort((a, b) => a.fullName.localeCompare(b.fullName));

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching class attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics',
      error: error.message
    });
  }
});

/**
 * @desc    Get comprehensive dashboard details for a teacher
 * @route   GET /api/classes/teacher-dashboard
 * @access  Private (Teacher)
 */
export const getTeacherDashboardDetails = asyncHandler(async (req, res) => {
  console.log("req.user",req.user);
  try {
    console.log('[Dashboard] Request received:', { teacherId: req.user?.id });
    
    const teacherId = req.user?.id;
    console.log("teacherId",teacherId);

    // Validate teacher
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    // Get all classes for this teacher
    const classes = await Class.find({ teacherId })
      .populate('studentList', 'fullName email')
      .select('className schedule classCode batch studentList status attendanceRecords');

    if (!classes) {
      return res.status(404).json({
        success: false,
        message: "No classes found"
      });
    }

    // Initialize dashboard data structure
    const dashboardData = {
      overview: {
        totalClasses: classes.length,
        totalStudents: 0,
        activeClasses: 0,
        totalAttendanceSessions: 0
      },
      attendanceStats: {
        overall: {
          present: 0,
          absent: 0,
          total: 0,
          percentage: 0
        },
        byClass: [],
        byDay: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0
        }
      },
      recentActivity: {
        lastAttendanceSessions: [],
        upcomingClasses: []
      },
      classDetails: []
    };

    // Get current date info
    const now = new Date();
    const today = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Process each class
    for (const cls of classes) {
      // Update total students (avoiding duplicates)
      const uniqueStudents = new Set([...cls.studentList.map(s => s._id.toString())]);
      dashboardData.overview.totalStudents += uniqueStudents.size;

      // Update active classes count
      if (cls.status === 'active') {
        dashboardData.overview.activeClasses++;
      }

      // Process attendance records
      let classAttendance = {
        classId: cls._id,
        className: cls.className,
        present: 0,
        absent: 0,
        total: 0
      };

      // Get last 30 days attendance
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      cls.attendanceRecords.forEach(record => {
        const recordDate = new Date(record.date);
        
        // Count total sessions
        if (record.lecture?.records?.length > 0) {
          dashboardData.overview.totalAttendanceSessions++;
          classAttendance.total++;
          
          const presentCount = record.lecture.records.filter(r => r.status === 'present').length;
          classAttendance.present += presentCount;
          classAttendance.absent += record.lecture.records.length - presentCount;

          // Add to recent activity if within last 7 days
          if (recordDate >= thirtyDaysAgo) {
            dashboardData.recentActivity.lastAttendanceSessions.push({
              classId: cls._id,
              className: cls.className,
              date: record.date,
              type: 'lecture',
              attendance: {
                present: presentCount,
                total: record.lecture.records.length
              }
            });
          }
        }

        if (record.lab?.records?.length > 0) {
          dashboardData.overview.totalAttendanceSessions++;
          classAttendance.total++;
          
          const presentCount = record.lab.records.filter(r => r.status === 'present').length;
          classAttendance.present += presentCount;
          classAttendance.absent += record.lab.records.length - presentCount;

          // Add to recent activity if within last 7 days
          if (recordDate >= thirtyDaysAgo) {
            dashboardData.recentActivity.lastAttendanceSessions.push({
              classId: cls._id,
              className: cls.className,
              date: record.date,
              type: 'lab',
              attendance: {
                present: presentCount,
                total: record.lab.records.length
              }
            });
          }
        }
      });

      // Calculate class attendance percentage
      classAttendance.percentage = classAttendance.total > 0
        ? (classAttendance.present / (classAttendance.present + classAttendance.absent)) * 100
        : 0;

      dashboardData.attendanceStats.byClass.push(classAttendance);

      // Update overall attendance stats
      dashboardData.attendanceStats.overall.present += classAttendance.present;
      dashboardData.attendanceStats.overall.absent += classAttendance.absent;
      dashboardData.attendanceStats.overall.total += classAttendance.total;

      // Process schedule for upcoming classes
      cls.schedule.forEach(slot => {
        // Count classes by day
        dashboardData.attendanceStats.byDay[slot.day.toLowerCase()]++;

        // Check for upcoming classes today
        if (today === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(slot.day.toLowerCase())) {
          slot.timing.forEach(time => {
            const [hours, minutes] = time.split(':').map(Number);
            const classTime = hours * 60 + minutes;
            
            if (classTime > currentTime) {
              dashboardData.recentActivity.upcomingClasses.push({
                classId: cls._id,
                className: cls.className,
                time: time,
                day: slot.day
              });
            }
          });
        }
      });

      // Add to class details
      dashboardData.classDetails.push({
        classId: cls._id,
        className: cls.className,
        classCode: cls.classCode,
        batch: cls.batch,
        studentCount: uniqueStudents.size,
        status: cls.status,
        schedule: cls.schedule
      });
    }

    // Calculate overall attendance percentage
    dashboardData.attendanceStats.overall.percentage = 
      dashboardData.attendanceStats.overall.total > 0
        ? (dashboardData.attendanceStats.overall.present / 
          (dashboardData.attendanceStats.overall.present + dashboardData.attendanceStats.overall.absent)) * 100
        : 0;

    // Sort recent activities by date
    dashboardData.recentActivity.lastAttendanceSessions.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    // Sort upcoming classes by time
    dashboardData.recentActivity.upcomingClasses.sort((a, b) => {
      const [aHours, aMinutes] = a.time.split(':').map(Number);
      const [bHours, bMinutes] = b.time.split(':').map(Number);
      return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
    });

    // Limit recent activities to last 10
    dashboardData.recentActivity.lastAttendanceSessions = 
      dashboardData.recentActivity.lastAttendanceSessions.slice(0, 10);

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching teacher dashboard details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard details',
      error: error.message
    });
  }
});