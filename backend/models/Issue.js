import mongoose from "mongoose";

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: String,
    default: null
  },
  longitude: {
    type: String,
    default: null
  },
  department: {
    type: String,
    default: "General"
  },
  image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "resolved", "critical"],
    default: "pending"
  },
  votes: {
    type: Number,
    default: 0
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  votedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ==========================================
// MONGODB INDEXES (Performance Optimizations)
// ==========================================
issueSchema.index({ department: 1, status: 1 });
issueSchema.index({ votes: -1 });
issueSchema.index({ createdAt: -1 });

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;