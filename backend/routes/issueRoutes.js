import express from "express";
import Issue from "../models/Issue.js";
import multer from "multer";
import path from "path";
import { requireAuth, optionalAuth, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// =======================
// SECURE UPLOAD CONFIGURATION
// =======================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error("Security violation. Only JPEG, PNG, and WEBP image uploads are permitted."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// =======================
// CREATE ISSUE
// =======================
router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const { title, description, location, latitude, longitude, department } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return res.status(400).json({ message: "Title must be at least 5 characters long." });
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters long." });
    }

    if (!location || typeof location !== "string" || location.trim().length < 3) {
      return res.status(400).json({ message: "Location area description is required." });
    }

    const newIssue = new Issue({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      latitude: latitude ? latitude.trim() : null,
      longitude: longitude ? longitude.trim() : null,
      department: department ? department.trim() : "General",
      image: req.file ? req.file.filename : null,
      reporter: req.user.id
    });

    const savedIssue = await newIssue.save();
    res.status(201).json(savedIssue);
  } catch (error) {
    next(error);
  }
});

// =======================
// GET ALL ISSUES (Public or filtered for Authority role)
// =======================
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const query = {};

    // Enforce department access restrictions for officers (authorities)
    if (req.user && req.user.role === "authority") {
      query.department = req.user.department;
    }

    const issues = await Issue.find(query)
      .populate("reporter", "name role")
      .sort({ votes: -1 });

    res.json({
      total: issues.length,
      issues,
    });
  } catch (error) {
    next(error);
  }
});

// =======================
// GET SINGLE ISSUE (Public or filtered for Authority role)
// =======================
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate("reporter", "name role");

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Enforce department access restrictions for officers (authorities)
    if (req.user && req.user.role === "authority" && issue.department !== req.user.department) {
      return res.status(403).json({
        message: "Access denied. You can only inspect issues belonging to your department."
      });
    }

    res.json(issue);
  } catch (error) {
    next(error);
  }
});

// =======================
// UPDATE ISSUE STATUS (Authority matches department / Admin has global bypass)
// =======================
router.put("/:id/status", requireAuth, authorizeRoles("authority", "admin"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "in-progress", "resolved", "critical"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status pipeline code value." });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    // Enforce department write restrictions for officers (authorities)
    if (req.user.role === "authority" && issue.department !== req.user.department) {
      return res.status(403).json({
        message: "Access denied. You can only manage issues belonging to your department."
      });
    }

    issue.status = status;
    const updatedIssue = await issue.save();
    res.json(updatedIssue);
  } catch (error) {
    next(error);
  }
});

// =======================
// DELETE ISSUE
// =======================
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    const isOwner = issue.reporter && issue.reporter.toString() === req.user.id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Access denied. Only the complaint owner may delete this ticket."
      });
    }

    await Issue.findByIdAndDelete(req.params.id);
    res.json({ message: "Issue deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// =======================
// UPVOTE ISSUE
// =======================
router.put("/:id/vote", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    const hasVoted = issue.votedBy.some((id) => id.toString() === userId.toString());

    if (hasVoted) {
      issue.votedBy = issue.votedBy.filter((id) => id.toString() !== userId.toString());
      issue.votes = Math.max(0, issue.votes - 1);
    } else {
      issue.votedBy.push(userId);
      issue.votes += 1;
    }

    await issue.save();
    res.json(issue);
  } catch (error) {
    next(error);
  }
});

export default router;