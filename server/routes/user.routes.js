import { Router } from "express";
import {
  registerUser,
  login,
  logout,
  getProfile,
  updateUser,
  getAllStudents,
} from "../controllers/user.controllers.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();
// User routes
router.post("/register", upload.none(), registerUser);
router.post("/login", login)
router.post("/logout", logout);
router.put("/teachers/:id", updateUser);
router.get("/profile/:id", getProfile);
router.get("/students", getAllStudents);

export default router;
