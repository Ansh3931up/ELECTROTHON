import { Router } from "express";
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
  joinClass
} from "../controllers/class.controllers.js";

const router = Router();
router.post("/create-class",verifyJWT, registerClass); //in use
router.post("/generate-attendance", generateAttendance); //in use

// Route to get frequency for a specific class
router.get('/frequency/:classId', getClassfrequency); //in use

// New routes for getting classes
router.get('/teacher/:teacherId', getTeacherClasses); //in use
router.get('/student/:studentId', getStudentClasses); //in use

// --- NEW ROUTE for Student's Total Attendance ---
router.get('/student/:studentId/total-attendance', getStudentTotalAttendance);

// --- NEW ROUTE for Teacher's Schedule ---
router.get('/my-schedule', verifyJWT, getTeacherSchedule); //in use

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

// Add route for joining a class
router.post('/:classId/join', verifyJWT, joinClass);

export default router;
