import User from "../models/user.model.js";
import { generateFaceDescriptor } from "../services/faceRecognitionServices.js";
import AppError from "../utils/error.utils.js";

export const registerFace = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { faceDescriptor } = req.body;

    // Validate input
    if (!userId || !faceDescriptor) {
      return next(new AppError("User ID and face descriptor are required", 400));
    }

    // Verify descriptor format
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return next(new AppError("Invalid face descriptor format", 400));
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Update user with face descriptor
    user.faceDescriptor = faceDescriptor;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Face registered successfully",
      data: {
        userId: user._id,
        hasRegisteredFace: true
      }
    });

  } catch (error) {
    console.error("Face registration error:", error);
    next(new AppError(error.message, 500));
  }
};

export const updateFace = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { faceDescriptor } = req.body;

    // Validate input
    if (!faceDescriptor) {
      return next(new AppError("Face descriptor is required", 400));
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(
      userId,
      { faceDescriptor },
      { new: true, runValidators: true }
    );

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Face data updated successfully"
    });

  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

export const getFaceStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        hasRegisteredFace: Boolean(user.faceDescriptor),
        userId: user._id
      }
    });

  } catch (error) {
    next(new AppError(error.message, 500));
  }
}; 