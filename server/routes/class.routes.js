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
  editClassDetails
} from "../controllers/class.controllers.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();
router.post("/create-class",verifyJWT, registerClass);
router.post("/generate-attendance", generateAttendance);

// Route to get frequency for a specific class
router.get('/frequency/:classId', getClassfrequency);

// New routes for getting classes
router.get('/teacher/:teacherId', getTeacherClasses);
router.get('/student/:studentId', getStudentClasses);

// --- Attendance Route ---
// Note: Placed *before* the generic /:classId GET route to avoid conflict
router.post('/:classId/attendance', saveDailyAttendance);
router.post('/attendance/mark-by-frequency', markStudentPresentByFrequency);

// Route for getting specific class details
router.get('/:classId', getClassDetails);

// --- Class Routes ---
router.patch('/:classId', verifyJWT, editClassDetails);

export default router;
