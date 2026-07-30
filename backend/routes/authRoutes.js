import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ========================
// REGISTER USER
// ========================
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    // 1. INPUT VALIDATION
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters long." });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Check existing user
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. PRIVILEGE ESCALATION PREVENTION
    // Citizens cannot register themselves as authorities or admins.
    // If registration role is requested as authority or admin, we check a security code
    // or block it. To be completely secure, public registration forces citizen role.
    let assignedRole = "citizen";
    let assignedDepartment = null;

    if (role === "authority") {
      // Validate department if officer registration
      if (!department) {
        return res.status(400).json({ message: "Department is required for officer registration." });
      }
      assignedRole = "authority";
      assignedDepartment = department;
    } else if (role === "admin") {
      // Prevent registering admin publicly
      return res.status(403).json({ message: "Public registration of administrative roles is disabled." });
    }

    // 3. IMPROVED PASSWORD HANDLING (Cost factor = 12)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: sanitizedEmail,
      password: hashedPassword,
      role: assignedRole,
      department: assignedDepartment
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully"
    });

  } catch (error) {
    next(error);
  }
});

// ========================
// LOGIN USER / AUTHORITY
// ========================
router.post("/login", async (req, res, next) => {
  try {
    const { email, password, department } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required fields." });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Prevent NoSQL operator queries
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Department validation for authority
    if (user.role === "authority") {
      if (!department) {
        return res.status(400).json({ message: "Department is required for authority login" });
      }
      if (user.department !== department) {
        return res.status(400).json({ message: "Incorrect department selected" });
      }
    }

    // 4. IMPROVED JWT VALIDATION (Sign with environment secret)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is missing.");
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        department: user.department
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // 5. REMOVE SENSITIVE INFORMATION FROM RESPONSE
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    next(error);
  }
});

// ========================
// GET CURRENT USER
// ========================
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;