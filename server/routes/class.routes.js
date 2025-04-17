import { Router } from "express";
import { 
  generateAttendance, 
  registerClass, 
  getClassfrequency, 
  getTeacherClasses, 
  getStudentClasses,
  getClassDetails
} from "../controllers/class.controllers.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();
router.post("/create-class", registerClass);
router.post("/generate-attendance", generateAttendance);

// Route to get frequency for a specific class
router.get('/frequency/:classId', getClassfrequency);

// New routes for getting classes
router.get('/teacher/:teacherId', getTeacherClasses);
router.get('/student/:studentId', getStudentClasses);

// NEW ROUTE for getting specific class details
router.get('/:classId', getClassDetails);

export default router;
