import AppError from "../utils/error.utils.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";

// Create a class by a teacher
export const registerClass = async (req, res, next) => {
  try {
    const {  teacherId, className, time, studentIds } = req.body;

    // Validate required fields
    if (!teacherId || !className) {
      return next(new AppError("Teacher ID and Class Name are required", 400));
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

    // Create a new class
    const newClass = await Class.create({
      teacherId,
      className,
      studentList: studentIds || [], // Add students during class creation
      frequency: [], // frequency will be added when attendance is taken
      time: time || new Date(), // Default to current time
      attendance: [], // Attendance records will be added later
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
    next(new AppError(error.message, 500));
  }
};

export const generateAttendance = async (req, res, next) => {
  try {
    console.log("Received Request:", req.body); // 👈 Debug input

    const { classId, teacherId,frequency } = req.body;

    if (!classId) {
      console.log("❌ Error: Class ID is missing");
      return next(new AppError("Class ID is required", 400));
    }

    const teacherData = await User.findById(teacherId);
    if (!teacherData) {
      console.log("❌ Error: Teacher not found");
      return next(new AppError("Teacher ID is not valid", 400));
    }

    // Find class and update frequency
    const classData = await Class.findById(classId);
    if (!classData) {
      console.log("❌ Error: Class not found");
      return next(new AppError("Class not found", 404));
    }

    // Update class with new frequency
    classData.frequency = frequency;
    classData.teacherId = teacherId;

    // Add frequency to students' attendance data
    classData.studentList.forEach((student) => {
      classData.attendance.push({
        studentId: student,
        detectedfrequency: [],
      });
    });

    await classData.save();

    setTimeout(async () => {
      await Class.findByIdAndUpdate(classId, { frequency: [] });
      console.log(`⚠️ frequency removed for class ${classId}`);
    }, 3 * 60 * 1000);

    res.status(200).json({
      success: true,
      message: "frequency generated and stored successfully!",
      frequency,
    });
  } catch (error) {
    console.log("❌ Backend Error:", error);
    next(new AppError("Internal server error", 500));
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