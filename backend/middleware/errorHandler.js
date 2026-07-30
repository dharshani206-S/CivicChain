export const errorHandler = (err, req, res, next) => {
  // Log detailed stack trace locally for development debugging
  console.error("🚨 System Exception Caught:", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Check specific error types to customize codes
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Invalid payload input parameters." });
  }

  if (err.code === 11000) {
    return res.status(400).json({ message: "Duplicate record entry detected." });
  }

  // Generic production-safe response: prevents database details leakage
  res.status(err.status || 500).json({
    message: "A system error occurred. Please contact network administrator."
  });
};
