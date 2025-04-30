import User from "../models/user.model.js";
import AppError from "../utils/error.utils.js";
import { sendEmail } from '../utils/sendEmail.js';

const registerUser = async (req, res, next) => {
  try {
    console.log("Received Data:", req.body); // Debugging

    const { fullName, email, password, role, phone, schoolCode } = req.body;

    if (!fullName || !email || !password || !role || !phone || !schoolCode) {
      return next(new AppError("All fields are required", 400));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("Email already exists", 400));
    }

    // Create user with schoolCode directly
    const user = await User.create({
      fullName,
      email,
      password,
      role,
      phone,
      schoolCode: schoolCode.toUpperCase(),
    });

    console.log("Created User:", user); // Debugging

    res.status(201).json({
      status: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.log("Error:", error);
    next(new AppError("Internal Server Error", 500));
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return next(new AppError("All fields are required", 400));
    }

    const user = await User.findOne({ email }).select("+password -embeddings");
    console.log("user login",user);
    
    if (!user) {
      return next(new AppError("Email or password does not match", 400));
    }

    // Check if the role matches
    if (user.role !== role) {
      return next(new AppError("Invalid role for this user", 401));
    }

    // Verify password
    if (!(await user.comparePassword(password))) {
      return next(new AppError("Email or password does not match", 400));
    }

    const token = await user.generateJWTToken();
    console.log("Generated Token:", token); // Debugging
    user.password = undefined;
    
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token, // Return the token in the response body
      role: user.role, // Return the user role in the response body
      user
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
};

const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return next(new AppError("User ID is required", 400));
    }
    
    const user = await User.findById(id);
    console.log("user profile",user)
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      user,
    });
  } catch (error) {
    return next(new AppError("Failed to fetch profile details", 500));
  }
};

const updateUser = async (req, res, next) => {
  const { fullName } = req.body;
  const {id}=req.params;

  const user = await User.findById(id);
  console.log(user,"da");
  if (!user) {
    return next(new AppError("User does not exist", 400));
  }
  console.log(user.fullName);
  if (user?.fullName) {
    user.fullName=fullName;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "User details updated successfully",
  });
};

const getAllStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");

    res.status(200).json({
      success: true,
      message: "Students fetched successfully",
      students,
    });
  } catch (error) {
    return next(new AppError("Failed to fetch students", 500));
  }
};



const getAllSchoolCodes = async (req, res, next) => {
  try { 
    const schoolCodes = await User.find({schoolCode:{$exists:true}});
    console.log(schoolCodes);

    res.status(200).json({
      success: true,
      message: "School codes fetched successfully",
      schoolCodes,
    }); 
  } catch (error) {
    return next(new AppError("Failed to fetch school codes", 500));
  }
};

const updateFaceData = async (req, res, next) => {  
  try {
    console.log("UPDATE FACE DATA - Request Body:", req.body);
    const { userId, faceData } = req.body;
    console.log("User ID:", userId);
    console.log("Face Data:", faceData);
    
    const user = await User.findById(userId);
    console.log("Found User:", user ? user._id : "User not found");
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    
    console.log("Current verification status:", user.faceData.verificationStatus);
    // if(user.faceData.verificationStatus=="verified"){
    //   return next(new AppError("Face data already verified", 400));
    // }
    
    user.faceData.faceImages=[];
    console.log("Reset face images array");
    
    // Add each URL as an object with the required structure
    if (Array.isArray(faceData)) {
      console.log("Processing", faceData.length, "face images");
      for (const imageUrl of faceData) {
        user.faceData.faceImages.push({
          url: imageUrl,
        });
      }
    }
    
    user.faceData.verificationStatus="verified";
    console.log("Updated face images:", user.faceData.faceImages);
    console.log("New verification status:", user.faceData.verificationStatus);
    
    console.log("Saving user data...");
    await user.save({validateBeforeSave:false});
    console.log("User data saved successfully");
    
    res.status(200).json({
      success: true,
      message: "Face data updated successfully",
    });
  } catch (error) {
    console.error("ERROR in updateFaceData:", error);
    console.log("Error stack:", error.stack);
    return next(new AppError("Failed to update face data",error, 500));
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    console.log('Forgot Password Request:', req.body);
    const { email } = req.body;

    if (!email) {
      console.log('Email missing in request');
      return next(new AppError("Email is required", 400));
    }

    const user = await User.findOne({ email });
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Generate OTP
    const otp = await user.generatePasswordResetToken();
    console.log('Generated OTP:', otp);

    // Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>You have requested to reset your password. Please use the following OTP to proceed:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #2563eb; margin: 0; font-size: 32px;">${otp}</h1>
        </div>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    // Send email using the utility function
    try {
      await sendEmail(
        email,
        'Password Reset OTP',
        emailHtml
      );
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Reset the OTP if email fails
      user.forgotPasswordToken = null;
      user.forgotPasswordExpiry = null;
      await user.save();
      return next(new AppError("Failed to send OTP email. Please try again.", 500));
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to your email"
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return next(new AppError("Failed to process password reset request", 500));
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    console.log('Verify OTP Request:', req.body);
    const { email, otp } = req.body;

    if (!email || !otp) {
      console.log('Missing required fields:', { email: !!email, otp: !!otp });
      return next(new AppError("Email and OTP are required", 400));
    }

    const user = await User.findOne({ email });
    console.log('User found for OTP verification:', user ? 'Yes' : 'No');
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isValid = await user.verifyPasswordResetToken(otp);
    console.log('OTP Verification result:', isValid);

    if (!isValid) {
      return next(new AppError("Invalid or expired OTP", 400));
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully"
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    return next(new AppError("Failed to verify OTP", 500));
  }
};

const resetPassword = async (req, res, next) => {
  try {
    console.log('Reset Password Request:', req.body);
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      console.log('Missing required fields:', { 
        email: !!email, 
        otp: !!otp, 
        newPassword: !!newPassword 
      });
      return next(new AppError("All fields are required", 400));
    }

    const user = await User.findOne({ email });
    console.log('User found for password reset:', user ? 'Yes' : 'No');
    
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isValid = await user.verifyPasswordResetToken(otp);
    console.log('Final OTP verification result:', isValid);
    
    if (!isValid) {
      return next(new AppError("Invalid or expired OTP", 400));
    }

    console.log('Resetting password...');
    await user.resetPassword(newPassword);
    console.log('Password reset successful');

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return next(new AppError("Failed to reset password", 500));
  }
};

export {
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
};
