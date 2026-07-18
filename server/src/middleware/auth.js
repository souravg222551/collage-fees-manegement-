const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');

// Verifies the JWT (from cookie or Authorization header) and attaches
// the authenticated admin to req.admin
const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies[process.env.COOKIE_NAME || 'cfm_token']) {
    token = req.cookies[process.env.COOKIE_NAME || 'cfm_token'];
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authenticated. Please log in.');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });

  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Account not found or has been deactivated.');
  }

  req.admin = admin;
  next();
});

// Restricts access to specific admin roles
const authorize = (...roles) => (req, res, next) => {
  if (!req.admin || !roles.includes(req.admin.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  next();
};

module.exports = { protect, authorize };
