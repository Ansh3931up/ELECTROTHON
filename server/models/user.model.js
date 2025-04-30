import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      minLength: [5, "Full name must be atleast 5 characters long"],
      maxLength: [30, "Full name must not exceed more than 30 characters"],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be atleast 8 characters"],
      select: false,
      
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      minLength: [10, "Phone number must be atleast 10 digits"],
      maxLength: [10, "Phone number must not exceed more than 10 digits"],
    },
    schoolCode: {
      type: String,
      required: [true, "School/College code is required"],
      trim: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["teacher", "student"], // Allowed values
      required: true,
    },
    classId: [{
      type: Schema.Types.ObjectId,
      ref: "Class",
      default: [],
    }],
    embeddings:[
      {
        type: Array,
        default: [],
      }
    ],
    isFaceRegistered:{
      type: Boolean,
      default: false,
    },
    forgotPasswordToken: {
      type: String,
      default: null
    },
    forgotPasswordExpiry: {
      type: Date,
      default: null
    },
  },
  {
    timestamps: true,
  }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods = {
  generateJWTToken: async function () {
    return await jwt.sign(
      {
        id: this._id,
        email: this.email,
        subscription: this.subscription,
        role: this.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRY,
      }
    );
  },
  comparePassword: async function (plainTextPassword) {
    return await bcrypt.compare(plainTextPassword, this.password);
  },

  generatePasswordResetToken: async function () {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP and store it
    this.forgotPasswordToken = await bcrypt.hash(otp, 10);
    this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
    
    await this.save();
    return otp;
  },

  verifyPasswordResetToken: async function (otp) {
    if (!this.forgotPasswordToken || !this.forgotPasswordExpiry) {
      return false;
    }
    
    // Check if token has expired
    if (Date.now() > this.forgotPasswordExpiry) {
      return false;
    }
    
    // Verify the OTP
    return await bcrypt.compare(otp, this.forgotPasswordToken);
  },

  resetPassword: async function (newPassword) {
    this.password = newPassword;
    this.forgotPasswordToken = null;
    this.forgotPasswordExpiry = null;
    await this.save();
  }
};

const User = model("User", userSchema);

export default User;
