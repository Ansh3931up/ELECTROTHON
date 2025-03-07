import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  getProfile,
  updateUser,
} from "../controllers/teacher.controllers.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();
// Teacher routes
router.post("/register", upload.none(), registerUser);
router.post("/login", login)
router.post("/logout", logout);
router.put("/teachers/:id", updateUser);
router.get("/profile/:id",getProfile)
//router.post("/take-attendance", takeAttendance);
//router.post("/generatefrequency", generatefrequency);
export default router;
