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
  locationPoint: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    }
  },
  department: {
    type: String,
    default: "General"
  },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium"
  },
  category: {
    type: String,
    default: null
  },
  aiAnalysis: {
    isCivicIssue: { type: Boolean, default: true },
    confidence: { type: Number, default: 0.85 },
    reason: { type: String, default: null },
    suggestedAction: { type: String, default: null }
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
issueSchema.index({ locationPoint: "2dsphere" });

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;