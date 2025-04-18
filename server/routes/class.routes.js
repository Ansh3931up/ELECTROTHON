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
  getAttendanceByDateAndType
} from "../controllers/class.controllers.js";
import upload from "../middlewares/multer.middleware.js";
// import { checkRole } from '../middleware/role.middleware.js';

const router = Router();
router.post("/create-class",verifyJWT, registerClass);
router.post("/generate-attendance", generateAttendance);

// Route to get frequency for a specific class
router.get('/frequency/:classId', getClassfrequency);

// New routes for getting classes
router.get('/teacher/:teacherId', getTeacherClasses);
router.get('/student/:studentId', getStudentClasses);

// --- NEW ROUTE for Teacher's Schedule ---
router.get('/my-schedule', verifyJWT, getTeacherSchedule);

// --- Attendance Routes ---
// New routes for managing attendance sessions
router.post('/attendance/start-session', verifyJWT, startAttendanceSession);
router.post('/attendance/end-session', verifyJWT, endAttendanceSession);
router.post('/attendance/mark-by-frequency', markStudentPresentByFrequency);
router.get('/:classId/attendance', getAttendanceByDateAndType);

// Note: Placed *before* the generic /:classId GET route to avoid conflict
router.post('/:classId/attendance', saveDailyAttendance);

// Route for getting specific class details
router.get('/:classId', getClassDetails);

// --- Class Routes ---
router.patch('/:classId', verifyJWT, editClassDetails);

export default router;
