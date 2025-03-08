import { Router } from "express";
import {
  registerFace,
  updateFace,
  getFaceStatus
} from "../controllers/faceRegistration.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

// Face registration routes
router.post("/register/:userId", isLoggedIn, registerFace);
router.put("/update/:userId", isLoggedIn, updateFace);
router.get("/status/:userId", isLoggedIn, getFaceStatus);

export default router; 