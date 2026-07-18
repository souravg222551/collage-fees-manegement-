const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const generateToken = require('../utils/generateToken');

// @desc    Authenticate admin & set JWT cookie
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });

  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = generateToken(res, admin.id);

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  });

  const { password: _pw, ...safeAdmin } = admin;

  res.status(200).json(
    new ApiResponse(200, { admin: safeAdmin, token }, 'Login successful')
  );
});

// @desc    Log out admin (clear cookie)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || 'cfm_token');
  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

// @desc    Get currently authenticated admin
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const { password: _pw, ...safeAdmin } = req.admin;
  res.status(200).json(new ApiResponse(200, safeAdmin));
});

// @desc    Change own password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
  const isMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { password: hashed } });

  res.status(200).json(new ApiResponse(200, null, 'Password updated successfully'));
});

// @desc    Update own profile (name / avatar)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const avatarUrl = req.file ? `/uploads/logos/${req.file.filename}` : undefined;

  const updated = await prisma.admin.update({
    where: { id: req.admin.id },
    data: { ...(name && { name }), ...(avatarUrl && { avatarUrl }) },
  });

  const { password: _pw, ...safeAdmin } = updated;
  res.status(200).json(new ApiResponse(200, safeAdmin, 'Profile updated'));
});

module.exports = { login, logout, getMe, changePassword, updateProfile };
