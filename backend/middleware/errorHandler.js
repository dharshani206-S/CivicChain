export const errorHandler = (err, req, res, next) => {
  // Log detailed stack trace locally for development debugging
  console.error("🚨 System Exception Caught:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Customized error handlers
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message || "Invalid payload input parameters." });
  }

  if (err.code === 11000) {
    return res.status(400).json({ message: "Duplicate record entry detected." });
  }

  if (err.name === "MulterError" || err.message?.includes("Only JPEG, PNG")) {
    return res.status(400).json({ message: err.message || "File upload error." });
  }

  // Development explicit error response fallback
  if (process.env.NODE_ENV !== "production") {
    return res.status(err.status || 500).json({
      message: err.message || "A system error occurred. Please contact network administrator."
    });
  }

  // Generic production-safe response: prevents database details leakage
  res.status(err.status || 500).json({
    message: "A system error occurred. Please contact network administrator."
  });
};
