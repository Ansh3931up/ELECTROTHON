import AppError from "../utils/error.utils.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation



// Create a class by a teacher
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
        { $set: { classId: newClass._id } }
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


export const generateAttendance = async (req, res, next) => {
  try {
    console.log("Received Request:", req.body);

    const { classId, teacherId, frequency } = req.body;

    // --- Validations ---
    if (!classId) {
      console.log("❌ Error: Class ID is missing");
      return next(new AppError("Class ID is required", 400));
    }
    // Add frequency validation if needed (e.g., is it an array of numbers?)
    if (!frequency || !Array.isArray(frequency) || frequency.length === 0) {
         return next(new AppError("Valid frequency array is required", 400));
    }
    const teacherData = await User.findById(teacherId);
    if (!teacherData || teacherData.role !== 'teacher') { // Also check role
      console.log("❌ Error: Teacher not found or invalid role");
      return next(new AppError("Teacher ID is not valid or user is not a teacher", 400));
    }

    // Find class
    const classData = await Class.findById(classId);
    if (!classData) {
      console.log("❌ Error: Class not found");
      return next(new AppError("Class not found", 404));
    }
     // Optional: Check if teacherId matches the class teacher
     // if (classData.teacherId.toString() !== teacherId) {
     //     return next(new AppError("Provided teacher is not assigned to this class", 403));
     // }


    // --- Update class with new frequency ---
    classData.frequency = frequency; // Assign the received frequency array

    // Save the updated class document (with the new frequency)
    await classData.save();

    // Set timeout to clear frequency (this part is likely correct)
    setTimeout(async () => {
      try {
          // Use findByIdAndUpdate with $set for atomic update
          await Class.findByIdAndUpdate(classId, { $set: { frequency: [] } }, { new: true }); // new: true is optional
          console.log(`⚠️ frequency removed for class ${classId}`);
      } catch(timeoutError) {
          console.error(`Error clearing frequency for class ${classId} in timeout:`, timeoutError);
      }
    }, 3 * 60 * 1000); // 3 minutes

    // Send success response
    res.status(200).json({
      success: true,
      message: "Frequency generated and stored successfully!",
      frequency, // Return the frequency that was saved
    });
  } catch (error) {
    console.log("❌ Backend Error:", error);
     // Provide more specific error message if possible
    next(new AppError(error.message || "Internal server error generating frequency", 500));
  }
};

export const getClassfrequency = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const classDetails = await Class.findById(classId);
    
    if (!classDetails) {
      return next(new AppError("Class not found", 404));
    }

    // Return the frequency stored in the class document
    res.status(200).json({
      success: true,
      frequency: classDetails.frequency || []
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
    // Expecting sessionType: 'lecture' | 'lab'
    const { date, sessionType, attendanceList, recordedBy } = req.body;

    // --- Validation ---
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        return next(new AppError("Invalid Class ID format", 400));
    }
    if (!date || !sessionType || !['lecture', 'lab'].includes(sessionType) || !attendanceList || !Array.isArray(attendanceList) || !recordedBy) {
         return next(new AppError("Missing/Invalid fields: date, sessionType ('lecture'|'lab'), attendanceList (array), and recordedBy required", 400));
    }
    if (!mongoose.Types.ObjectId.isValid(recordedBy)) {
        return next(new AppError("Invalid Recorded By ID format", 400));
    }
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
       return next(new AppError("Invalid date format provided", 400));
    }
    attendanceDate.setUTCHours(0, 0, 0, 0); // Normalize date

    // --- Verify Class and Teacher ---
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return next(new AppError("Class not found", 404));
    }
    const teacher = await User.findById(recordedBy);
    if (!teacher || teacher.role !== 'teacher') {
        return next(new AppError("Invalid recorder ID or user is not a teacher", 403));
    }

    // --- Prepare new session records ---
    const newSessionRecords = [];
    const studentIdsInClass = classDoc.studentList.map(id => id.toString());
    for (const record of attendanceList) {
        if (!record.studentId || !record.status || !['present', 'absent'].includes(record.status)) {
            return next(new AppError(`Invalid data in attendanceRecords array: Each record must have studentId and status ('present' or 'absent'). Invalid record: ${JSON.stringify(record)}`, 400));
        }
        if (!mongoose.Types.ObjectId.isValid(record.studentId)) {
            return next(new AppError(`Invalid Student ID format: ${record.studentId}`, 400));
        }
        if (!studentIdsInClass.includes(record.studentId)) {
            console.warn(`Attempted to save attendance for student ${record.studentId} not in class ${classId}`);
            continue; // Skip this record
        }
        newSessionRecords.push({
            studentId: record.studentId,
            status: record.status,
            recordedBy: recordedBy,
            recordedAt: new Date()
        });
    }

    // --- Find or Create Daily Attendance Record and Update ---
    const updateResult = await Class.updateOne(
        { // Filter criteria to find the class and the specific date's record
            _id: classId,
            "attendanceRecords.date": attendanceDate
        },
        { // Set the specific sessionType array for that date
            $set: { [`attendanceRecords.$.${sessionType}`]: newSessionRecords }
        }
    );

    // If no document matched the date filter (updateResult.matchedCount === 0),
    // it means we need to create the entry for this date.
    if (updateResult.matchedCount === 0) {
        await Class.updateOne(
            { _id: classId },
            { // Push a new dailyAttendance object
                $push: {
                    attendanceRecords: {
                        date: attendanceDate,
                        [sessionType]: newSessionRecords, // Set the lecture OR lab array
                        // Initialize the other array as empty if needed
                        [sessionType === 'lecture' ? 'lab' : 'lecture']: []
                    }
                }
            }
        );
    }

    res.status(200).json({
        success: true,
        message: `Attendance for ${sessionType} on ${attendanceDate.toLocaleDateString()} updated successfully.`,
        data: { savedCount: newSessionRecords.length }
    });

  } catch (error) {
    if (error.name === 'CastError') {
       return next(new AppError(`Invalid ObjectId format found in request.`, 400));
    }
    // Handle Mongoose validation errors if any during save
     if (error.name === 'ValidationError') {
        return next(new AppError(error.message, 400));
    }
    return next(new AppError(error.message || "Internal server error saving attendance", 500));
  }
};

// --- NEW Controller: markStudentPresentByFrequency ---
export const markStudentPresentByFrequency = async (req, res, next) => {
    try {
        const { classId, studentId, detectedFrequency } = req.body;
        // We need to know if this frequency applies to lecture or lab.
        // Option 1: Infer from classType (simplest for now)
        // Option 2: Teacher sets an "active session type" when generating freq.
        // Option 3: Student sends sessionType (less reliable).
        // Let's use Option 1 for now.

        // --- Validation ---
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return next(new AppError("Invalid Class ID format", 400));
        }
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return next(new AppError("Invalid Student ID format", 400));
        }
        if (detectedFrequency === undefined || typeof detectedFrequency !== 'number') {
            return next(new AppError("Detected frequency (number) is required", 400));
        }

        // --- Verify Student ---
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return next(new AppError("Invalid student ID or user is not a student", 400));
        }

        // --- Find Class, Check Frequency & Determine Session Type ---
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return next(new AppError("Class not found", 404));
        }
        if (!classDoc.studentList.some(id => id.toString() === studentId)) {
            return next(new AppError("Student is not enrolled in this class", 403));
        }

        const storedFrequency = classDoc.frequency?.[0];
        if (storedFrequency === undefined) {
            return next(new AppError("No active special frequency for this class", 404));
        }

        const tolerance = 5;
        const isMatch = Math.abs(storedFrequency - detectedFrequency) <= tolerance;
        if (!isMatch) {
            return next(new AppError(`Frequency mismatch. Expected ~${storedFrequency}Hz, received ${detectedFrequency}Hz.`, 400));
        }

        // <<< Determine target session type based on class setting >>>
        const targetSessionType = classDoc.classType; // 'lecture' or 'lab'

        // --- Update/Add Attendance Record within the Correct Session Type ---
        const attendanceDate = new Date();
        attendanceDate.setUTCHours(0, 0, 0, 0); // Normalize

        // Try to update an existing student record within the date and session type
        const updateResult = await Class.updateOne(
            {
                _id: classId,
                "attendanceRecords": { // Find the daily record matching the date
                    $elemMatch: { date: attendanceDate }
                }
            },
            { // Update the student's status within the correct session array
                $set: {
                    [`attendanceRecords.$[outer].${targetSessionType}.$[inner].status`]: "present",
                    [`attendanceRecords.$[outer].${targetSessionType}.$[inner].recordedAt`]: new Date(),
                    [`attendanceRecords.$[outer].${targetSessionType}.$[inner].recordedBy`]: studentId
                }
            },
            { // Array filters to target the specific nested elements
                arrayFilters: [
                    { "outer.date": attendanceDate },
                    { "inner.studentId": studentId }
                ]
            }
        );

        // If nothing was updated (either date or student within session didn't exist)
        if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
            // Prepare the new student record
            const newStudentRecord = {
                studentId: studentId,
                status: "present",
                recordedBy: studentId,
                recordedAt: new Date()
            };

            // Try adding the student to an *existing* date's session array
            const pushToExistingDateResult = await Class.updateOne(
                 {
                    _id: classId,
                    "attendanceRecords.date": attendanceDate
                 },
                 { // Add the student record to the correct session array
                    $push: { [`attendanceRecords.$.${targetSessionType}`]: newStudentRecord }
                 }
            );

            // If the date itself didn't exist, create the date entry and add the student
            if (pushToExistingDateResult.matchedCount === 0) {
                await Class.updateOne(
                    { _id: classId },
                    {
                        $push: {
                            attendanceRecords: {
                                date: attendanceDate,
                                [targetSessionType]: [newStudentRecord], // Add student to target type
                                [targetSessionType === 'lecture' ? 'lab' : 'lecture']: [] // Init other type
                            }
                        }
                    }
                );
            }
        }

        res.status(200).json({
            success: true,
            message: `Attendance marked as present for ${targetSessionType} successfully via frequency.`,
        });

    } catch (error) {
        console.error("Error in markStudentPresentByFrequency:", error);
        next(new AppError(error.message || "Internal server error marking attendance", 500));
    }
};

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