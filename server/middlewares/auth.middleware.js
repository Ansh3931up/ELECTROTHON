import AppError from "../utils/error.utils.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const verifyJWT = async (req, _res, next) => {
    console.log(`--- Verifying JWT for: ${req.method} ${req.originalUrl} ---`); // Log entry point

    // 1. Extract token
    const authHeader = req.header("Authorization");
    const cookieToken = req.cookies?.accessToken; // Check cookies if you use them
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "");
        console.log("Token found in Authorization header.");
    } else if (cookieToken) {
        token = cookieToken;
        console.log("Token found in 'accessToken' cookie.");
    } else {
         console.log("No token found in Authorization header ('Bearer ...') or 'accessToken' cookie.");
         console.log("Request headers:", req.headers); // Log headers if token is missing
         // console.log("Request cookies:", req.cookies); // Uncomment if using cookies
         return next(new AppError('Unauthenticated, please log in (token not found).', 401));
    }

    // Log only the start of the token for security
    console.log("Extracted Token (start):", token ? `${token.substring(0, 10)}...` : "None");

    // Check JWT_SECRET existence *before* trying to use it
    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET environment variable is not set on the server.");
        // Don't proceed without a secret
        return next(new AppError('Internal server error (JWT configuration missing).', 500));
    }

    try {
        // 3. Verify the token
        console.log("Attempting to verify token with provided secret...");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token verified successfully.");
        console.log("Decoded Payload:", decoded); // Log the full payload to see its structure

        // 4. Attach user ID to the request object
        // IMPORTANT: Check if the key is 'id' or maybe '_id' in your payload
        const userId = decoded?.id || decoded?._id; // Check for common keys

        if (!userId) {
             console.error("Decoded token payload does not contain expected user ID field ('id' or '_id'):", decoded);
             return next(new AppError('Invalid token payload structure (missing user ID).', 401));
        }

        // Attach user info to req.user
        req.user = { id: userId }; // Use the extracted userId
        // You could also attach the whole decoded payload: req.user = decoded;

        console.log("Attached req.user:", req.user);

        // 5. Proceed to the next middleware/controller
        next();
    } catch (error) {
        console.error("Error verifying JWT:", error.name, error.message); // Log specific JWT error details
        // Handle different JWT errors
        if (error.name === 'JsonWebTokenError') {
            // Common errors: 'invalid signature', 'jwt malformed'
            return next(new AppError(`Invalid authentication token: ${error.message}`, 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Authentication token expired, please log in again.', 401));
        }
        // Handle other potential errors during verification
        return next(new AppError('Authentication failed due to an unexpected error during token verification.', 401));
    }
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

export { verifyJWT, authorizedRoles };
