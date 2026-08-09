import express from "express";
import Issue from "../models/Issue.js";
import upload from "../middleware/upload.js";
import { requireAuth, optionalAuth, authorizeRoles } from "../middleware/auth.js";
import { isWithinPuducherryUT } from "../utils/puducherryGeo.js";

const router = express.Router();

// =======================
// CREATE ISSUE
// =======================
router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const { title, description, location, latitude, longitude, department, severity, category } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return res.status(400).json({ message: "Title must be at least 5 characters long." });
    }

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return res.status(400).json({ message: "Description must be at least 10 characters long." });
    }

    if (!location || typeof location !== "string" || location.trim().length < 3) {
      return res.status(400).json({ message: "Location area description is required." });
    }

    // Puducherry UT Backend Geographic Boundary Validation
    if (latitude && longitude) {
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);

      if (!isNaN(latNum) && !isNaN(lngNum) && (latNum !== 0 || lngNum !== 0)) {
        if (!isWithinPuducherryUT(latNum, lngNum)) {
          return res.status(400).json({
            message: "CivicChain currently supports issue reporting only within Pondicherry/Puducherry."
          });
        }
      }
    }

    const validSeverities = ["Low", "Medium", "High", "Critical"];
    const assignedSeverity = validSeverities.includes(severity) ? severity : "Medium";

    const latNum = latitude ? parseFloat(latitude) : null;
    const lngNum = longitude ? parseFloat(longitude) : null;
    const hasValidCoords = latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum) && (latNum !== 0 || lngNum !== 0);

    const newIssue = new Issue({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      latitude: latitude ? latitude.trim() : null,
      longitude: longitude ? longitude.trim() : null,
      locationPoint: hasValidCoords ? { type: "Point", coordinates: [lngNum, latNum] } : undefined,
      department: department ? department.trim() : "General",
      severity: assignedSeverity,
      category: category ? category.trim() : (department ? department.trim() : "General"),
      image: req.file ? req.file.path : null,
      reporter: req.user.id
    });

    const savedIssue = await newIssue.save();
    res.status(201).json(savedIssue);
  } catch (error) {
    next(error);
  }
});

// =======================
// CITIZEN DASHBOARD ANALYTICS (Authenticated)
// =======================
router.get("/analytics/citizen", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const citizenIssues = await Issue.find({ reporter: userId }).sort({ createdAt: -1 });

    const total = citizenIssues.length;
    const pending = citizenIssues.filter((i) => i.status === "pending").length;
    const inProgress = citizenIssues.filter((i) => i.status === "in-progress" || i.status === "progress").length;
    const resolved = citizenIssues.filter((i) => i.status === "resolved").length;
    const critical = citizenIssues.filter((i) => i.status === "critical" || i.votes >= 50 || i.severity === "Critical").length;
    const totalVotes = citizenIssues.reduce((sum, i) => sum + (i.votes || 0), 0);
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    res.json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        resolved,
        critical,
        totalVotes,
        resolutionRate,
      },
      distribution: {
        pending,
        inProgress,
        resolved,
        critical,
      },
      recentReports: citizenIssues.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

// =======================
// AUTHORITY DASHBOARD ANALYTICS (Department Isolation Enforced)
// =======================
router.get("/analytics/authority", requireAuth, authorizeRoles("authority", "admin"), async (req, res, next) => {
  try {
    const department = req.user.department;
    const query = req.user.role === "admin" ? {} : { department };

    const deptIssues = await Issue.find(query).sort({ createdAt: -1 });

    const total = deptIssues.length;
    const pending = deptIssues.filter((i) => i.status === "pending").length;
    const inProgress = deptIssues.filter((i) => i.status === "in-progress" || i.status === "progress").length;
    const resolved = deptIssues.filter((i) => i.status === "resolved").length;
    const critical = deptIssues.filter((i) => i.status === "critical" || i.votes >= 50 || i.severity === "Critical").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Most reported category & most upvoted complaint
    const categoryCounts = {};
    let mostUpvoted = null;
    let maxVotes = -1;

    deptIssues.forEach((i) => {
      const cat = i.department || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if ((i.votes || 0) > maxVotes) {
        maxVotes = i.votes || 0;
        mostUpvoted = i;
      }
    });

    let mostReportedCategory = department || "General";
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([cat, cnt]) => {
      if (cnt > maxCatCount) {
        maxCatCount = cnt;
        mostReportedCategory = cat;
      }
    });

    // Severity counts
    const severityCounts = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };

    deptIssues.forEach((i) => {
      const sev = i.severity || (i.votes >= 50 ? "Critical" : i.votes >= 20 ? "High" : "Medium");
      if (severityCounts[sev] !== undefined) {
        severityCounts[sev] += 1;
      } else {
        severityCounts["Medium"] += 1;
      }
    });

    // Issues over time (grouped by date)
    const timelineCounts = {};
    deptIssues.forEach((i) => {
      const dateStr = new Date(i.createdAt).toISOString().split("T")[0];
      timelineCounts[dateStr] = (timelineCounts[dateStr] || 0) + 1;
    });

    res.json({
      success: true,
      department: department || "Global Administration",
      stats: {
        total,
        pending,
        inProgress,
        resolved,
        critical,
        resolutionRate,
        mostReportedCategory,
        mostUpvotedTitle: mostUpvoted ? mostUpvoted.title : "None",
        mostUpvotedVotes: maxVotes > -1 ? maxVotes : 0,
      },
      charts: {
        byStatus: { pending, inProgress, resolved, critical },
        bySeverity: severityCounts,
        byCategory: categoryCounts,
        overTime: timelineCounts,
      },
      recentComplaints: deptIssues.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

// =======================
// GET LOGGED-IN CITIZEN'S OWN ISSUES ONLY
// =======================
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(400).json({ message: "User identity missing from session." });
    }

    const issues = await Issue.find({ reporter: userId })
      .populate("reporter", "name role")
      .sort({ createdAt: -1 });

    res.json({
      total: issues.length,
      issues,
    });
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
const updateStatusHandler = async (req, res, next) => {
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
};

router.put("/:id/status", requireAuth, authorizeRoles("authority", "admin"), updateStatusHandler);
router.patch("/:id/status", requireAuth, authorizeRoles("authority", "admin"), updateStatusHandler);

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