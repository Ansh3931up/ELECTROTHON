import { Router } from "express";
import { generateAttendance,registerClass, getClassfrequency} from "../controllers/class.controllers.js";
import upload from "../middlewares/multer.middleware.js";


const router = Router();
router.post("/create-class", registerClass );
router.post("/generate-attendance", generateAttendance);

// Route to get frequency for a specific class
router.get('/frequency/:classId', getClassfrequency);

export default router;
