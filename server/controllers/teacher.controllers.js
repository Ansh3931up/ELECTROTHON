import User from "../models/user.model.js";
import AppError from "../utils/error.utils.js";

const registerUser = async (req, res, next) => {
  try {
    console.log("Received Data:", req.body); // Debugging

    const { fullname, email, password, role } = req.body;

    if (!fullname || !email || !password || !role) {
      return next(new AppError("All fields are required", 400));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("Email already exists", 400));
    }

    const user = await User.create({
      fullName: fullname,
      email,
      password,
      role,
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

    const user = await User.findOne({ email }).select("+password");

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

    // Set cookie options
    const cookieOptions = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    user.password = undefined;

    res.cookie("token", token, cookieOptions)
      .status(200)
      .json({
        success: true,
        message: "User logged in successfully",
        user
      });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

const logout = (req, res) => {
  res.cookie("token", null, {
    secure: process.env.NODE_ENV === "production" ? true : false,
    maxAge: 0,
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
};

const getProfile = async (req, res) => {
  try {
    const userId = req.params;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: "User Details",
      user,
    });
  } catch (error) {
    return (new AppError("Failed to fetch profile details"));
  }
};



const updateUser = async (req, res, next) => {
  const { fullName } = req.body;
  const {id}=req.params;
  // const { id } = req.user;

  const user = await User.findById(id);
  console.log(user,"da");
  if (!user) {
    return next(new AppError("User does not exist", 400));
  }
  console.log(user.fullName);
  if (user?.fullName) {
    user.fullName=fullName;
    // user?.fullName = fullName;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "User details updated successfully",
  });
};

export {
  registerUser,
  login,
  logout,
  getProfile,
  updateUser,
};
