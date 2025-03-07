// import { Schema, model } from "mongoose";
// import { type } from "os";

// const studentSchema = new Schema(
//   {
//     fullName: {
//       type: String,
//       required: true,
//       minLength: [5, "Full name must be atleast 5 characters long"],
//       maxLength: [30, "Full name must not exceed more than 30 characters"],
//       lowercase: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: [
//         /^((?!\.)[\w-_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$/,
//         "Please fill a valid email address",
//       ],
//     },
//     password: {
//       type: String,
//       required: [true, "Password is required"],
//       minLength: [8, "Password must be atleast 8 characters"],
//       select: false,
//       match: [
//         /^(?=.*?[0-9])(?=.*?[A-Za-z]).{8,32}$/,
//         "Please fill a valid email address",
//       ],
//     },
//     classId: {
//       type: Schema.Types.ObjectId,
//       ref: "Class",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const Student = model("Student", studentSchema);

// export default Student;
