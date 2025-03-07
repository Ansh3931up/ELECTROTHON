import AppError from "../utils/error.util.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
const isLoggedIn = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new AppError("Unauthenticated, please login again", 401));
  }

  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded) {
    return next(new AppError("Unauthorized, please login to continue", 401));
  }
  req.user = decoded;

  next();
};

const authorizedRoles =
  (...roles) =>
  async (req, res, next) => {
    const currentUserRole = req.user.role;
    if (!roles.includes(currentUserRole)) {
      return next(new AppError("Access permission denied", 403));
    }
    next();
  };
export { isLoggedIn, authorizedRoles };
