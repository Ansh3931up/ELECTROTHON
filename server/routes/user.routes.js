import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  getProfile,
  updateUser,
  getAllStudents,
  getAllSchoolCodes,
  updateFaceData
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

// Authentication routes
router.post("/register", upload.none(), registerUser);
router.post("/login", login);
router.get("/logout", logout);

// Protected routes
router.get("/profile/:id", getProfile);
router.put("/update/:id", updateUser);

// Routes for students and teachers
router.get("/students", getAllStudents);


// Routes for school code
router.get("/get-all-school-codes", getAllSchoolCodes);

// Routes for face-data of user
router.post("/face-data", updateFaceData);

export default router;
