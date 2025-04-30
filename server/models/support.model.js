import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minLength: [2, "Name must be at least 2 characters"],
    maxLength: [50, "Name must be less than 50 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    trim: true,
    minLength: [10, "Message must be at least 10 characters"],
    maxLength: [1000, "Message must be less than 1000 characters"]
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  response: {
    type: String,
    trim: true
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  respondedAt: {
    type: Date
  }
}, { timestamps: true });

// Create indexes for efficient querying
supportMessageSchema.index({ status: 1, createdAt: -1 });
supportMessageSchema.index({ email: 1 });

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);

export default SupportMessage; 