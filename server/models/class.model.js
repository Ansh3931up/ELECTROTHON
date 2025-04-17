import mongoose from 'mongoose';

// Sub-schema for a single student's record within a session
const studentAttendanceStatusSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true
    },
    recordedAt: { // When this specific status was last updated/recorded
        type: Date,
        default: Date.now
    },
    recordedBy: { // Who recorded this specific status
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { _id: false }); // No separate _id for this sub-sub-document

// Sub-schema for all attendance records for a specific date
const dailyAttendanceSchema = new mongoose.Schema({
    date: { // The specific date (normalized to midnight)
        type: Date,
        required: true,
        unique: false // Not unique on its own, needs class context
    },
    lecture: [studentAttendanceStatusSchema], // Attendance list for lecture
    lab: [studentAttendanceStatusSchema] // Attendance list for lab
}, { _id: true }); // Give daily records their own _id

const classSchema = new mongoose.Schema({
    className: {
        type: String,
        required: [true, "Class name is required"],
        minLength: [3, "Class name must be at least 3 characters"],
        maxLength: [50, "Class name must be less than 50 characters"],
        trim: true,
    },
    // <<< NEW: Add classType field >>>
    classType: {
        type: String,
        required: [true, "Class type is required"],
        enum: {
            values: ['lecture', 'lab'],
            message: 'Class type must be either "lecture" or "lab"'
        },
        default: 'lecture' // Optional: Default to lecture
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    studentList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    // Stores generated frequency temporarily
    frequency: [{
        type: Number,
    }],
    // Stores the scheduled time for the class
    time: {
        type: Date,
    },
    // <<< UPDATED: Use the new dailyAttendanceSchema >>>
    attendanceRecords: [dailyAttendanceSchema], // Array of daily attendance objects

    // <<< NEW: Add status field >>>
    status: {
        type: String,
        required: true,
        enum: {
            values: ['active', 'inactive', 'archived'], // Added 'archived' as another potential state
            message: 'Status must be either "active", "inactive", or "archived"'
        },
        default: 'active' // Default new classes to active
    }
}, { timestamps: true }); // timestamps adds createdAt and updatedAt for the Class itself

// Optional: Index on the embedded date for faster lookups if needed often
classSchema.index({ "attendanceRecords.date": 1 });
classSchema.index({ "attendanceRecords.studentId": 1 });

// Optional: Index status for filtering active/inactive classes
classSchema.index({ status: 1 });
classSchema.index({ teacherId: 1, status: 1 }); // Useful for fetching active classes for a teacher

const Class = mongoose.model("Class", classSchema);

export default Class;
