import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
  generateAttendance, 
  registerClass, 
  getClassfrequency, 
  getTeacherClasses, 
  getStudentClasses,
  getClassDetails,
  saveDailyAttendance,
  markStudentPresentByFrequency,
  editClassDetails,
  getTeacherSchedule,
  startAttendanceSession,
  endAttendanceSession,
  getAttendanceByDateAndType,
  getOngoingAttendance,
  getStudentTotalAttendance,
  joinClass,
  getClassAttendanceStats,
  getTeacherDashboardDetails,

} from "../controllers/class.controllers.js";


const router = express.Router();
router.post("/generate-attendance", generateAttendance); //in use
// Create a new class (teacher only)
router.post("/create-class",verifyJWT, registerClass);

// Join a class using passcode (student only)
router.post("/join", joinClass);

// Get class by ID
// router.get("/:classId", getClassById);

// Get teacher's classes
router.get("/teacher/:teacherId", getTeacherClasses);

// Get student's classes
router.get("/student/:studentId", getStudentClasses);

// Route to get frequency for a specific class
router.get('/frequency/:classId', getClassfrequency); //in use

// --- NEW ROUTE for Student's Total Attendance ---
router.get('/student/:studentId/total-attendance', getStudentTotalAttendance);

// --- NEW ROUTE for Teacher's Schedule ---
router.get('/my-schedule', verifyJWT, getTeacherSchedule); //in use

// Add teacher dashboard route
router.get('/teacher-dashboard', verifyJWT, getTeacherDashboardDetails);

// --- Attendance Routes ---
// New routes for managing attendance sessions
router.post('/attendance/start-session', verifyJWT, startAttendanceSession);//not in use
router.post('/attendance/end-session', verifyJWT, endAttendanceSession);
router.post('/attendance/mark-by-frequency', markStudentPresentByFrequency);//in use
router.get('/:classId/attendance', getAttendanceByDateAndType);
router.get('/:classId/ongoing-attendance', getOngoingAttendance);

// Note: Placed *before* the generic /:classId GET route to avoid conflict
router.post('/:classId/attendance', saveDailyAttendance);

// Route for getting specific class details
router.get('/:classId', getClassDetails); //in use

// --- Class Routes ---
router.patch('/:classId', verifyJWT, editClassDetails);

// Add new route for getting class attendance statistics
router.get('/:classId/attendance-stats', verifyJWT, getClassAttendanceStats);

export default router;
