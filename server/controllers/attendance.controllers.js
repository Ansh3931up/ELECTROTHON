import Class from "../models/Class.js";
import User from "../models/User.js";

//Student Marks Attendance
export const markAttendance = async (req, res) => {
  try {
    const { userId, detectedfrequency } = req.body;

    // Fetch student details
    const student = await User.findById(userId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Ensure student is assigned to a class
    if (!student.classId) {
      return res
        .status(400)
        .json({ message: "Student is not assigned to any class" });
    }

    // Fetch stored class frequency
    const classData = await Class.findById(student.classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    const storedfrequency = classData.frequency; // Retrieving stored frequency

    // ✅ Check if detected frequency match stored ones
    const isMatch = detectedfrequency === storedfrequency;

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "frequency do not match. Attendance not marked." });
    }

    // ✅ Mark attendance for today
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

    return res.status(200).json({ message: "Attendance marked successfully" });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


