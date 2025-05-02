import mongoose from 'mongoose';

// --- NEW: Sub-schema for individual schedule entries ---
const scheduleEntrySchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], // Enforce valid days
    },
    timing: [{ // Array of time strings (e.g., "4:00 PM", "16:00")
        type: String,
        required: true,
        trim: true,
    }]
}, { _id: false }); // No separate _id for schedule entries

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
    lecture: {
        records: [studentAttendanceStatusSchema], // Attendance list for lecture
        active: {
            type: String,
            enum: ['initial', 'active', 'completed'],
            default: 'initial'
        }
    },
    lab: {
        records: [studentAttendanceStatusSchema], // Attendance list for lab
        active: {
            type: String,
            enum: ['initial', 'active', 'completed'],
            default: 'initial'
        }
    }
}, { _id: true }); // Give daily records their own _id


const classSchema = new mongoose.Schema({
    className: {
        type: String,
        required: [true, "Class name is required"],
        minLength: [3, "Class name must be at least 3 characters"],
        maxLength: [50, "Class name must be less than 50 characters"],
        trim: true,
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Teacher ID is required"],
    },
    classPasscode: {
        type: String,
        required: [true, "Class passcode is required"],
        minLength: [6, "Class passcode must be at least 6 characters"],
        maxLength: [10, "Class passcode must be less than 10 characters"],
        unique: true,
        trim: true,
        uppercase: true,
    },
    studentList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [], // Make it optional with empty default
    }],
    frequency: [{
        type: Number,
    }],
    attendanceRecords: [dailyAttendanceSchema],

    // --- UPDATED: Schedule field ---
    schedule: {
        type: [scheduleEntrySchema], // Use the sub-schema
        required: [true, "Schedule information is required"],
        validate: [v => Array.isArray(v) && v.length > 0, 'Schedule must contain at least one entry'] // Ensure schedule is not empty
    },
    // --- REMOVED: Old schedule field (if it existed) ---
    // schedule: { type: String, ... },

    classCode: {
        type: String,
        required: [true, "Class code is required"],
        unique: true,
        trim: true,
        uppercase: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "Creator user ID is required"],
    },
    batch: {
        type: String,
        required: [true, "Batch information is required"],
        trim: true,
        match: [/^\d{4}$/, 'Batch must be a valid 4-digit year'] // Added backend regex validation
    },
    // --- NEW: Status field ---
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    },
    
}, { timestamps: true });

classSchema.index({ classCode: 1 });
classSchema.index({ teacherId: 1 });
classSchema.index({ "attendanceRecords.date": 1 });
classSchema.index({ status: 1 });
// Optional: Index schedule day if needed for querying
// classSchema.index({ "schedule.day": 1 });

const Class = mongoose.model("Class", classSchema);

export default Class;
