import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. Token malformed." });
    }

    const jwtSecret = process.env.JWT_SECRET || "secretkey";
    const decoded = jwt.verify(token, jwtSecret);
    
    // Attach decoded user payload to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      department: decoded.department
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }
    return res.status(401).json({ message: "Invalid authorization token." });
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const jwtSecret = process.env.JWT_SECRET || "secretkey";
        const decoded = jwt.verify(token, jwtSecret);
        
        req.user = {
          id: decoded.id,
          role: decoded.role,
          department: decoded.department
        };
      }
    }
    next();
  } catch (error) {
    // If verification fails, proceed as unauthenticated user
    next();
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
};
