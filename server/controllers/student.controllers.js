// import Student from "../models/student.model.js";
// import AppError from "../utils/error.util.js";

// const registerStudent = async (req, res, next) => {
//   try {
//     const { fullname, email, password } = req.body;

//     if (!fullname || !email || !password) {
//       return next(new AppError("All fields are required", 400));
//     }

//     const studentExists = await Student.findOne({ email });
//     if (studentExists) {
//       return next(new AppError("Email already exists", 400));
//     }

//     const student = await Student.create({
//       fullName: fullname,
//       email,
//       password,
//     });

//     if (!student) {
//       return next(
//         new AppError("User Registration failed, please try again", 400)
//       );
//     }

//     await student.save();
//     student.password = undefined;

//     res.status(201).json({
//       status: true,
//       message: "User registered successfully",
//       student,
//     });
//   } catch (error) {
//     next(new AppError("Internal Server Error", 500));
//   }
// };

// const login = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return next(new AppError("All fields are required", 400));
//     }

//     const student = await Student.findOne({ email }).select("+password");

//     if (!(teacher && (await teacher.comparePassword(password)))) {
//       return next(new AppError("Email or password does not match", 400));
//     }

//     const token = await teacher.generateJWTToken();
//     user.password = undefined;

//     res.cookie("token", token, cookieOptions);
//     res.status(200).json({
//       success: true,
//       message: "User logged in successfully",
//       student,
//     });
//   } catch (error) {
//     return next(new AppError(error.message, 500));
//   }
// };

// const logout = (req, res) => {
//   res.cookie("token", null, {
//     secure: process.env.NODE_ENV === "production" ? true : false,
//     maxAge: 0,
//     httpOnly: true,
//   });

//   res.status(200).json({
//     success: true,
//     message: "User logged out successfully",
//   });
// };

// const getProfile = async (req, res) => {
//   try {
//     const studentId = req.student.id;
//     const student = await Student.findById(studentId);

//     res.status(200).json({
//       success: true,
//       message: "User Details",
//       student,
//     });
//   } catch (error) {
//     return next(new AppError("Failed to fetch profile details"));
//   }
// };

// const updateStudent = async (req, res, next) => {
//   const { fullName } = req.body;
//   const { id } = req.user;

//   const student = await Student.findById(id);

//   if (!student) {
//     return next(new AppError("User does not exist", 400));
//   }

//   if (req.fullName) {
//     student.fullName = fullName;
//   }

//   await student.save();

//   res.status(200).json({
//     success: true,
//     message: "User details updated successfully",
//   });
// };

// export { registerStudent, login, logout, getProfile, updateStudent};
