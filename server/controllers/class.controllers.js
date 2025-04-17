import AppError from "../utils/error.utils.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation

// Create a class by a teacher
export const registerClass = async (req, res, next) => {
  try {
    const { teacherId, className, classType, time, studentIds } = req.body;

    // Validate required fields
    if (!teacherId || !className || !classType) {
      return next(new AppError("Teacher ID, Class Name, and Class Type are required", 400));
    }

    // Verify if the teacher exists and has a valid role
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return next(
        new AppError("Invalid Teacher ID or user is not a teacher", 400)
      );
    }

    // Validate student IDs if provided
    if (studentIds && studentIds.length > 0) {
      const students = await User.find({ 
        _id: { $in: studentIds },
        role: "student" 
      });
      
      if (students.length !== studentIds.length) {
        return next(new AppError("One or more student IDs are invalid", 400));
      }
    }

    // Create a new class including classType
    const newClass = await Class.create({
      teacherId,
      className,
      classType,
      studentList: studentIds || [],
      frequency: [],
      time: time || new Date(),
      attendanceRecords: [] // Initialize as empty array
    });

    // Update classId for all students
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
    // Mongoose validation errors (like invalid enum) will be caught here
    if (error.name === 'ValidationError') {
        return next(new AppError(error.message, 400));
    }
    next(new AppError(error.message, 500));
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
    const classes = await Class.find({ teacherId })
      .populate('studentList', 'fullName email')
      .select('className time studentList');
    
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
    const classes = await Class.find({ studentList: studentId })
      .populate('teacherId', 'fullName email')
      .select('className time');
    
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
       return next(new AppError(`Invalid Class ID format: ${classId}`, 400));
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

// <<< NEW FUNCTION to edit class details >>>
export const editClassDetails = async (req, res, next) => {
    try {
        const { classId } = req.params;
        // Assuming teacher's ID comes from authentication middleware (e.g., req.user.id)
        // If not using middleware, you'd need to pass teacherId in the request and verify it.
        // const requestingTeacherId = req.user?.id; // Adjust based on your auth setup
        const { className, classType, time, status, teacherId } = req.body; // Get teacherId from body for verification if not using auth middleware

        // --- Basic Validations ---
        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return next(new AppError("Invalid Class ID format", 400));
        }
         // <<< Verification: Ensure teacher ID is provided if not using auth middleware >>>
         if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
             return next(new AppError("Valid Teacher ID must be provided for verification", 400));
         }

        // Find the class to edit
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return next(new AppError("Class not found", 404));
        }

        // --- Authorization Check ---
        // Ensure the requesting user is the teacher of this class
        if (classDoc.teacherId.toString() !== teacherId) { // Compare with teacherId from request body
            return next(new AppError("You are not authorized to edit this class", 403)); // 403 Forbidden
        }

        // --- Update Allowed Fields ---
        // Only update fields that are provided in the request body
        if (className !== undefined) {
            if (typeof className !== 'string' || className.trim().length < 3 || className.trim().length > 50) {
                 return next(new AppError("Class name must be between 3 and 50 characters", 400));
            }
            classDoc.className = className.trim();
        }
        if (classType !== undefined) {
            if (!['lecture', 'lab'].includes(classType)) {
                return next(new AppError("Invalid class type. Must be 'lecture' or 'lab'", 400));
            }
            classDoc.classType = classType;
        }
        if (time !== undefined) {
             const newTime = new Date(time);
             if (isNaN(newTime.getTime())) {
                 return next(new AppError("Invalid time format provided", 400));
             }
             classDoc.time = newTime;
        }
        if (status !== undefined) {
             if (!['active', 'inactive', 'archived'].includes(status)) {
                 return next(new AppError("Invalid status. Must be 'active', 'inactive', or 'archived'", 400));
             }
             classDoc.status = status;
        }
        // Note: studentList editing is excluded for now due to complexity

        // Save the updated document
        const updatedClass = await classDoc.save();

        res.status(200).json({
            success: true,
            message: "Class details updated successfully",
            class: updatedClass // Return the full updated class
        });

    } catch (error) {
        if (error.name === 'CastError') { /* ... */ }
        if (error.name === 'ValidationError') { /* ... */ }
        return next(new AppError(error.message || "Internal server error updating class", 500));
    }
};