import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  getProfile,
  updateUser,
  getAllStudents,
  getAllSchoolCodes,
  updateFaceData,
  forgotPassword,
  verifyOTP,
  resetPassword
} from "../controllers/user.controllers.js";
import { getTeachersBySchoolCode } from "../controllers/class.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import User from "../models/user.model.js";
import Class from "../models/class.model.js";

const router = Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", login);
router.post("/logout", verifyJWT, logout);

// Password Reset routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Profile routes
router.get("/profile/:id", verifyJWT, getProfile);
router.put("/update/:id", verifyJWT, updateUser);

// Face data route
router.post("/face-data", verifyJWT, updateFaceData);

// Routes for students and teachers
router.get("/students", getAllStudents);
router.get("/school-codes", getAllSchoolCodes);
router.get("/teachers/school/:schoolCode", verifyJWT, getTeachersBySchoolCode);

export default router;
