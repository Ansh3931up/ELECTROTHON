import Class from "../models/Class.js";
import User from "../models/User.js";
import { verifyFace } from "../services/faceRecognitionServices.js";

//Student Marks Attendance
export const markAttendance = async (req, res) => {
  try {
    const { userId, detectedfrequency, faceDescriptor } = req.body;

    // Fetch student details
    const student = await User.findById(userId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Check if student has stored face descriptor
    if (!student.faceDescriptor) {
      return res.status(400).json({ 
        message: "No stored face descriptor found for student" 
      });
    }

    // Ensure student is assigned to a class
    if (!student.classId) {
      return res.status(400).json({ 
        message: "Student is not assigned to any class" 
      });
    }

    // Fetch stored class frequency
    const classData = await Class.findById(student.classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // ✅ Check if detected frequency matches stored ones
    const isFrequencyMatch = detectedfrequency === classData.frequency;
    if (!isFrequencyMatch) {
      return res.status(400).json({ 
        message: "Frequency does not match. Attendance not marked." 
      });
    }

    // ✅ Verify face using descriptors
    const faceVerificationResult = await verifyFace(
      faceDescriptor, 
      student.faceDescriptor
    );

    if (!faceVerificationResult.isMatch) {
      return res.status(400).json({ 
        message: "Face verification failed", 
        error: faceVerificationResult.error,
        confidence: faceVerificationResult.confidence
      });
    }

    // ✅ Mark attendance for today
    const today = new Date().toISOString().split("T")[0];
    let attendanceEntry = classData.attendance.find(
      (entry) => entry.date.toISOString().split("T")[0] === today
    );

    if (!attendanceEntry) {
      attendanceEntry = {
        date: new Date(),
        presentStudents: [],
      };
      classData.attendance.push(attendanceEntry);
    }

    if (!attendanceEntry.presentStudents.includes(userId)) {
      attendanceEntry.presentStudents.push(userId);
    }

    await classData.save();

    return res.status(200).json({ 
      message: "Attendance marked successfully",
      faceVerification: {
        confidence: faceVerificationResult.confidence
      }
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


