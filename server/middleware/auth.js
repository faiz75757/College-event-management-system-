const jwt = require("jsonwebtoken");

// Checks that the request carries a valid login token
exports.protect = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please log in first." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
};

// Allows only one role, e.g. only("admin")
exports.only = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ message: "You are not allowed to do this." });
  }
  next();
};
