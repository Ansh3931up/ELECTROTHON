import Class from "../models/Class.js";
import User from "../models/User.js";

//Student Marks Attendance
export const markAttendance = async (req, res) => {
  try {
    const { userId, classId, detectedfrequency } = req.body;

    console.log("Marking attendance:", {
      userId,
      classId,
      detectedfrequency
    });

    // Fetch student details
    const student = await User.findById(userId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ 
        success: false,
        message: "Unauthorized access" 
      });
    }

    // Ensure student is assigned to the class
    if (student.classId.toString() !== classId) {
      return res.status(400).json({ 
        success: false,
        message: "Student is not assigned to this class" 
      });
    }

    // Fetch stored class frequency
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ 
        success: false,
        message: "Class not found" 
      });
    }

    const storedfrequency = classData.frequency[0]; // Get the first frequency
    console.log("Comparing frequencies:", {
      stored: storedfrequency,
      detected: detectedfrequency
    });

    // Check if detected frequency matches stored one
    // Allow for small variations (±5 Hz)
    const frequencyTolerance = 5;
    const isMatch = Math.abs(Number(storedfrequency) - Number(detectedfrequency)) <= frequencyTolerance;

    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Frequency does not match. Attendance not marked." 
      });
    }

    // Mark attendance for today
    const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD format
    let attendanceEntry = classData.attendance.find(
      (entry) => entry.date.toISOString().split("T")[0] === today
    );

    if (!attendanceEntry) {
      // If attendance for today doesn't exist, create a new record
      attendanceEntry = {
        date: new Date(),
        presentStudents: [],
      };
      classData.attendance.push(attendanceEntry);
    }

    // Add student to present list if not already present
    if (!attendanceEntry.presentStudents.includes(userId)) {
      attendanceEntry.presentStudents.push(userId);
    }

    await classData.save();

    return res.status(200).json({ 
      success: true,
      message: "Attendance marked successfully" 
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};


