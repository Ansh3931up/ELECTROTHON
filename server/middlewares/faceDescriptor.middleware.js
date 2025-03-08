import AppError from "../utils/error.utils.js";

export const validateFaceDescriptor = (req, res, next) => {
  const { faceDescriptor } = req.body;

  // Check if descriptor exists
  if (!faceDescriptor) {
    return next(new AppError("Face descriptor is required", 400));
  }

  // Validate descriptor format
  if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
    return next(new AppError("Invalid face descriptor format", 400));
  }

  // Check if all elements are numbers
  if (!faceDescriptor.every(item => typeof item === 'number')) {
    return next(new AppError("Face descriptor must contain only numbers", 400));
  }

  next();
}; 